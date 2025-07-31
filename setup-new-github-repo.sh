#!/bin/bash

# Setup New GitHub Repository Script
# This will prepare your project for a fresh GitHub repository

echo "==================================="
echo "🚀 Setting Up New GitHub Repository"
echo "==================================="
echo ""

# First, let's clean up the current Git mess
echo "1️⃣ Cleaning up current Git state..."
rm -rf .git

# Initialize fresh Git repository
echo "2️⃣ Initializing fresh Git repository..."
git init

# Add all files
echo "3️⃣ Adding all project files..."
git add -A

# Create initial commit
echo "4️⃣ Creating initial commit..."
git commit -m "Initial commit - Telegram Bot Admin Panel"

echo ""
echo "✅ Your project is ready for GitHub!"
echo ""
echo "📝 Next steps:"
echo "1. Create a new repository on GitHub (name it whatever you want)"
echo "2. Copy the repository URL (e.g., https://github.com/yourusername/new-repo-name.git)"
echo "3. Run this command with your new repo URL:"
echo ""
echo "   git remote add origin YOUR_NEW_REPO_URL"
echo "   git push -u origin main"
echo ""
echo "That's it! Your project will be on GitHub with no conflicts!"