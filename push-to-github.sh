#!/bin/bash

# Script to prepare and push the Telegram Bot Admin Panel to GitHub

echo "🚀 Preparing Telegram Bot Admin Panel for GitHub..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
fi

# Create a clean branch for GitHub
echo "Creating clean branch for GitHub..."
git checkout -b main 2>/dev/null || git checkout main

# Add all files except those in gitignore
echo "Adding files to git..."
git add .

# Create initial commit if needed
if [ -z "$(git log --oneline -1 2>/dev/null)" ]; then
    echo "Creating initial commit..."
    git commit -m "Initial commit: Telegram Bot Admin Panel"
else
    echo "Creating commit for updates..."
    git commit -m "Update: Telegram Bot Admin Panel" || echo "No changes to commit"
fi

echo ""
echo "✅ Repository is ready for GitHub!"
echo ""
echo "Next steps:"
echo "1. Create a new repository on GitHub (https://github.com/new)"
echo "   - Repository name: telegram-bot-admin (or your preferred name)"
echo "   - Make it public or private as you prefer"
echo "   - Don't initialize with README, .gitignore, or license"
echo ""
echo "2. Add your GitHub repository as remote:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
echo ""
echo "3. Push to GitHub:"
echo "   git push -u origin main"
echo ""
echo "4. Set up environment variables on your hosting platform:"
echo "   - BOT_TOKEN: Your Telegram bot token"
echo "   - DATABASE_URL: PostgreSQL connection string"
echo "   - JWT_SECRET: Random string for JWT"
echo ""
echo "📝 Remember to update the README.md with your specific repository URL!"