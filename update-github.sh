#!/bin/bash

# GitHub Update Helper
# This script helps you commit and push changes to GitHub

# Color codes for pretty output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "==================================="
echo "📤 GitHub Update Helper"
echo "==================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed. Please install git first.${NC}"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ This is not a git repository.${NC}"
    echo "   Run 'git init' first to initialize a repository."
    exit 1
fi

# Check if remote is set up
if ! git remote | grep -q origin; then
    echo -e "${RED}❌ No remote repository configured.${NC}"
    echo "   Add your GitHub repository with:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
    exit 1
fi

# Check for changes
if git diff-index --quiet HEAD -- && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo -e "${GREEN}✅ No changes to commit. Your GitHub repository is up to date!${NC}"
    exit 0
fi

# Show what's changed
echo -e "${YELLOW}📝 Changes detected:${NC}"
git status --short
echo ""

# Ask for commit message
echo "Please describe your changes (or press Enter for auto-generated message):"
read -r commit_message

# If no message provided, auto-generate one
if [ -z "$commit_message" ]; then
    commit_message="Update $(date +'%Y-%m-%d %H:%M:%S')"
fi

# Stage all changes
echo "📦 Staging changes..."
git add -A

# Commit changes
echo "💾 Committing changes..."
git commit -m "$commit_message"

# Push to GitHub
echo "🚀 Pushing to GitHub..."
if git push 2>/dev/null; then
    echo ""
    echo "✅ Successfully updated GitHub repository!"
    echo "   Your changes are now live on GitHub."
elif git push -u origin main; then
    echo ""
    echo "✅ Successfully updated GitHub repository!"
    echo "   Your changes are now live on GitHub."
    echo "   (Set up tracking for main branch)"
else
    echo ""
    echo "❌ Push failed. Common solutions:"
    echo "   1. Make sure you've set up the remote repository"
    echo "   2. Check your authentication (use Personal Access Token)"
    echo "   3. Ensure you have push permissions"
fi

echo ""
echo "==================================="