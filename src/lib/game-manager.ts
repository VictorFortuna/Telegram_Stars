import { supabase } from './supabase';
import type { Game, GamePlayer } from './supabase';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export class GameManager {
  // Create a new game
  async createGame(maxPlayers: number = 10, entryFee: number = 1): Promise<string> {
    const { data, error } = await supabase
      .from('games')
      .insert({
        status: 'waiting',
        max_players: maxPlayers,
        entry_fee: entryFee,
        prize_pool: 0
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create game: ${error.message}`);
    }

    return data.id;
  }

  // Join a game
  async joinGame(gameId: string, user: TelegramUser, paymentManager: any): Promise<boolean> {
    // Check if game exists and has space
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .eq('status', 'waiting')
      .single();

    if (gameError || !game) {
      throw new Error('Game not found or not accepting players');
    }

    // Check current player count
    const { count } = await supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);

    if (count && count >= game.max_players) {
      throw new Error('Game is full');
    }

    // Check if user already joined
    const { data: existingPlayer } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('telegram_user_id', user.id.toString())
      .maybeSingle();

    if (existingPlayer) {
      throw new Error('Already joined this game');
    }

    // Request star payment from user
    const paymentResult = await paymentManager.requestStarPayment(
      user.id,
      game.entry_fee,
      `Join lottery game - Entry fee: ${game.entry_fee} star${game.entry_fee > 1 ? 's' : ''}`
    );

    if (!paymentResult.success) {
      throw new Error(`Payment failed: ${paymentResult.error}`);
    }

    // Add player to game
    const { error: playerError } = await supabase
      .from('game_players')
      .insert({
        game_id: gameId,
        telegram_user_id: user.id.toString(),
        telegram_username: user.username || '',
        telegram_first_name: user.first_name,
        payment_status: 'completed',
        transaction_id: paymentResult.transaction_id
      });

    if (playerError) {
      throw new Error(`Failed to join game: ${playerError.message}`);
    }

    // Update prize pool
    const newPrizePool = game.prize_pool + game.entry_fee;
    const newPlayerCount = (count || 0) + 1;

    await supabase
      .from('games')
      .update({ 
        prize_pool: newPrizePool,
        status: newPlayerCount >= game.max_players ? 'full' : 'waiting'
      })
      .eq('id', gameId);

    return true;
  }

  // Get current active game
  async getCurrentGame(): Promise<Game | null> {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get current game: ${error.message}`);
    }

    return data;
  }

  // Get game players
  async getGamePlayers(gameId: string): Promise<GamePlayer[]> {
    const { data, error } = await supabase
      .from('game_players')
      .select('*')
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get players: ${error.message}`);
    }

    return data || [];
  }

  // Subscribe to game updates
  subscribeToGameUpdates(gameId: string, callback: () => void): () => void {
    const channel = supabase
      .channel('game-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${gameId}`
      }, callback)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Select winner and complete game
  async selectWinner(gameId: string, paymentManager: any): Promise<GamePlayer> {
    const players = await this.getGamePlayers(gameId);
    if (players.length === 0) {
      throw new Error('No players in game');
    }

    // Get game details for prize calculation
    const { data: game } = await supabase
      .from('games')
      .select('prize_pool')
      .eq('id', gameId)
      .single();

    if (!game) {
      throw new Error('Game not found');
    }

    // Select random winner
    const winner = players[Math.floor(Math.random() * players.length)];
    
    // Calculate winnings (70% of prize pool)
    const winnings = Math.floor(game.prize_pool * 0.7);

    // Transfer stars to winner
    if (winnings > 0) {
      await paymentManager.transferStarsToWinner(
        parseInt(winner.telegram_user_id),
        winnings
      );
    }

    // Update game status
    await supabase
      .from('games')
      .update({
        status: 'completed',
        winner_id: winner.telegram_user_id,
        completed_at: new Date().toISOString()
      })
      .eq('id', gameId);

    return winner;
  }
}
