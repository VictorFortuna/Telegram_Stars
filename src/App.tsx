import React, { useState, useEffect } from 'react';
import { Star, Users, Trophy, Play } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  joinedAt: number;
}

interface GameState {
  players: Player[];
  prizePool: number;
  maxPlayers: number;
  gameActive: boolean;
  winner: Player | null;
  userStars: number;
  hasJoined: boolean;
}

// Telegram Web App Mock (for development)
const mockTelegram = {
  WebApp: {
    ready: () => console.log('Telegram WebApp ready'),
    expand: () => console.log('Telegram WebApp expanded'),
    MainButton: {
      setText: (text: string) => console.log('MainButton text:', text),
      show: () => console.log('MainButton shown'),
      hide: () => console.log('MainButton hidden'),
      onClick: (callback: () => void) => console.log('MainButton onClick set')
    },
    initDataUnsafe: {
      user: {
        id: 123456789,
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe'
      }
    },
    showAlert: (message: string) => alert(message),
    showConfirm: (message: string, callback: (confirmed: boolean) => void) => {
      callback(confirm(message));
    }
  }
};

// Use mock if Telegram object is not available  
const tg = (typeof window !== 'undefined' && (window as any).Telegram) || mockTelegram;

function App() {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    prizePool: 0,
    maxPlayers: 10,
    gameActive: true,
    winner: null,
    userStars: 25, // Demo: user starts with 25 stars
    hasJoined: false
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const [showWinner, setShowWinner] = useState(false);

  // Initialize Telegram WebApp
  useEffect(() => {
    try {
      tg.WebApp.ready();
      tg.WebApp.expand();
    } catch (error) {
      console.log('Telegram WebApp not available, using demo mode');
    }
    
    // Load saved game state
    const savedState = localStorage.getItem('lotteryGameState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setGameState(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to load saved state:', error);
      }
    }
  }, []);

  // Save game state whenever it changes
  useEffect(() => {
    localStorage.setItem('lotteryGameState', JSON.stringify(gameState));
  }, [gameState]);

  const getCurrentUser = () => {
    const user = tg.WebApp.initDataUnsafe?.user;
    return {
      id: user?.id?.toString() || Math.random().toString(),
      name: user ? `${user.first_name} ${user.last_name || ''}`.trim() : `Player ${Math.floor(Math.random() * 1000)}`
    };
  };

  const joinGame = async () => {
    if (gameState.userStars < 1) {
      tg.WebApp.showAlert('You need at least 1 star to join the game!');
      return;
    }

    if (gameState.hasJoined) {
      tg.WebApp.showAlert('You have already joined this game!');
      return;
    }

    if (gameState.players.length >= gameState.maxPlayers) {
      tg.WebApp.showAlert('Game is full!');
      return;
    }

    const user = getCurrentUser();
    const newPlayer: Player = {
      id: user.id,
      name: user.name,
      joinedAt: Date.now()
    };

    setIsAnimating(true);
    
    setGameState(prev => ({
      ...prev,
      players: [...prev.players, newPlayer],
      prizePool: prev.prizePool + 1,
      userStars: prev.userStars - 1,
      hasJoined: true
    }));

    setTimeout(() => {
      setIsAnimating(false);
      
      // Check if game should end
      if (gameState.players.length + 1 >= gameState.maxPlayers) {
        setTimeout(() => {
          drawWinner();
        }, 1000);
      }
    }, 500);
  };

  const drawWinner = () => {
    if (gameState.players.length === 0) return;

    const randomIndex = Math.floor(Math.random() * gameState.players.length);
    const winner = gameState.players[randomIndex];
    const winnerPrize = Math.floor(gameState.prizePool * 0.7);
    const organizerFee = gameState.prizePool - winnerPrize;

    setGameState(prev => ({
      ...prev,
      winner,
      gameActive: false
    }));

    setShowWinner(true);

    // Show winner announcement
    setTimeout(() => {
      tg.WebApp.showAlert(
        `🎉 ${winner.name} wins ${winnerPrize} stars!\n\n` +
        `Prize breakdown:\n` +
        `Winner: ${winnerPrize} stars (70%)\n` +
        `Organizer: ${organizerFee} stars (30%)`
      );
    }, 500);
  };

  const resetGame = () => {
    tg.WebApp.showConfirm('Start a new game?', (confirmed) => {
      if (confirmed) {
        setGameState(prev => ({
          ...prev,
          players: [],
          prizePool: 0,
          gameActive: true,
          winner: null,
          hasJoined: false
        }));
        setShowWinner(false);
      }
    });
  };

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
                disabled={gameState.hasJoined || gameState.players.length >= gameState.maxPlayers || gameState.userStars < 1}
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
                        {index + 1}. {player.name}
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
