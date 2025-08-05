#!/usr/bin/env python3
"""
Production deployment script for permanent admin panel URL
Starts both Streamlit admin panel and bot keep-alive system
"""
import os
import sys
import time
import logging
import subprocess
import signal
from threading import Thread

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ProductionDeployment:
    def __init__(self):
        self.streamlit_process = None
        self.keepalive_process = None
        self.running = True
        
    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, shutting down production deployment...")
        self.running = False
        self.stop_all_processes()
        sys.exit(0)
    
    def start_streamlit(self):
        """Start Streamlit admin panel"""
        try:
            logger.info("Starting Streamlit admin panel...")
            env = os.environ.copy()
            env['STREAMLIT_SERVER_HEADLESS'] = 'true'
            env['STREAMLIT_SERVER_PORT'] = '5000'
            env['STREAMLIT_SERVER_ADDRESS'] = '0.0.0.0'
            
            self.streamlit_process = subprocess.Popen([
                'streamlit', 'run', 'app.py', 
                '--server.port', '5000',
                '--server.address', '0.0.0.0',
                '--server.headless', 'true'
            ], env=env)
            
            logger.info(f"Streamlit started with PID: {self.streamlit_process.pid}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start Streamlit: {e}")
            return False
    
    def start_keepalive(self):
        """Start bot keep-alive system"""
        try:
            logger.info("Starting bot keep-alive system...")
            self.keepalive_process = subprocess.Popen(['python', 'keep_alive.py'])
            logger.info(f"Keep-alive started with PID: {self.keepalive_process.pid}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start keep-alive: {e}")
            return False
    
    def monitor_processes(self):
        """Monitor both processes and restart if needed"""
        while self.running:
            try:
                # Check Streamlit
                if self.streamlit_process and self.streamlit_process.poll() is not None:
                    logger.warning("Streamlit process stopped, restarting...")
                    self.start_streamlit()
                
                # Check keep-alive
                if self.keepalive_process and self.keepalive_process.poll() is not None:
                    logger.warning("Keep-alive process stopped, restarting...")
                    self.start_keepalive()
                
                time.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error monitoring processes: {e}")
                time.sleep(30)
    
    def stop_all_processes(self):
        """Stop all processes"""
        if self.streamlit_process:
            try:
                self.streamlit_process.terminate()
                self.streamlit_process.wait(timeout=10)
            except:
                self.streamlit_process.kill()
        
        if self.keepalive_process:
            try:
                self.keepalive_process.terminate()
                self.keepalive_process.wait(timeout=10)
            except:
                self.keepalive_process.kill()
    
    def run_production(self):
        """Run production deployment"""
        logger.info("=== Starting Production Deployment ===")
        logger.info("This will provide a permanent admin panel URL")
        
        # Register signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        # Start both services
        if not self.start_streamlit():
            logger.error("Failed to start Streamlit")
            return False
        
        # Wait for Streamlit to be ready
        time.sleep(5)
        
        if not self.start_keepalive():
            logger.error("Failed to start keep-alive")
            return False
        
        logger.info("=== Production Deployment Ready ===")
        logger.info("Admin panel accessible on port 5000")
        logger.info("Bot keep-alive system monitoring bot health")
        logger.info("Both services will auto-restart if needed")
        
        # Monitor processes
        self.monitor_processes()
        
        return True

def main():
    """Main production deployment function"""
    deployment = ProductionDeployment()
    
    try:
        success = deployment.run_production()
        if not success:
            logger.error("Production deployment failed")
            sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Deployment stopped by user")
    except Exception as e:
        logger.error(f"Production deployment error: {e}")
        sys.exit(1)
    finally:
        deployment.stop_all_processes()

if __name__ == "__main__":
    main()