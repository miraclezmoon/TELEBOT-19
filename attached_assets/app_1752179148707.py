import streamlit as st
import subprocess
import os
import signal
import logging
from admin_panel import AdminPanel
from database import Database

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Page configuration
st.set_page_config(
    page_title="Coin Reward System Admin",
    page_icon="🪙",
    layout="wide"
)

# 세션 상태 초기화
if 'bot_running' not in st.session_state:
    st.session_state.bot_running = False
if 'bot_process' not in st.session_state:
    st.session_state.bot_process = None
if 'db' not in st.session_state:
    st.session_state.db = Database()
if 'admin_panel' not in st.session_state:
    st.session_state.admin_panel = AdminPanel(st.session_state.db)

def start_bot_process():
    """Start bot in separate process"""
    try:
        # Get bot token from multiple sources
        bot_token = (
            st.session_state.get('bot_token', '') or 
            os.environ.get('BOT_TOKEN', '') or 
            st.session_state.db.get_settings().get('bot_token', '')
        )
        
        if not bot_token:
            st.error("No bot token found. Please enter token or set BOT_TOKEN environment variable.")
            return False
        
        # Save token to file for bot process
        with open('bot_token.txt', 'w') as f:
            f.write(bot_token)
        
        # Set environment variable for bot process
        env = os.environ.copy()
        env['BOT_TOKEN'] = bot_token
        
        # Run bot in separate process
        process = subprocess.Popen(['python', 'run_bot.py'], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE,
                                 env=env)
        st.session_state.bot_process = process
        return True
    except Exception as e:
        st.error(f"Error starting bot: {e}")
        return False

def stop_bot_process():
    """Stop bot process"""
    if st.session_state.bot_process:
        try:
            st.session_state.bot_process.terminate()
            st.session_state.bot_process = None
            # Remove token file
            if os.path.exists('bot_token.txt'):
                os.remove('bot_token.txt')
            return True
        except Exception as e:
            st.error(f"Error stopping bot: {e}")
            return False
    return True

def main():
    st.title("🪙 Coin Reward System Admin Panel")
    
    # Sidebar for bot status management
    with st.sidebar:
        st.header("🤖 Bot Management")
        
        # Bot token input - check environment variable first
        default_token = os.environ.get('BOT_TOKEN', st.session_state.get('bot_token', ''))
        bot_token = st.text_input(
            "Telegram Bot Token", 
            type="password",
            value=default_token,
            help="Enter the bot token received from @BotFather or set BOT_TOKEN environment variable"
        )
        
        if bot_token:
            st.session_state.bot_token = bot_token
            # Also try to save to settings for persistence
            try:
                current_settings = st.session_state.db.get_settings()
                current_settings['bot_token'] = bot_token
                st.session_state.db.save_settings(current_settings)
            except Exception as e:
                logger.warning(f"Could not save bot token to settings: {e}")
            
            # Token verification button
            if st.button("🔍 Verify Token"):
                import requests
                try:
                    response = requests.get(f"https://api.telegram.org/bot{bot_token}/getMe", timeout=10)
                    if response.status_code == 200:
                        bot_info = response.json()
                        if bot_info['ok']:
                            st.success(f"✅ Valid token: @{bot_info['result']['username']}")
                        else:
                            st.error("❌ Invalid token")
                    else:
                        st.error("❌ Token verification failed")
                except Exception as e:
                    st.error(f"❌ Error verifying token: {e}")
        
        # Bot start/stop buttons
        col1, col2 = st.columns(2)
        
        with col1:
            if st.button("🚀 Start Bot", disabled=st.session_state.bot_running):
                if bot_token:
                    # Token format validation
                    if ":" not in bot_token or len(bot_token) < 40:
                        st.error("Invalid bot token format. Format: 123456789:ABCdefGhI...")
                    else:
                        if start_bot_process():
                            st.session_state.bot_running = True
                            st.success(f"Bot started! Token: {bot_token[:10]}...")
                            st.rerun()
                else:
                    st.error("Please enter a bot token!")
        
        with col2:
            if st.button("⏹️ Stop Bot", disabled=not st.session_state.bot_running):
                if stop_bot_process():
                    st.session_state.bot_running = False
                    st.warning("Bot stopped!")
                    st.rerun()
        
        # Bot status display
        if st.session_state.bot_running:
            st.success("🟢 Bot Running")
        else:
            st.error("🔴 Bot Stopped")
        
        st.divider()
        
        # Quick statistics
        st.header("📊 Quick Stats")
        try:
            stats = st.session_state.db.get_quick_stats()
            st.metric("Total Users", stats['total_users'])
            st.metric("Today Logins", stats['today_logins'])
            st.metric("Active Raffles", stats['active_raffles'])
        except Exception as e:
            st.error(f"Error loading stats: {e}")
    
    # Main panel
    st.session_state.admin_panel.render()

if __name__ == "__main__":
    main()
