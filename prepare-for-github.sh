#!/bin/bash

echo "🚀 Preparing project for GitHub upload..."
echo ""

# Check if .env file exists and warn user
if [ -f ".env" ]; then
    echo "⚠️  WARNING: .env file detected!"
    echo "   Make sure to remove it or add to .gitignore before pushing to GitHub"
    echo ""
fi

# Check for any sensitive files
echo "🔍 Checking for potentially sensitive files..."
sensitive_files=(
    "bot_token.txt"
    "*.db"
    "*.sqlite"
    "coin_reward_system.db"
    ".env"
    ".env.local"
    ".env.production"
)

found_sensitive=false
for file in "${sensitive_files[@]}"; do
    if ls $file 2>/dev/null 1>&2; then
        echo "   ⚠️  Found: $file"
        found_sensitive=true
    fi
done

if [ "$found_sensitive" = false ]; then
    echo "   ✅ No sensitive files found in working directory"
fi

echo ""
echo "📋 Checklist before uploading to GitHub:"
echo ""
echo "[ ] Remove or backup .env file"
echo "[ ] Remove any database files (*.db, *.sqlite)"
echo "[ ] Remove bot_token.txt if it exists"
echo "[ ] Update LICENSE file with your name"
echo "[ ] Update README.md with your repository URL"
echo "[ ] Test that .env.example has all required variables"
echo "[ ] Ensure no hardcoded secrets in code"
echo ""

echo "📁 Files ready for GitHub:"
echo "   - /client (React frontend)"
echo "   - /server (Express backend)"
echo "   - /shared (Shared types)"
echo "   - package.json"
echo "   - README.md"
echo "   - LICENSE"
echo "   - .env.example"
echo "   - .gitignore"
echo "   - GITHUB_UPLOAD_GUIDE.md"
echo ""

echo "🎯 Next steps:"
echo "1. Review and complete the checklist above"
echo "2. Initialize git repository: git init"
echo "3. Add files: git add ."
echo "4. Commit: git commit -m 'Initial commit'"
echo "5. Add remote: git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
echo "6. Push: git push -u origin main"
echo ""

echo "✨ Good luck with your project!"