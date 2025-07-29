import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a mock client if environment variables are missing
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === '' || supabaseAnonKey === '') {
    console.warn('Supabase environment variables not found, using mock client');
    return null;
  }
  
  // Validate URL format before creating client
  try {
    new URL(supabaseUrl);
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn('Invalid Supabase URL format, using mock client');
    return null;
  }
};

export const supabase = createSupabaseClient();

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
