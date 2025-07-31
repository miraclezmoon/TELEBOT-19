#!/bin/bash

# GitHub Sync Fix Script
# This will resolve your current merge conflict and sync with GitHub

echo "🔧 Fixing GitHub sync issue..."
echo ""

# Step 1: Abort the current rebase
echo "1️⃣ Aborting current rebase..."
git rebase --abort 2>/dev/null || echo "   No rebase in progress"

# Step 2: Configure git to use merge instead of rebase
echo "2️⃣ Configuring git..."
git config pull.rebase false

# Step 3: Since your local version is working, we'll force push it
echo "3️⃣ Force pushing your working version to GitHub..."
echo "   (This will overwrite the GitHub version with your local working code)"

if git push origin main --force; then
    echo ""
    echo "✅ SUCCESS! Your GitHub repository is now synced!"
    echo "   Your working local version is now on GitHub."
    echo ""
    echo "📝 Next steps:"
    echo "   - Use './update-github.sh' for future updates"
    echo "   - No more merge conflicts!"
else
    echo ""
    echo "❌ Push failed. Please check:"
    echo "   1. Your internet connection"
    echo "   2. Your GitHub authentication (Personal Access Token)"
    echo "   3. Repository permissions"
fi

echo ""
echo "==================================="