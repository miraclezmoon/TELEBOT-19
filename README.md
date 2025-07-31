# Telegram Bot Admin Panel

A sophisticated Telegram bot platform with a web-based admin panel, featuring a gamified reward ecosystem, user management, and advanced interaction tracking.

## Features

- **Admin Dashboard**: Web-based control panel for managing bot operations
- **User Management**: Track and manage Telegram users, adjust coin balances
- **Reward System**: Daily check-in rewards, referral bonuses, and streak tracking
- **Raffle System**: Create and manage raffles with automatic winner selection
- **Virtual Shop**: Sell digital products for coins
- **Interactive Onboarding**: 7-step tutorial for new users
- **Real-time Analytics**: Track user engagement and system statistics
- **Customizable Themes**: 6 pre-built color themes with dark mode support
- **Broadcast Messaging**: Send announcements to all bot users

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Bot Framework**: node-telegram-bot-api
- **Authentication**: JWT-based admin authentication
- **Real-time Updates**: TanStack Query

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Telegram Bot Token from [@BotFather](https://t.me/botfather)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/TELEBOT-19.git
cd TELEBOT-19
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
- `BOT_TOKEN`: Your Telegram bot token
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Random string for JWT signing

4. Push database schema:
```bash
npm run db:push
```

5. Create an admin account:
```bash
npm run create-admin
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at:
- Admin Panel: http://localhost:5000
- API: http://localhost:5000/api

## Production Deployment

Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Bot Commands

- `/start` - Initialize bot and show main menu
- `/daily` - Claim daily reward
- `/referral` - Get referral link
- `/raffles` - View active raffles
- `/shop` - Browse shop items
- `/myinfo` - View account information

## Admin Panel Features

### Dashboard
- Quick statistics overview
- Recent user activity
- System health monitoring

### Users Management
- View all registered users
- Adjust coin balances
- Export user data to CSV
- Track referral relationships

### Raffles
- Create time-limited raffles
- Set entry costs and prizes
- Draw winners automatically
- View participant lists

### Shop Management
- Add/edit/remove products
- Set prices and stock levels
- Track purchase history

### Settings
- Configure reward amounts
- Manage bot settings
- Customize appearance themes
- Reset system data

## Security Features

- JWT-based authentication for admin access
- bcrypt password hashing
- Environment variable configuration
- Input validation with Zod schemas
- Rate limiting on bot broadcasts

## Database Schema

The application uses a comprehensive PostgreSQL schema including:
- Users tracking with Telegram integration
- Transaction history for all coin movements
- Raffle and shop management tables
- Bot settings configuration
- Admin accounts with secure authentication

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with Replit AI
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)# TELEBOT-19
# TELEBOT-19
