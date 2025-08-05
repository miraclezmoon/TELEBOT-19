#!/usr/bin/env python3
"""
Health check script for 24/7 bot deployment
Monitors bot health and provides status endpoint
"""
import os
import time
import json
import logging
from datetime import datetime
from database import Database
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class BotHealthChecker:
    def __init__(self):
        self.db = Database()
        self.health_file = 'bot_health.json'
        
    def check_database_health(self):
        """Check database connectivity and basic operations"""
        try:
            stats = self.db.get_quick_stats()
            return {
                'status': 'healthy',
                'total_users': stats.get('total_users', 0),
                'active_raffles': stats.get('active_raffles', 0),
                'last_check': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'last_check': datetime.now().isoformat()
            }
    
    def check_bot_process(self):
        """Check if bot process is running"""
        try:
            # Check if bot token exists
            if not os.path.exists('bot_token.txt'):
                return {
                    'status': 'not_configured',
                    'message': 'Bot token not configured',
                    'last_check': datetime.now().isoformat()
                }
            
            # Check for bot process
            import subprocess
            result = subprocess.run(['pgrep', '-f', 'run_bot.py'], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                pids = result.stdout.strip().split('\n')
                return {
                    'status': 'running',
                    'process_count': len(pids),
                    'pids': pids,
                    'last_check': datetime.now().isoformat()
                }
            else:
                return {
                    'status': 'stopped',
                    'message': 'Bot process not found',
                    'last_check': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Bot process check failed: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'last_check': datetime.now().isoformat()
            }
    
    def check_admin_panel(self):
        """Check if admin panel is accessible"""
        try:
            import requests
            response = requests.get('http://localhost:5000', timeout=5)
            return {
                'status': 'healthy' if response.status_code == 200 else 'unhealthy',
                'status_code': response.status_code,
                'last_check': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'status': 'unreachable',
                'error': str(e),
                'last_check': datetime.now().isoformat()
            }
    
    def generate_health_report(self):
        """Generate comprehensive health report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'overall_status': 'healthy',
            'components': {
                'database': self.check_database_health(),
                'bot_process': self.check_bot_process(),
                'admin_panel': self.check_admin_panel()
            }
        }
        
        # Determine overall status
        unhealthy_components = [
            name for name, status in report['components'].items()
            if status.get('status') not in ['healthy', 'running']
        ]
        
        if unhealthy_components:
            report['overall_status'] = 'degraded'
            report['unhealthy_components'] = unhealthy_components
        
        # Save to file
        try:
            with open(self.health_file, 'w') as f:
                json.dump(report, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save health report: {e}")
        
        return report
    
    def get_uptime_stats(self):
        """Get system uptime statistics"""
        try:
            # Get system uptime
            with open('/proc/uptime', 'r') as f:
                uptime_seconds = float(f.readline().split()[0])
            
            # Get process uptime (approximate)
            bot_start_time = None
            if os.path.exists('bot_health.json'):
                with open('bot_health.json', 'r') as f:
                    old_data = json.load(f)
                    bot_start_time = old_data.get('bot_start_time')
            
            if not bot_start_time:
                bot_start_time = datetime.now().isoformat()
            
            return {
                'system_uptime_hours': round(uptime_seconds / 3600, 2),
                'bot_start_time': bot_start_time,
                'health_check_time': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to get uptime stats: {e}")
            return {
                'error': str(e),
                'health_check_time': datetime.now().isoformat()
            }

def main():
    """Main health check function"""
    checker = BotHealthChecker()
    
    # Generate health report
    report = checker.generate_health_report()
    
    # Add uptime stats
    report['uptime'] = checker.get_uptime_stats()
    
    # Log status
    logger.info(f"Health check completed - Overall status: {report['overall_status']}")
    
    # Print summary for monitoring
    print(f"=== Bot Health Check - {report['timestamp']} ===")
    print(f"Overall Status: {report['overall_status'].upper()}")
    print(f"Database: {report['components']['database']['status']}")
    print(f"Bot Process: {report['components']['bot_process']['status']}")
    print(f"Admin Panel: {report['components']['admin_panel']['status']}")
    
    if report['overall_status'] != 'healthy':
        print("Issues detected:")
        for component, status in report['components'].items():
            if status.get('status') not in ['healthy', 'running']:
                print(f"  - {component}: {status.get('error', status.get('message', 'Unknown issue'))}")
    
    return report

if __name__ == "__main__":
    main()