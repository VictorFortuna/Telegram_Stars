// Conditional Supabase client creation
let supabase: any = null;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only import and create Supabase client if environment variables are available
const initializeSupabase = async () => {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === '' || supabaseAnonKey === '') {
    console.warn('Supabase environment variables not found, using demo mode');
    return null;
  }
  
  // Validate URL format before importing Supabase
  try {
    new URL(supabaseUrl);
    
    // Dynamic import to avoid build issues when not needed
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn('Invalid Supabase URL format or import failed, using demo mode');
    return null;
  }
};

// Initialize supabase client
initializeSupabase().then(client => {
  supabase = client;
}).catch(() => {
  console.warn('Failed to initialize Supabase, using demo mode');
  supabase = null;
});

export { supabase };

// Database types
export interface Game {
  id: string;
  status: 'waiting' | 'full' | 'completed';
  max_players: number;
  entry_fee: number;
  prize_pool: number;
  winner_id?: string;
  created_at: string;
  completed_at?: string;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  telegram_user_id: string;
  telegram_username: string;
  telegram_first_name: string;
  joined_at: string;
  payment_status: 'pending' | 'completed' | 'failed';
  transaction_id?: string;
}

export interface UserBalance {
  telegram_user_id: string;
  stars_balance: number;
  total_spent: number;
  total_won: number;
  games_played: number;
  games_won: number;
  updated_at: string;
}
