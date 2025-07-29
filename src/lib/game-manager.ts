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
    if (!supabase) {
      // Return mock game ID for demo mode
      return 'demo-game-' + Date.now();
    }
    
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
  async joinGame(gameId: string, user: TelegramUser): Promise<boolean> {
    if (!supabase) {
      // Demo mode - just return success
      return true;
    }

    try {
    // Check if game exists and has space
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .eq('status', 'waiting')
      .single();

      if (gameError) {
        // Check if it's a table not found error
        if (gameError.code === '42P01' || gameError.message?.includes('does not exist')) {
          console.warn('Database table does not exist, using demo mode');
          return true;
        }
        throw new Error('Game not found or not accepting players');
      }

      if (!game) {
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
      .single();

    if (existingPlayer) {
      throw new Error('Already joined this game');
    }

    // Add player to game
    const { error: playerError } = await supabase
      .from('game_players')
      .insert({
        game_id: gameId,
        telegram_user_id: user.id.toString(),
        telegram_username: user.username || '',
        telegram_first_name: user.first_name,
        payment_status: 'completed'
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

    // If game is full, select winner
    if (newPlayerCount >= game.max_players) {
      setTimeout(() => this.selectWinner(gameId), 2000);
    }

    return true;
    } catch (error) {
      if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('42P01'))) {
        console.warn('Database table does not exist, using demo mode');
        return true;
      }
      throw error;
    }
  }

  // Select winner and distribute prizes
  async selectWinner(gameId: string): Promise<void> {
    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('game_players')
      .select('*')
      .eq('game_id', gameId);

    if (playersError || !players || players.length === 0) {
      throw new Error('No players found for game');
    }

    // Select random winner
    const randomIndex = Math.floor(Math.random() * players.length);
    const winner = players[randomIndex];

    // Get game details
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      throw new Error('Game not found');
    }

    // Calculate prizes
    const winnerPrize = Math.floor(game.prize_pool * 0.7);
    const organizerFee = game.prize_pool - winnerPrize;

    // Update game with winner
    await supabase
      .from('games')
      .update({
        status: 'completed',
        winner_id: winner.telegram_user_id,
        completed_at: new Date().toISOString()
      })
      .eq('id', gameId);

    // Update winner's balance
    await supabase.rpc('add_user_stars', {
      user_id: winner.telegram_user_id,
      stars_to_add: winnerPrize
    });

    // Update winner's stats
    await supabase
      .from('user_balances')
      .update({
        total_won: supabase.sql`total_won + ${winnerPrize}`,
        games_won: supabase.sql`games_won + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_user_id', winner.telegram_user_id);
  }

  // Get current active game
  async getCurrentGame(): Promise<Game | null> {
    if (!supabase) {
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // Check if it's a table not found error
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Database table does not exist, using demo mode');
          return null;
        }
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Database table does not exist, using demo mode');
      return null;
    }
  }

  // Get game players
  async getGamePlayers(gameId: string): Promise<GamePlayer[]> {
    if (!supabase) {
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .order('joined_at', { ascending: true });

      if (error) {
        // Check if it's a table not found error
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Database table does not exist, using demo mode');
          return [];
        }
        throw new Error(`Failed to get players: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.warn('Database table does not exist, using demo mode');
      return [];
    }
  }
}
