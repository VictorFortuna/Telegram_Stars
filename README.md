# Star Lottery - Telegram Mini App

A beautiful and interactive lottery game built as a Telegram Mini Application where users can bet 1 star to participate and win big!

## 🌟 Features

- **Star-based Lottery System**: Users bet 1 Telegram Star to join the game
- **Automatic Winner Selection**: 70% of the prize pool goes to the winner, 30% to the organizer
- **Real-time Updates**: Live participant count and prize pool updates
- **Telegram Integration**: Full Telegram Web App integration with haptic feedback
- **Responsive Design**: Optimized for mobile devices and Telegram interface
- **Beautiful UI**: Purple gradient theme with smooth animations and micro-interactions

## 🚀 Demo

The app is deployed and accessible at: [Your GitHub Pages URL]

## 🎮 How to Play

1. Open the mini app in Telegram
2. Check your star balance in the bottom display
3. Click "Join Game (1 ⭐)" to participate
4. Watch as more players join and the prize pool grows
5. When the game reaches maximum capacity (10 players), a winner is automatically selected
6. Winner receives 70% of the prize pool, organizer gets 30%

## 🛠️ Technical Details

### Built With
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Vite** for development and building
- **Telegram Web App API** for integration

### Game Mechanics
- Maximum 10 players per game
- Entry fee: 1 Telegram Star
- Prize distribution: 70% winner, 30% organizer
- Automatic game progression and winner selection
- Local storage for game state persistence

### Telegram Integration
- Full Web App API integration
- Haptic feedback for interactions
- Native alert and confirm dialogs
- User data integration (name, ID)
- Responsive to Telegram's theme

## 🏗️ Development Setup

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd telegram-star-lottery
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## 🚀 Deployment to GitHub Pages

### Automatic Deployment
This project includes GitHub Actions workflow for automatic deployment:

1. Push your code to the `main` branch
2. GitHub Actions will automatically build and deploy to GitHub Pages
3. Your app will be available at `https://[username].github.io/[repository-name]`

### Manual Deployment
1. Build the project: `npm run build`
2. Deploy the `dist` folder to GitHub Pages

## 📱 Telegram Bot Setup

To integrate this with a real Telegram bot:

1. Create a bot using [@BotFather](https://t.me/botfather)
2. Set up the Web App URL in bot settings
3. Add a menu button that opens your deployed app
4. Configure webhook endpoints for star payments (requires backend)

### Sample Bot Commands
```
/start - Welcome message with game link
/play - Direct link to lottery game
/balance - Check star balance
/help - Game instructions
```

## 🔧 Configuration

### Environment Variables
For production deployment, you may want to add:
- `VITE_TELEGRAM_BOT_TOKEN` - Your bot token
- `VITE_WEBAPP_URL` - Your deployed app URL

### Customization
- Modify game rules in `src/App.tsx`
- Adjust styling in Tailwind classes
- Change maximum players, entry fee, or prize distribution
- Add sound effects or additional animations

## 🎨 Design System

### Colors
- **Primary**: Purple gradients (#8b5cf6 to #6d28d9)
- **Accent**: Yellow/Gold (#fbbf24, #f59e0b)
- **Success**: Green (#10b981)
- **Text**: White with opacity variations

### Typography
- **Headers**: Bold, gradient text effects
- **Body**: Clean, readable fonts optimized for mobile
- **Numbers**: Emphasized with color and size

### Animations
- Smooth transitions for all interactions
- Scale effects on button presses
- Progress bar animations
- Winner announcement effects

## 🔐 Security Considerations

**Important**: This is a demo implementation. For production use:

1. **Backend Required**: Implement server-side game logic
2. **Star Payments**: Use Telegram's official payment API
3. **User Verification**: Validate Telegram Web App data
4. **Fair Play**: Implement cryptographically secure random selection
5. **Database**: Store game state and transactions securely

## 📄 License

MIT License - feel free to use this project as a starting point for your own Telegram mini apps!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For questions or issues:
- Open a GitHub issue
- Check the Telegram Web App documentation
- Review the code comments for implementation details

## 🎯 Roadmap

- [ ] Real backend integration
- [ ] Multiple game modes
- [ ] Leaderboards and statistics
- [ ] Social sharing features
- [ ] Multi-language support
- [ ] Sound effects and improved animations
- [ ] Tournament mode
- [ ] Daily challenges