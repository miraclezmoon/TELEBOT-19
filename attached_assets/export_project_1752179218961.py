#!/usr/bin/env python3
"""
Export project files for deployment
Creates a deployment-ready package
"""
import os
import shutil
import zipfile
from pathlib import Path

def create_deployment_package():
    """Create a deployment package with all necessary files"""
    
    # Files needed for deployment
    deployment_files = [
        'standalone_server.py',
        'admin_panel.py',
        'app.py',
        'bot.py',
        'database.py',
        'models.py',
        'utils.py',
        'keep_alive.py',
        'Dockerfile',
        'railway.json',
        'Procfile',
        'app.json',
        'vercel.json',
        'DEPLOYMENT_GUIDE.md',
        'DEPLOYMENT_SUMMARY.md'
    ]
    
    # Create deployment directory
    deploy_dir = Path('deployment_package')
    deploy_dir.mkdir(exist_ok=True)
    
    # Copy files to deployment directory
    copied_files = []
    for file_name in deployment_files:
        if Path(file_name).exists():
            shutil.copy2(file_name, deploy_dir / file_name)
            copied_files.append(file_name)
            print(f"✅ Copied: {file_name}")
        else:
            print(f"⚠️  Missing: {file_name}")
    
    # Create requirements.txt for deployment
    requirements_content = """streamlit>=1.28.0
pandas>=2.0.0
plotly>=5.15.0
python-telegram-bot>=20.0
requests>=2.31.0"""
    
    with open(deploy_dir / 'requirements.txt', 'w') as f:
        f.write(requirements_content)
    copied_files.append('requirements.txt')
    
    # Create README for deployment
    readme_content = """# Telegram Bot Admin Panel

## Quick Deploy Instructions

### Railway (Recommended)
1. Upload these files to GitHub repository
2. Go to railway.app
3. Deploy from GitHub repo
4. Get permanent URL instantly

### Heroku
1. Upload to GitHub
2. Use Heroku CLI: `heroku create your-app-name`
3. Deploy: `git push heroku main`

### Docker (Any Platform)
1. Build: `docker build -t telegram-bot-admin .`
2. Run: `docker run -p 5000:5000 telegram-bot-admin`

## Files Included
- All bot and admin panel code
- Database and models
- Deployment configurations for multiple platforms
- Standalone server for 24/7 operation

## After Deployment
1. Visit your permanent URL
2. Configure bot token in admin panel
3. Start bot system
4. Manage your 24/7 bot operation

Enjoy your permanent admin panel URL!
"""
    
    with open(deploy_dir / 'README.md', 'w') as f:
        f.write(readme_content)
    copied_files.append('README.md')
    
    # Create deployment ZIP
    zip_path = 'telegram_bot_deployment.zip'
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file_name in copied_files:
            file_path = deploy_dir / file_name
            if file_path.exists():
                zipf.write(file_path, file_name)
    
    print(f"\n🎉 Deployment package created: {zip_path}")
    print(f"📁 Contains {len(copied_files)} files ready for deployment")
    
    return zip_path, copied_files

def main():
    """Main export function"""
    print("=== Creating Deployment Package ===")
    print("Preparing your project for permanent URL deployment...")
    
    zip_path, files = create_deployment_package()
    
    print("\n=== Deployment Package Ready ===")
    print(f"File: {zip_path}")
    print(f"Size: {os.path.getsize(zip_path)} bytes")
    
    print("\n=== Next Steps ===")
    print("1. Download the ZIP file from Replit")
    print("2. Extract files on your computer")
    print("3. Upload to GitHub repository")
    print("4. Deploy on Railway/Heroku/Vercel")
    print("5. Get your permanent URL!")
    
    return True

if __name__ == "__main__":
    main()