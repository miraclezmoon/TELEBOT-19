#!/bin/bash

echo "Preparing TELEBOT-19 for GitHub push..."

# Stage all changes
git add -A

# Create commit with all today's changes
git commit -m "Update TELEBOT-19: Clean UI, user access control, real-time dates, complete rebranding

- Telegram Bot UI: Removed emoji-heavy interface for clean, professional button layout
- User Access Control: Added disable/enable functionality with /api/users/:id/toggle-status endpoint
- Dashboard: Fixed User Activity chart to display real-time dates
- Rebranding: Updated all references from TELEBOT-18 to TELEBOT-19
- Database: Verified Neon connection and schema synchronization"

echo "All changes committed. Ready to push to GitHub."
echo ""
echo "To push to your GitHub repository, run:"
echo "git push origin main"