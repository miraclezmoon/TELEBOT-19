# 📜 CHANGELOG – TELEBOT-19

A full-stack Telegram bot management panel with admin tools, user rewards, referral systems, and real-time database sync.

---

## 🗓️ 2025-07-17

### 🚀 Added
- User enable/disable toggle in Admin Panel
- `/api/users/:id/toggle-status` endpoint
- CSV export feature for full user data
- Referring user names and referral metadata in dashboard
- Admin panel support for customizable UI color themes (6 presets)

### 🛠 Changed
- Telegram bot button layout simplified for modern look
- Dashboard activity chart now shows real-time dates instead of static July

### 🧹 Removed
- All onboarding tutorial-related code, API routes, settings, and UI elements

---

## 🗓️ 2025-07-16

### 🛠 Changed
- `/start` command now sends users directly to main menu (tutorial removed)

### 🔧 Deployment
- Switched to Railway’s Nixpacks builder
- Created `railway.json` and `nixpacks.toml`
- Optimized build steps by separating Vite and esbuild builds
- Added memory limit and `--legacy-peer-deps` for stability

### 🐛 Fixed
- Polling conflicts resolved through correct bot instance management
- Bot initialization errors handled gracefully with null checks

---

## 🗓️ 2025-01-19

### 🛠 Changed
- Cleaned up Telegram UI (removed emojis, improved structure)
- Marked completed reward actions with ✓ checkmarks

### 🚫 Security
- Removed hardcoded Telegram Bot Token from `attached_assets/`
- Confirmed all token usage now uses `process.env.BOT_TOKEN`

---

## 🗓️ 2025-01-16

### 🚀 Added
- Admin-configurable reward amount for tutorial completion
- Broadcast messaging system for admins via `/api/broadcast`
- Rate-limited Telegram broadcast handling with Markdown formatting

### 🐛 Fixed
- Tutorial bonus exploitation bug
- Prevented users from claiming tutorial rewards multiple times
- Onboarding UI now redirects to main menu post-completion

---

## 🗓️ 2025-01-14 (Multiple Updates)

### 🚀 Added
- Coin adjustment tools (admin-panel UI, backend endpoint, and transaction log)
- Raffle start/end date controls with validation
- Onboarding wizard system (6 steps) with gamified rewards
- Dark mode, theme toggle, and user onboarding metrics dashboard

### 🐛 Fixed
- Coin balance display inconsistencies in `/daily`, `/info`, and referral logic
- Referral code bug (used Telegram ID instead of referral code)
- Markdown parsing errors in `/referral` links

### 🔐 Security
- Added JWT-based admin login with bcrypt hashing
- Secured backend routes with bearer token verification

---

## ⚙️ Deployment Summary

- 🎯 Hosted via Railway with PostgreSQL (Neon serverless)
- ⚙️ Uses `.env` for all secrets (`BOT_TOKEN`, `JWT_SECRET`, `DATABASE_URL`)
- ✅ Webhook and polling bot both supported
- ✅ Fully responsive Admin UI built with Vite, Tailwind, and shadcn/ui

---

## 🚧 Decommissioned Features

- 🗑️ Full removal of onboarding system and related DB/UI logic (July 16)
- ❌ No longer using tutorial reward settings or tracking fields
- 🔒 All coin-related actions now handled atomically through `awardReward` helper

---

_Last updated: 2025-07-17_
