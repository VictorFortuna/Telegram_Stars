import type { DatabaseAdapter } from './database-adapter';
import type { Game, GamePlayer } from './supabase';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export class GameManager {
  private adapter: DatabaseAdapter;

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  // Create a new game
  async createGame(maxPlayers: number = 10, entryFee: number = 1): Promise<string> {
    return await this.adapter.createGame(maxPlayers, entryFee);
  }

  // Join a game
  async joinGame(gameId: string, user: TelegramUser): Promise<boolean> {
    return await this.adapter.joinGame(gameId, user);
  }

  // Select winner and distribute prizes (simplified for demo)
  async selectWinner(gameId: string): Promise<void> {
    // This would need to be implemented in the adapter
    // For now, just a placeholder
    console.log('Winner selection for game:', gameId);
  }

  // Get current active game
  async getCurrentGame(): Promise<Game | null> {
    try {
      return await this.adapter.getCurrentGame();
    } catch (error) {
      console.warn('Failed to get current game:', error);
      return null;
    }
  }

  // Get game players
  async getGamePlayers(gameId: string): Promise<GamePlayer[]> {
    try {
      return await this.adapter.getGamePlayers(gameId);
    } catch (error) {
      console.warn('Failed to get game players:', error);
      return [];
    }
  }

  // Subscribe to game updates
  subscribeToGameUpdates(gameId: string, callback: () => void): () => void {
    return this.adapter.subscribeToGameUpdates(gameId, callback);
  }
}
