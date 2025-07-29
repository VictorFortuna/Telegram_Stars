import React, { useState, useEffect } from 'react';
import { Star, Users, Trophy, Play } from 'lucide-react';
import { supabase } from './lib/supabase';
import { GameManager } from './lib/game-manager';
import { TelegramPayments } from './lib/telegram-payments';
import type { Game, GamePlayer } from './lib/supabase';

interface GameState {
  players: GamePlayer[];
  prizePool: number;
  maxPlayers: number;
  gameActive: boolean;
  winner: GamePlayer | null;
  userStars: number;
  hasJoined: boolean;
  currentGameId: string | null;
  loading: boolean;
}

// Telegram Web App Mock (for development)
const mockTelegram = {
  WebApp: {
    ready: () => console.log('Telegram WebApp ready'),
    expand: () => console.log('Telegram WebApp expanded'),
    close: () => console.log('Telegram WebApp close'),
    isExpanded: false,
    viewportHeight: window.innerHeight,
    platform: 'unknown',
    colorScheme: 'dark' as const,
    themeParams: {
      bg_color: '#8b5cf6',
      text_color: '#ffffff'
    },
    MainButton: {
      text: '',
      color: '#fbbf24',
      textColor: '#000000',
      isVisible: false,
      isActive: true,
      setText: (text: string) => console.log('MainButton text:', text),
      show: () => console.log('MainButton shown'),
      hide: () => console.log('MainButton hidden'),
      onClick: (callback: () => void) => console.log('MainButton onClick set'),
      enable: () => console.log('MainButton enabled'),
      disable: () => console.log('MainButton disabled')
    },
    HapticFeedback: {
      impactOccurred: (style: string) => console.log('Haptic impact:', style),
      notificationOccurred: (type: string) => console.log('Haptic notification:', type),
      selectionChanged: () => console.log('Haptic selection changed')
    },
    initDataUnsafe: {
      user: {
        id: 123456789,
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe'
      }
    },
    showAlert: (message: string, callback?: () => void) => { alert(message); callback?.(); },
    showConfirm: (message: string, callback: (confirmed: boolean) => void) => {
      callback(confirm(message));
    }
  }
};

// Use mock if Telegram object is not available  
const tg = (() => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    console.log('Using real Telegram WebApp');
    return window.Telegram;
  }
  console.log('Using mock Telegram WebApp');
  return mockTelegram;
})();

function App() {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    prizePool: 0,
    maxPlayers: 10,
    gameActive: true,
    winner: null,
    userStars: 0,
    hasJoined: false,
    currentGameId: null,
    loading: true
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [gameManager] = useState(() => new GameManager());
  const [paymentManager] = useState(() => new TelegramPayments(
    import.meta.env.VITE_TELEGRAM_BOT_TOKEN || ''
  ));

  // Initialize Telegram WebApp
  useEffect(() => {
    try {
      tg.WebApp.ready();
      tg.WebApp.expand();
    } catch (error) {
      console.log('Telegram WebApp not available, using demo mode');
    }
    
    initializeApp();
  }, []);

  // Initialize app with real data
  const initializeApp = async () => {
    try {
      const user = getCurrentUser();
      
      // Check if Supabase is available
      if (!supabase) {
        // Demo mode - use local state
        setGameState(prev => ({
          ...prev,
          currentGameId: 'demo-game',
          players: [],
          prizePool: 0,
          maxPlayers: 10,
          gameActive: true,
          userStars: 10, // Demo balance
          hasJoined: false,
          loading: false
        }));
        return;
      }
      
      try {
        // Get user's star balance
        const balance = await paymentManager.getUserBalance(user.id);
        
        // Get or create current game
        let currentGame = await gameManager.getCurrentGame();
        if (!currentGame) {
          // In demo mode, don't try to create a real game
          currentGame = null;
        }
        
        if (currentGame) {
          const players = await gameManager.getGamePlayers(currentGame.id);
          const hasJoined = players.some(p => p.telegram_user_id === user.id.toString());
          
          setGameState(prev => ({
            ...prev,
            currentGameId: currentGame.id,
            players,
            prizePool: currentGame.prize_pool,
            maxPlayers: currentGame.max_players,
            gameActive: currentGame.status === 'waiting',
            userStars: balance,
            hasJoined,
            loading: false
          }));
        } else {
          // No current game or demo mode
          setGameState(prev => ({
            ...prev,
            currentGameId: 'demo-game',
            players: [],
            prizePool: 0,
            maxPlayers: 10,
            gameActive: true,
            userStars: balance,
            hasJoined: false,
            loading: false
          }));
        }
      } catch (dbError) {
        console.warn('Database error, falling back to demo mode:', dbError);
        // Fallback to demo mode
        setGameState(prev => ({
          ...prev,
          currentGameId: 'demo-game',
          players: [],
          prizePool: 0,
          maxPlayers: 10,
          gameActive: true,
          userStars: 10,
          hasJoined: false,
          loading: false
        }));
      }
    } catch (error) {
      console.warn('Failed to initialize app, using demo mode:', error);
      // Fallback to demo mode
      setGameState(prev => ({
        ...prev,
        currentGameId: 'demo-game',
        players: [],
        prizePool: 0,
        maxPlayers: 10,
        gameActive: true,
        userStars: 10,
        hasJoined: false,
        loading: false
      }));
    }
  };
  // Real-time updates
  useEffect(() => {
    if (!gameState.currentGameId) return;

    const channel = supabase
      .channel('game-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${gameState.currentGameId}`
      }, async () => {
        // Refresh game data
        await initializeApp();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameState.currentGameId]);
  const getCurrentUser = () => {
    const user = tg.WebApp.initDataUnsafe?.user;
    return {
      id: user?.id || Math.floor(Math.random() * 1000000),
      name: user ? `${user.first_name} ${user.last_name || ''}`.trim() : `Player ${Math.floor(Math.random() * 1000)}`
    };
  };

  const joinGame = async () => {
    if (gameState.loading) return;
    
    if (gameState.userStars < 1) {
      tg.WebApp.showAlert('You need at least 1 star to join the game!');
      return;
    }

    if (gameState.hasJoined) {
      tg.WebApp.showAlert('You have already joined this game!');
      return;
    }


    setIsAnimating(true);
    setGameState(prev => ({ ...prev, loading: true }));

    try {
      const user = getCurrentUser();
      
      if (!supabase || gameState.currentGameId === 'demo-game') {
        // Demo mode - simulate joining
        const newPlayer = {
          id: `player-${user.id}`,
          game_id: 'demo-game',
          telegram_user_id: user.id.toString(),
          telegram_username: `user${user.id}`,
          telegram_first_name: user.name.split(' ')[0],
          joined_at: new Date().toISOString(),
          payment_status: 'completed' as const,
          transaction_id: `demo-tx-${Date.now()}`
        };
        
        setGameState(prev => ({
          ...prev,
          players: [...prev.players, newPlayer],
          prizePool: prev.prizePool + 1,
          userStars: prev.userStars - 1,
          hasJoined: true,
          loading: false
        }));
        
        // Simulate winner selection if game is full
        if (gameState.players.length + 1 >= gameState.maxPlayers) {
          setTimeout(() => {
            const allPlayers = [...gameState.players, newPlayer];
            const winner = allPlayers[Math.floor(Math.random() * allPlayers.length)];
            setGameState(prev => ({
              ...prev,
              winner,
              gameActive: false
            }));
            setShowWinner(true);
          }, 2000);
        }
      } else {
        // Real database mode
        await gameManager.joinGame(gameState.currentGameId!, {
          id: user.id,
          first_name: user.name.split(' ')[0],
          last_name: user.name.split(' ').slice(1).join(' ') || undefined,
          username: `user${user.id}`
        });
        
        // Refresh game state
        await initializeApp();
      }
      
      setIsAnimating(false);
    } catch (error) {
      console.error('Failed to join game:', error);
      tg.WebApp.showAlert(`Failed to join game: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsAnimating(false);
      setGameState(prev => ({ ...prev, loading: false }));
    }
  };

  const resetGame = () => {
    tg.WebApp.showConfirm('Start a new game?', (confirmed) => {
      if (confirmed) {
        createNewGame();
      }
    });
  };

  const createNewGame = async () => {
    try {
      setGameState(prev => ({ ...prev, loading: true }));
      const gameId = await gameManager.createGame();
      await initializeApp();
      setShowWinner(false);
    } catch (error) {
      console.error('Failed to create new game:', error);
      tg.WebApp.showAlert('Failed to create new game');
      setGameState(prev => ({ ...prev, loading: false }));
    }
  };

  // Show loading state
  if (gameState.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-purple-200">Loading game...</p>
        </div>
      </div>
    );
  }
  const progress = (gameState.players.length / gameState.maxPlayers) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 bg-yellow-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-32 right-8 w-24 h-24 bg-pink-400 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-400 rounded-full blur-3xl opacity-30"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-yellow-400 p-3 rounded-full mr-3 shadow-lg">
              <Star className="w-8 h-8 text-purple-800 fill-current" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
              Star Lottery
            </h1>
          </div>
          <p className="text-purple-200 text-lg">Win big with Telegram Stars!</p>
        </div>

        {/* Game Card */}
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-white/20">
            {/* Stats Row */}
            <div className="flex justify-between items-center mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-purple-300 mr-2" />
                  <span className="text-purple-300 font-medium">Players</span>
                </div>
                <div className={`text-2xl font-bold transition-all duration-500 ${isAnimating ? 'scale-125 text-yellow-400' : 'text-cyan-400'}`}>
                  {gameState.players.length}/{gameState.maxPlayers}
                </div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Trophy className="w-5 h-5 text-purple-300 mr-2" />
                  <span className="text-purple-300 font-medium">Prize Pool</span>
                </div>
                <div className={`text-2xl font-bold flex items-center justify-center transition-all duration-500 ${isAnimating ? 'scale-125 text-yellow-400' : 'text-yellow-400'}`}>
                  <Star className="w-5 h-5 mr-1 fill-current" />
                  {gameState.prizePool}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-purple-200 text-sm">Progress to draw</span>
                <span className="text-purple-200 text-sm font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-purple-800/50 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-1000 ease-out shadow-lg"
                  style={{ width: `${progress}%` }}
                >
                  <div className="h-full bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Winner Display */}
            {showWinner && gameState.winner && (
              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 rounded-2xl border border-yellow-400/30 animate-pulse">
                <div className="text-center">
                  <div className="text-2xl mb-2">🎉</div>
                  <div className="text-yellow-300 font-bold text-lg">Winner!</div>
                  <div className="text-white font-medium">{gameState.winner.name}</div>
                  <div className="text-yellow-400 text-sm mt-1">
                    <Star className="w-4 h-4 inline mr-1 fill-current" />
                    {Math.floor(gameState.prizePool * 0.7)} stars
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            {gameState.gameActive ? (
              <button
                onClick={joinGame}
                disabled={gameState.hasJoined || gameState.players.length >= gameState.maxPlayers || gameState.userStars < 1 || gameState.loading}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 ${
                  gameState.hasJoined 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : gameState.players.length >= gameState.maxPlayers
                    ? 'bg-red-500 cursor-not-allowed'
                    : gameState.userStars < 1
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 transform hover:scale-105 active:scale-95'
                } text-purple-800`}
              >
                <Star className="w-5 h-5 fill-current" />
                <span>
                  {gameState.hasJoined 
                    ? 'Already Joined' 
                    : gameState.players.length >= gameState.maxPlayers
                    ? 'Game Full'
                    : gameState.userStars < 1
                    ? 'Need 1 Star'
                    : 'Join Game (1 ⭐)'}
                </span>
              </button>
            ) : (
              <button
                onClick={resetGame}
                className="w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 transform hover:scale-105 active:scale-95 text-white"
              >
                <Play className="w-5 h-5" />
                <span>New Game</span>
              </button>
            )}
          </div>

          {/* User Stats */}
          <div className="mt-4 text-center">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-lg rounded-full px-4 py-2 border border-white/20">
              <Star className="w-4 h-4 text-yellow-400 fill-current mr-2" />
              <span className="text-white font-medium">Your Stars: {gameState.userStars}</span>
            </div>
          </div>

          {/* Players List */}
          {gameState.players.length > 0 && (
            <div className="mt-6">
              <h3 className="text-center text-purple-200 font-medium mb-3">Current Players</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {gameState.players.map((player, index) => (
                  <div key={player.id} className="bg-white/5 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium">
                        {index + 1}. {player.telegram_first_name}
                      </span>
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
