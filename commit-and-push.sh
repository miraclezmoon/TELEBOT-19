#!/bin/bash

echo "================================================"
echo "📦 Committing and Pushing Morning Changes"
echo "================================================"
echo ""

# Check current status
echo "Current git status:"
git status --short
echo ""

# Add all changes
echo "Adding all changes..."
git add -A

# Create commit with morning's changes
echo "Creating commit..."
git commit -m "Remove tutorial/onboarding functionality and update project

- Removed all onboarding endpoints from server routes
- Removed tutorial completion reward settings from admin panel
- Removed onboarding statistics from dashboard
- Cleaned up Settings page to remove tutorial reward input
- Users now go directly to main menu on /start command
- Database schema still contains onboarding fields but unused
- All onboarding-related code removed from bot.ts and storage.ts"

echo ""
echo "Current commits:"
git log --oneline -5
echo ""

echo "================================================"
echo "🚀 Ready to Push to GitHub"
echo "================================================"
echo ""
echo "Now run these commands with your GitHub token:"
echo ""
echo "1. Remove existing remote:"
echo "   git remote remove origin"
echo ""
echo "2. Add remote with YOUR token:"
echo "   git remote add origin https://miraclezmoon:YOUR_TOKEN@github.com/miraclezmoon/TELEBOT-19.git"
echo ""
echo "3. Push to GitHub:"
echo "   git push -u origin main"
echo ""
echo "Replace YOUR_TOKEN with your actual GitHub Personal Access Token!"