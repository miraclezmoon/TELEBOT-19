# Setup Instructions

## Initial Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy the example environment file and configure it:
```bash
cp .env.example .env
```

Edit `.env` with your values:
- `DATABASE_URL`: Your PostgreSQL connection string
- `BOT_TOKEN`: Your Telegram bot token from @BotFather
- `JWT_SECRET`: A secure random string for JWT signing
- `PORT`: Server port (default: 5000)

### 3. Database Setup
Push the database schema to your PostgreSQL instance:
```bash
npm run db:push
```

### 4. Create Admin Account
To create an admin account, run the following command:
```bash
tsx scripts/create-admin.ts
```

Or manually create an admin by running this SQL in your database:
```sql
-- Replace 'your_username', 'your_hashed_password', and 'Your Name' with actual values
INSERT INTO admins (username, password, name) 
VALUES ('admin', '$2a$10$YourHashedPasswordHere', 'Admin User');
```

Note: You'll need to hash the password using bcrypt. The default admin credentials are:
- Username: `admin`
- Password: `admin123`

**Important**: Change the admin password immediately after first login!

### 5. Start the Application
For development:
```bash
npm run dev
```

For production:
```bash
npm run build
npm start
```

## Bot Configuration

1. Create a new bot with [@BotFather](https://t.me/botfather)
2. Copy the bot token to your `.env` file
3. Start the application - the bot will automatically connect
4. Test by sending `/start` to your bot

## Troubleshooting

### Bot Not Responding
- Check if the bot token is correct
- Ensure only one instance of the bot is running
- Check the console logs for error messages

### Database Connection Issues
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check network connectivity to database

### Admin Login Issues
- Verify admin account exists in database
- Check JWT_SECRET is set in environment
- Clear browser cookies and try again