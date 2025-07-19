# Telegram Bot Admin Panel - GitHub Upload Guide

## Project Overview
This is a full-stack Telegram bot system with an admin panel built using:
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Bot**: Telegram Bot API with node-telegram-bot-api

## Pre-Upload Checklist

### 1. Remove Sensitive Information
Before uploading to GitHub, ensure these files/values are removed or replaced:

- [ ] Bot token in environment variables
- [ ] Database credentials
- [ ] JWT secret key
- [ ] Admin passwords
- [ ] Any API keys or secrets

### 2. Create .env.example
Create a template for environment variables without actual values.

### 3. Update .gitignore
Ensure sensitive files are excluded from version control.

### 4. Documentation
- [ ] README.md with setup instructions
- [ ] API documentation
- [ ] Database schema documentation
- [ ] Deployment guide

## Files to Include

### Core Files
- `/client` - React frontend application
- `/server` - Express backend application
- `/shared` - Shared types and schemas
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `drizzle.config.ts` - Database configuration

### Documentation
- `README.md` - Project overview and setup
- `GITHUB_UPLOAD_GUIDE.md` - This file
- `.env.example` - Environment variables template

### Configuration Files
- `.gitignore` - Git ignore rules
- `postcss.config.js` - PostCSS configuration
- `components.json` - shadcn/ui configuration

## Setup Instructions for New Users

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or Neon.tech account)
- Telegram Bot Token (from @BotFather)

### Installation Steps
1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in values
4. Run database migrations: `npm run db:push`
5. Start development server: `npm run dev`

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `BOT_TOKEN` - Telegram bot token
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 5000)

## Features
- 🤖 Telegram bot with interactive buttons
- 💰 Coin reward system with daily check-ins
- 🎟️ Raffle system for user engagement
- 🛍️ Virtual shop with coin purchases
- 👥 Referral system with tracking
- 📊 Admin dashboard with analytics
- 🌙 Dark mode support
- 📱 Mobile-responsive design
- 🔐 JWT-based authentication
- 📅 PST timezone handling

## Security Considerations
- All admin passwords are hashed with bcrypt
- JWT tokens expire after 7 days
- API endpoints are protected with authentication
- Input validation with Zod schemas
- SQL injection protection via Drizzle ORM

## Deployment
The application can be deployed on:
- Replit
- Heroku
- Railway
- Render
- Any Node.js hosting platform

## License
[Add your license here]

## Contributing
[Add contributing guidelines here]