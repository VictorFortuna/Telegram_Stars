// Database adapter that isolates Supabase imports
export interface DatabaseAdapter {
  createGame(maxPlayers: number, entryFee: number): Promise<string>;
  joinGame(gameId: string, user: any): Promise<boolean>;
  getCurrentGame(): Promise<any>;
  getGamePlayers(gameId: string): Promise<any[]>;
  getUserBalance(userId: number): Promise<number>;
  subscribeToGameUpdates(gameId: string, callback: () => void): () => void;
}

// Demo implementation
class DemoAdapter implements DatabaseAdapter {
  private games = new Map<string, any>();
  private players = new Map<string, any[]>();

  async createGame(maxPlayers: number, entryFee: number): Promise<string> {
    const gameId = 'demo-game-' + Date.now();
    this.games.set(gameId, {
      id: gameId,
      status: 'waiting',
      max_players: maxPlayers,
      entry_fee: entryFee,
      prize_pool: 0,
      created_at: new Date().toISOString()
    });
    this.players.set(gameId, []);
    return gameId;
  }

  async joinGame(gameId: string, user: any): Promise<boolean> {
    const players = this.players.get(gameId) || [];
    const game = this.games.get(gameId);
    
    if (!game || players.length >= game.max_players) {
      throw new Error('Game full or not found');
    }

    const newPlayer = {
      id: `player-${user.id}`,
      game_id: gameId,
      telegram_user_id: user.id.toString(),
      telegram_username: user.username || '',
      telegram_first_name: user.first_name,
      joined_at: new Date().toISOString(),
      payment_status: 'completed'
    };

    players.push(newPlayer);
    this.players.set(gameId, players);
    
    game.prize_pool += game.entry_fee;
    if (players.length >= game.max_players) {
      game.status = 'full';
    }
    
    return true;
  }

  async getCurrentGame(): Promise<any> {
    for (const [id, game] of this.games.entries()) {
      if (game.status === 'waiting') {
        return game;
      }
    }
    return null;
  }

  async getGamePlayers(gameId: string): Promise<any[]> {
    return this.players.get(gameId) || [];
  }

  async getUserBalance(userId: number): Promise<number> {
    return 10; // Demo balance
  }

  subscribeToGameUpdates(gameId: string, callback: () => void): () => void {
    // Demo: no real-time updates
    return () => {};
  }
}

// Supabase implementation (loaded dynamically)
class SupabaseAdapter implements DatabaseAdapter {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async createGame(maxPlayers: number, entryFee: number): Promise<string> {
    const { data, error } = await this.supabase
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

  async joinGame(gameId: string, user: any): Promise<boolean> {
    // Check if game exists and has space
    const { data: game, error: gameError } = await this.supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .eq('status', 'waiting')
      .single();

    if (gameError || !game) {
      throw new Error('Game not found or not accepting players');
    }

    // Check current player count
    const { count } = await this.supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);

    if (count && count >= game.max_players) {
      throw new Error('Game is full');
    }

    // Check if user already joined
    const { data: existingPlayer } = await this.supabase
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('telegram_user_id', user.id.toString())
      .single();

    if (existingPlayer) {
      throw new Error('Already joined this game');
    }

    // Add player to game
    const { error: playerError } = await this.supabase
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

    await this.supabase
      .from('games')
      .update({ 
        prize_pool: newPrizePool,
        status: newPlayerCount >= game.max_players ? 'full' : 'waiting'
      })
      .eq('id', gameId);

    return true;
  }

  async getCurrentGame(): Promise<any> {
    const { data, error } = await this.supabase
      .from('games')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        throw new Error('TABLE_NOT_EXISTS');
      }
      return null;
    }

    return data;
  }

  async getGamePlayers(gameId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('game_players')
      .select('*')
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        throw new Error('TABLE_NOT_EXISTS');
      }
      throw new Error(`Failed to get players: ${error.message}`);
    }

    return data || [];
  }

  async getUserBalance(userId: number): Promise<number> {
    const { data, error } = await this.supabase
      .from('user_balances')
      .select('stars_balance')
      .eq('telegram_user_id', userId.toString())
      .maybeSingle();

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        throw new Error('TABLE_NOT_EXISTS');
      }
      return 0; // New user, no balance
    }

    return data?.stars_balance || 0;
  }

  subscribeToGameUpdates(gameId: string, callback: () => void): () => void {
    const channel = this.supabase
      .channel('game-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${gameId}`
      }, callback)
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }
}

// Factory function to create the appropriate adapter
export async function createDatabaseAdapter(): Promise<DatabaseAdapter> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  // Check if Supabase environment variables are available
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === '' || supabaseAnonKey === '') {
    console.warn('Supabase environment variables not found, using demo mode');
    return new DemoAdapter();
  }

  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch (error) {
    console.warn('Invalid Supabase URL format, using demo mode');
    return new DemoAdapter();
  }

  // Try to dynamically import and initialize Supabase
  try {
    // Load Supabase from CDN to avoid build-time dependency
    const supabaseModule = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    const { createClient } = supabaseModule;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test the connection by trying to get current game
    const adapter = new SupabaseAdapter(supabase);
    try {
      await adapter.getCurrentGame();
      console.log('Using Supabase database mode');
      return adapter;
    } catch (error) {
      if (error instanceof Error && error.message === 'TABLE_NOT_EXISTS') {
        console.warn('Database tables do not exist, using demo mode');
        return new DemoAdapter();
      }
      throw error;
    }
  } catch (error) {
    console.warn('Failed to initialize Supabase, using demo mode:', error);
    return new DemoAdapter();
  }
}
