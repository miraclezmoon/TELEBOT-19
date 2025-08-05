#!/usr/bin/env python3
"""
Deployment configuration generator for standalone admin panel
Supports multiple hosting platforms with permanent URLs
"""
import os
import json
from pathlib import Path

class DeploymentConfig:
    def __init__(self):
        self.platforms = {
            'railway': self.generate_railway_config,
            'render': self.generate_render_config,
            'heroku': self.generate_heroku_config,
            'digitalocean': self.generate_digitalocean_config,
            'vercel': self.generate_vercel_config
        }
    
    def generate_railway_config(self):
        """Generate Railway deployment configuration"""
        config = {
            "name": "telegram-bot-admin-panel",
            "description": "24/7 Telegram Bot Admin Panel",
            "build": {
                "builder": "DOCKERFILE"
            },
            "deploy": {
                "startCommand": "python standalone_server.py",
                "healthcheckPath": "/_stcore/health"
            },
            "environments": {
                "production": {
                    "variables": {
                        "PORT": "5000",
                        "HOST": "0.0.0.0"
                    }
                }
            }
        }
        
        with open('railway.json', 'w') as f:
            json.dump(config, f, indent=2)
        
        return "Railway configuration created: railway.json"
    
    def generate_render_config(self):
        """Generate Render deployment configuration"""
        config = {
            "services": [
                {
                    "type": "web",
                    "name": "telegram-bot-admin",
                    "env": "docker",
                    "plan": "starter",
                    "buildCommand": "",
                    "startCommand": "python standalone_server.py",
                    "envVars": [
                        {
                            "key": "PORT",
                            "value": "5000"
                        },
                        {
                            "key": "HOST", 
                            "value": "0.0.0.0"
                        }
                    ],
                    "healthCheckPath": "/_stcore/health"
                }
            ]
        }
        
        with open('render.yaml', 'w') as f:
            import yaml
            yaml.safe_dump(config, f, indent=2)
        
        return "Render configuration created: render.yaml"
    
    def generate_heroku_config(self):
        """Generate Heroku deployment configuration"""
        # Procfile for Heroku
        with open('Procfile', 'w') as f:
            f.write('web: python standalone_server.py\n')
        
        # app.json for Heroku
        config = {
            "name": "telegram-bot-admin-panel",
            "description": "24/7 Telegram Bot Admin Panel",
            "image": "heroku/python",
            "addons": [],
            "env": {
                "PORT": {
                    "description": "Port for the admin panel",
                    "value": "5000"
                }
            },
            "formation": {
                "web": {
                    "quantity": 1,
                    "size": "basic"
                }
            }
        }
        
        with open('app.json', 'w') as f:
            json.dump(config, f, indent=2)
        
        return "Heroku configuration created: Procfile, app.json"
    
    def generate_digitalocean_config(self):
        """Generate DigitalOcean App Platform configuration"""
        config = {
            "name": "telegram-bot-admin",
            "services": [
                {
                    "name": "admin-panel",
                    "source_dir": "/",
                    "github": {
                        "repo": "your-username/your-repo",
                        "branch": "main"
                    },
                    "run_command": "python standalone_server.py",
                    "environment_slug": "python",
                    "instance_count": 1,
                    "instance_size_slug": "basic-xxs",
                    "envs": [
                        {
                            "key": "PORT",
                            "value": "5000"
                        }
                    ],
                    "health_check": {
                        "http_path": "/_stcore/health"
                    }
                }
            ]
        }
        
        with open('.do/app.yaml', 'w') as f:
            os.makedirs('.do', exist_ok=True)
            import yaml
            yaml.safe_dump(config, f, indent=2)
        
        return "DigitalOcean configuration created: .do/app.yaml"
    
    def generate_vercel_config(self):
        """Generate Vercel deployment configuration"""
        config = {
            "version": 2,
            "name": "telegram-bot-admin",
            "builds": [
                {
                    "src": "standalone_server.py",
                    "use": "@vercel/python"
                }
            ],
            "routes": [
                {
                    "src": "/(.*)",
                    "dest": "/standalone_server.py"
                }
            ],
            "env": {
                "PORT": "5000"
            }
        }
        
        with open('vercel.json', 'w') as f:
            json.dump(config, f, indent=2)
        
        return "Vercel configuration created: vercel.json"
    
    def create_deployment_guide(self):
        """Create deployment guide for all platforms"""
        guide = """# Deployment Guide - Permanent Admin Panel URL

## Choose Your Platform for Permanent URL:

### 1. Railway (Recommended)
- **Permanent URL**: `https://your-app-name.railway.app`
- **Steps**: 
  1. Connect GitHub repo to Railway
  2. Deploy automatically uses railway.json
  3. Get permanent URL immediately

### 2. Render
- **Permanent URL**: `https://your-app-name.onrender.com`
- **Steps**:
  1. Connect repo to Render
  2. Uses render.yaml configuration
  3. Free tier available

### 3. Heroku
- **Permanent URL**: `https://your-app-name.herokuapp.com`
- **Steps**:
  1. `heroku create your-app-name`
  2. `git push heroku main`
  3. Uses Procfile and app.json

### 4. DigitalOcean App Platform
- **Permanent URL**: `https://your-app-name.ondigitalocean.app`
- **Steps**:
  1. Import repo to App Platform
  2. Uses .do/app.yaml configuration
  3. Professional hosting

### 5. Vercel
- **Permanent URL**: `https://your-app-name.vercel.app`
- **Steps**:
  1. Connect repo to Vercel
  2. Uses vercel.json configuration
  3. Edge deployment

## What You Get:
- ✅ Permanent, never-changing URL
- ✅ 24/7 admin panel availability
- ✅ Bot management interface
- ✅ Professional hosting
- ✅ Automatic SSL certificates

## Required Environment Variables:
- `PORT`: 5000 (usually auto-set)
- `BOT_TOKEN`: Your Telegram bot token (set in admin panel)

## After Deployment:
1. Visit your permanent URL
2. Configure bot token in admin panel
3. Start bot via admin interface
4. Manage your 24/7 bot system

Choose any platform above for your permanent admin panel URL!
"""
        
        with open('DEPLOYMENT_GUIDE.md', 'w') as f:
            f.write(guide)
        
        return "Deployment guide created: DEPLOYMENT_GUIDE.md"
    
    def generate_all_configs(self):
        """Generate all deployment configurations"""
        results = []
        
        # Create deployment configurations for all platforms
        for platform, generator in self.platforms.items():
            try:
                result = generator()
                results.append(f"✅ {platform}: {result}")
            except Exception as e:
                results.append(f"❌ {platform}: Error - {e}")
        
        # Create deployment guide
        guide_result = self.create_deployment_guide()
        results.append(f"✅ Guide: {guide_result}")
        
        return results

def main():
    """Generate deployment configurations for permanent URL"""
    print("=== Generating Deployment Configurations ===")
    print("Creating configs for permanent admin panel URL...")
    
    config_generator = DeploymentConfig()
    results = config_generator.generate_all_configs()
    
    print("\nGenerated Configurations:")
    for result in results:
        print(f"  {result}")
    
    print("\n🎉 All deployment configurations ready!")
    print("Choose any platform from DEPLOYMENT_GUIDE.md for your permanent URL")
    
    return True

if __name__ == "__main__":
    main()