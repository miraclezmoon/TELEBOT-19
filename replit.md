# Telegram Bot Admin Panel

## Overview

This is a full-stack web application built with React, Express.js, and Drizzle ORM that provides an admin panel for managing a Telegram bot system. The application includes user management, a coin/reward system, raffles, a virtual shop, and referral tracking. It uses PostgreSQL as the database and integrates with the Telegram Bot API.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **API**: RESTful API with structured error handling

### Key Components

1. **Admin Panel**: Web-based interface for managing the bot system
2. **Telegram Bot**: Node.js bot using node-telegram-bot-api
3. **Database Layer**: Drizzle ORM with PostgreSQL schema
4. **Authentication System**: JWT-based admin authentication
5. **Real-time Features**: Query invalidation for live updates

## Data Flow

1. **Admin Authentication**: JWT tokens stored in localStorage, validated on each request
2. **Bot Operations**: Telegram bot handles user interactions and updates database
3. **Admin Actions**: Admin panel makes API calls to modify bot settings and data
4. **Database Updates**: All changes go through Drizzle ORM to PostgreSQL
5. **Real-time Updates**: TanStack Query automatically refreshes data

## External Dependencies

### Core Technologies
- **Database**: PostgreSQL via Neon Database (@neondatabase/serverless)
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Bot API**: node-telegram-bot-api for Telegram integration
- **Authentication**: bcrypt for password hashing, jsonwebtoken for tokens

### UI Components
- **Component Library**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with custom design system
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React icons

### Development Tools
- **Build**: Vite with TypeScript support
- **Development**: tsx for TypeScript execution
- **Production**: esbuild for server bundling

## Deployment Strategy

The application is designed for deployment on cloud platforms with the following structure:

1. **Frontend**: Static files served from `dist/public`
2. **Backend**: Node.js server running on configurable port
3. **Database**: PostgreSQL connection via environment variable
4. **Environment Variables**: 
   - `DATABASE_URL`: PostgreSQL connection string
   - `BOT_TOKEN`: Telegram bot token
   - `JWT_SECRET`: Secret key for JWT signing
   - `PORT`: Server port (defaults to 5000)

### Database Schema

The application uses a comprehensive PostgreSQL schema with the following main tables:

- **users**: Telegram user data with coins and referral tracking
- **admins**: Admin accounts for panel access
- **transactions**: All coin-related transactions with metadata
- **raffles**: Raffle management with entries and winners
- **raffleEntries**: User entries in raffles
- **shopItems**: Virtual shop items with pricing
- **purchases**: Shop purchase history
- **botSettings**: Configurable bot parameters

### Security Considerations

1. **Password Security**: bcrypt hashing for admin passwords
2. **Authentication**: JWT tokens with expiration
3. **API Security**: Bearer token authentication on protected routes
4. **Input Validation**: Zod schemas for data validation
5. **Environment Variables**: Sensitive data stored in environment variables

The application follows modern web development practices with TypeScript throughout, proper error handling, and a clean separation of concerns between frontend and backend components.

## Recent Changes

### January 10, 2025
- Implemented interactive inline keyboard buttons for Telegram bot with proper visual display
- Fixed callback query handler bugs and message ID parameter passing issues
- Connected daily check-in functionality to admin panel settings - rewards now use amounts configured in admin panel
- Updated referral system to use reward amounts from admin panel settings
- Fixed all button handlers to properly reference messageId parameter instead of callbackQuery
- Implemented functional logic to make all button actions (Daily Check-in, Join Raffle, Coin Shop, Invite Friends, My Info, Enter Invitation Code) work with admin panel configurations
- Bot now dynamically uses settings (dailyRewardAmount, referralReward) from the admin panel instead of hardcoded values
- Implemented invitation code validation with proper state management:
  - Added user state tracking to handle text input when expecting invitation codes
  - Validates codes against actual user referral codes in database
  - Prevents users from using their own codes or using codes multiple times
  - Rewards both referrer and referee based on admin panel settings
  - Clear user states when returning to main menu
- Reset all test users' coins to 0 and cleared daily reward history for clean testing
- Fixed markdown parsing error in referral link handler by wrapping links in backticks
- Added coin adjustment functionality to admin panel Users page:
  - Add/Withdraw buttons for each user with dialog for amount and reason entry
  - Implemented getUserById method in storage layer
  - Created API endpoint `/api/users/:id/adjust-coins` for coin management
  - Transaction records created for all coin adjustments
- Enhanced Raffles creation form with date pickers:
  - Added both start date and end date fields with datetime-local inputs
  - Start date is optional (defaults to current time if not specified)
  - End date is required and must be in the future
- Fixed shop page Edit button functionality by implementing EditShopItemModal component
- Fixed Replit preview loading issue:
  - Changed AdminLayout to use wouter navigation instead of window.location for redirects
  - Fixed authentication flow to properly redirect to login page when no token is present
  - Resolved duplicate bot initialization causing polling conflicts
- Updated Telegram bot to use dynamic reward amounts from admin panel settings:
  - Daily reward amount now pulls from admin panel settings instead of hardcoded value
  - Referral reward amount now pulls from admin panel settings
  - All button texts and messages show dynamic amounts (e.g., "+5 coins" changes based on settings)
  - Updated /start, /daily, /referral commands and all callback handlers
  - Fixed handleBackToMenu function to show correct amounts when returning to main menu

### January 11, 2025
- Simplified bot reward system to use fixed values:
  - Daily check-in: 1 coin (no bonus for consecutive days)
  - Referral rewards: 1 coin for both referrer and referee
  - Removed "bonus for consecutive days" text from all messages
- Fixed referral system bug where bot was looking up referrer by telegram ID instead of referral code
- Updated user balance display to show correct amount after receiving referral bonus
- All reward amounts are now hardcoded to 1 coin instead of reading from settings
- Fixed critical referral link bug in `/start` command:
  - Changed `getUserByTelegramId(referralCode)` to `getUserByReferralCode(referralCode)`
  - Now correctly finds referrer by their referral code when new user joins via link
  - Added balance update to user object after referral bonus to show correct amount in welcome message
- Confirmed referral feature working correctly:
  - User A shares their referral link from "Invite Friends" button
  - User B clicks link and starts bot
  - Both users receive 1 coin each
  - Transaction records created for both users
  - Welcome message shows correct balance including referral bonus

### January 14, 2025 (Part 1)
- Added daily user data synchronization on /start command:
  - Updates username, firstName, and lastName from Telegram whenever user uses /start
  - Only updates if data has changed to minimize database writes
  - Ensures admin panel always shows current user information
  - Helps track username changes and keeps user profiles up-to-date
- Fixed referral handling for existing users who haven't used a referral code before
- Fixed user coin balance display issues:
  - Daily check-in now properly shows updated balance immediately after claiming
  - My Info command now fetches fresh user data before displaying to ensure accurate coin count
  - Back to Menu function refreshes user data to show current balance
  - All coin updates now properly reflect in the UI without requiring restart
- Enhanced invitation code validation:
  - Only accepts valid invitation codes that were created by registered users
  - Shows clearer error message when code doesn't exist
  - Displays code owner's name when invitation code is successfully used
  - Prevents users from using their own codes or using codes multiple times
- Improved backend data access and synchronization:
  - Added updateUserById method for direct user updates via ID
  - Created /api/users/:id/full endpoint for complete user data with transactions and purchases
  - Added /api/users/:telegramId/sync endpoint for data synchronization
  - Updated coin adjustment endpoint to return fresh user data after updates
  - All backend operations now properly sync with bot data
  - Ensured consistent coin balance display across admin panel and bot

### January 14, 2025 (Part 2)
- Implemented awardReward method in storage.ts with transaction locking:
  - Uses database transactions with row-level locking (for update) to prevent race conditions
  - Validates user exists and has sufficient coins before updating
  - Creates transaction record in same atomic operation
  - Ensures data consistency for all coin operations
- Updated bot.ts to use dynamic reward amounts from admin panel settings:
  - Daily reward amount now fetched from 'daily_reward_amount' bot setting
  - Referral reward amount now fetched from 'referral_reward_amount' bot setting
  - All bot messages dynamically show correct reward amounts
  - Updated all handlers: /start, /daily, /referral, callback handlers, and invitation code processing
- Replaced direct coin updates with awardReward method throughout bot:
  - Daily check-in now uses awardReward for atomic coin updates
  - Referral rewards use awardReward for both referrer and referee
  - Invitation code rewards use awardReward for consistency
  - All coin operations now guaranteed to be atomic and create transaction records

### January 14, 2025 (Part 3)
- Fixed raffle entries display to show actual customer names:
  - Updated getRaffleEntries in storage.ts to join with users table and include user information
  - Modified ViewEntriesModal to display full names (firstName + lastName) with username as secondary info
  - Shows format: "John Doe" with "@username • Entered: [timestamp]" below
  - Falls back to username or "User [ID]" if no name available
- Implemented PST timezone handling throughout the system:
  - Added toPST helper function to convert dates to Pacific Standard Time (UTC-8)
  - Updated canClaimDailyReward to use PST-based day boundaries instead of UTC
  - Modified streak calculation in claimDaily to use PST dates for consistency
  - Updated frontend date displays to show PST times using America/Los_Angeles timezone
  - All timestamps now display in PST format (e.g., "1/14/2025, 1:30 PM")
- Implemented dark mode for admin panel:
  - Created ThemeProvider with localStorage persistence
  - Added theme toggle button (sun/moon icon) in admin layout header
  - Updated all components to use theme-aware Tailwind classes
  - Enhanced text visibility in dark mode with bold fonts and high contrast
  - Changed dark mode foreground colors to pure white (100%) for maximum readability
  - Updated muted-foreground to 85% white for better secondary text visibility
  - Added color-scheme: dark CSS property for native browser dark mode support
- Replaced broadcast message feature with user data export:
  - Removed broadcast message modal and related functionality
  - Changed "Send Broadcast" button to "Export Users Data" 
  - Added API endpoint `/api/users/export` that generates CSV file
  - CSV includes: ID, Username, First Name, Last Name, Coins, Referral Code, Referred By, Created At, Last Reward, Streak, Active status
  - All dates in export are formatted in PST timezone
  - File downloads as "telegram_bot_users.csv" and can be opened in Google Sheets or Excel
  - Fixed authentication token issue (changed from 'token' to 'authToken')
  - Added success/error toast notifications for export feedback
- Enhanced referrals page with referring user information:
  - Updated Top Referrers section to show full names (firstName + lastName) for referrers
  - Added dark mode support for all text elements in referrals page
  - Added Recent Referrals section showing who referred each user
  - Each referral entry now displays: referred user's name, referring user's name, and referral code used

### January 14, 2025 (Part 4)
- Added "Reset User Points" feature to Settings page:
  - Created new "Danger Zone" section with red-themed styling for destructive actions
  - Implemented confirmation dialog to prevent accidental resets
  - Added API endpoint `/api/users/reset-points` to reset all user coins to 0
  - Created transaction records for each user showing the admin adjustment
  - Added proper dark mode support for danger zone components
  - Feature resets all user balances to 0 with proper transaction history

### January 14, 2025 (Part 5)
- Implemented interactive user onboarding wizard with gamified tutorial:
  - Added database fields for onboarding tracking (onboardingCompleted, onboardingStep, onboardingProgress)
  - Created comprehensive 6-step tutorial system covering all bot features
  - Step 1: Welcome message with introduction to coin system
  - Step 2: Daily rewards tutorial with interactive claim demonstration
  - Step 3: Referral system explanation with link generation
  - Step 4: Shop tour showcasing available items
  - Step 5: Raffle participation guide
  - Step 6: Completion celebration with bonus coins
  - Each step awards coins to encourage progression
  - Added skip option for experienced users
  - Integrated callback handlers for all onboarding interactions
  - New users automatically see onboarding prompt on /start
  - Existing users can access "Restart Tutorial" from main menu
  - Admin dashboard now shows onboarding completion statistics in a new card
  - Created dedicated Onboarding Statistics page with:
    - Completion rate metrics and progress visualization
    - User distribution by tutorial step
    - Detailed user onboarding status table
    - Tutorial flow overview
  - Added getOnboardingStats method to storage layer
  - All 9 existing users currently show 0% completion as feature is new

### January 15, 2025
- Implemented customizable UI color themes for admin panel:
  - Created theme system with 6 predefined color schemes: Default Blue, Emerald Green, Royal Purple, Vibrant Orange, Rose Pink, Modern Slate
  - Each theme has both light and dark mode variants with carefully selected color palettes
  - Added ThemeProvider enhancements to support color themes alongside dark/light mode
  - Created ThemeSelector component with visual previews of each theme
  - Added dedicated Themes page to admin panel navigation
  - Themes are persisted in localStorage and apply instantly across the entire interface
  - Theme system uses CSS custom properties for seamless color switching
  - Integrated with existing dark mode toggle for complete appearance customization
- Fixed Telegram bot /start command issue:
  - Resolved bot polling conflict by adding proper cleanup and initialization
  - Added debug logging for message handling
  - Implemented proper bot instance management to prevent multiple instances
  - Bot now successfully receives and processes /start commands from users

### January 16, 2025
- Added tutorial completion reward setting to admin panel:
  - Created new input field in Settings > Reward Settings for configuring tutorial completion coins
  - Default value set to 10 coins (configurable from 1-100)
  - Updated backend API endpoints to handle tutorial completion reward settings
  - Modified onboarding system to use dynamic reward amount from admin settings
  - Tutorial final step now displays the actual reward amount configured in settings
  - Reward is awarded upon tutorial completion using the admin-configured amount
- Fixed onboarding bug where it stopped at step 4/7:
  - Changed `storage.getShopItems()` to `storage.getActiveShopItems()` in onboarding.ts
  - Bot onboarding now progresses through all 7 steps successfully
- Implemented rule to prevent users from claiming tutorial bonus more than once:
  - Added `hasClaimedTutorialBonus` method in storage layer to check transaction history
  - Modified `completeOnboarding` function to check if user has already claimed the bonus
  - Tutorial bonus is only awarded on first completion, not on subsequent tutorial restarts
  - Shows appropriate message: "Tutorial already completed. Bonus can only be claimed once!" if user tries to claim again
  - Ensures fair distribution of tutorial rewards and prevents exploitation
- Implemented broadcast message feature for admin panel:
  - Added "Send Announcement" button to Quick Actions section in dashboard
  - Created BroadcastMessageModal component with message input and character limit (4096)
  - Implemented backend API endpoint `/api/broadcast` for sending messages to all active users
  - Added `broadcastMessage` function in bot.ts with rate limiting protection (50ms delay between messages)
  - Added `getActiveUsers` method to storage layer to fetch all active users with chat IDs
  - Messages are sent with "📢 Announcement" header and formatted in Markdown
  - Success/failure counts are tracked and displayed to admin after broadcast
  - Feature allows admins to send important announcements to all bot users simultaneously
- Fixed tutorial completion bonus multiple claim bug:
  - Modified `handleOnboardingStep` to exclude 'complete' action from automatic reward distribution
  - Ensured tutorial completion bonus is only handled in `completeOnboarding` function
  - Fixed variable scoping issue where `tutorialReward` was undefined outside conditional block
  - Tutorial completion bonus now correctly awards only once per user as intended
  - Users attempting to claim bonus multiple times see: "Tutorial already completed. Bonus can only be claimed once!"
- Enhanced tutorial completion flow with automatic main menu redirect:
  - After claiming tutorial completion bonus, users automatically see the main menu after 2 seconds
  - Skip tutorial option also redirects to main menu after 1.5 seconds
  - Added "Restart Tutorial" button to the main menu for easy access
  - Provides seamless transition from tutorial to regular bot usage
  - Main menu dynamically shows current balance and streak information
- Disabled all tutorial bonus rewards for users who have completed the tutorial once:
  - Added check for tutorial completion status before awarding any step rewards
  - Welcome bonus and all step rewards are only given on first tutorial completion
  - Users attempting to claim rewards on subsequent tutorial runs see: "Tutorial rewards are only available on first completion"
  - Prevents exploitation by restarting tutorial multiple times
  - Tutorial completion bonus remains one-time only as previously implemented
- Fixed tutorial bonus multiple claim bug:
  - Updated `hasClaimedTutorialBonus` method to check for ANY onboarding transaction
  - Previously was only checking metadata field which wasn't being populated
  - Now correctly checks transaction description field for all onboarding rewards
  - Users can no longer claim welcome bonus or completion bonus multiple times

### January 16, 2025 (Part 2)
- Fixed critical security vulnerability:
  - Removed hardcoded Telegram Bot API token from `attached_assets/bot_token_1752179153005.txt`
  - This was a HIGH SEVERITY security issue as the token was exposed in plaintext
  - Application correctly uses environment variables for bot token configuration
  - No functionality impact as production code uses `process.env.BOT_TOKEN`

### July 16, 2025
- Completed removal of all tutorial/onboarding functionality as requested by user:
  - Removed onboarding endpoint `/api/onboarding/stats` from server routes
  - Removed tutorial completion reward settings from admin panel
  - Removed onboarding statistics card from dashboard
  - Updated dashboard stats API to remove onboarding references
  - Cleaned up Settings page to remove tutorial reward input field
  - All onboarding-related code previously removed from bot.ts and storage.ts
  - Users now go directly to main menu on /start command without any tutorial prompts
  - Database schema still contains onboarding fields but they are no longer used by the application

### July 17, 2025
- Addressed Railway deployment failure issue:
  - Build was failing with "npm run build" timeout and module resolution errors
  - Created railway.json configuration file to use NIXPACKS builder instead of Docker
  - Created nixpacks.toml with optimized build configuration:
    - Split build command into separate vite and esbuild steps
    - Disabled minification to speed up build process
    - Added NODE_OPTIONS to increase memory limit
    - Used npm install with --legacy-peer-deps flag
  - Configuration now optimized for Railway's build environment
- Fixed critical bot initialization errors:
  - Added null checks to all bot handlers to prevent "Cannot read properties of null" errors
  - Fixed syntax errors in bot.ts (misplaced error handlers and missing braces)
  - Resolved bot polling conflicts by proper cleanup and initialization
  - Bot now gracefully handles cases where it fails to initialize
- Application Status:
  - Admin panel fully functional and accessible
  - All API endpoints working correctly
  - Database connectivity established
  - Telegram bot operational with proper error handling
  - Ready for deployment with Railway configuration files in placenment