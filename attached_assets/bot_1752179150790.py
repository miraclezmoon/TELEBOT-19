import os
import logging
from datetime import datetime, timedelta, date
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from database import Database
from utils import generate_referral_code

# 로깅 설정
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class TelegramBot:
    def __init__(self, database: Database, token: str = ""):
        self.db = database
        self.token = token or os.getenv("TELEGRAM_BOT_TOKEN", "")
        
    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Bot start command handler"""
        logger.info(f"Start command received from user: {update.effective_user.id}")
        user = update.effective_user
        chat_id = update.effective_chat.id
        
        # Register or update user
        self.db.register_user(
            user_id=user.id,
            username=user.username or "",
            full_name=user.full_name,
            chat_id=chat_id
        )
        
        # Process referral code and show appropriate welcome message
        referral_bonus = False
        if context.args:
            referral_code = context.args[0]
            try:
                self.db.process_referral(user.id, referral_code)
                referral_bonus = True
            except Exception as e:
                logger.warning(f"Failed to process referral code {referral_code}: {e}")
        
        # Get user info for reward preview
        user_info = self.db.get_user_info(user.id)
        consecutive_days = self.db.get_consecutive_checkins(user.id)
        current_coins = self.db.get_user_coins(user.id)
        
        # Get settings from database
        settings = self.db.get_settings()
        
        # Calculate potential daily reward
        today = datetime.now().date()
        if self.db.has_daily_checkin(user.id, today):
            daily_button_text = "✅ Daily Check-in (Completed)"
        else:
            base_coin = settings.get('daily_coin_base', 1)  # Default to 1 instead of 10
            # No consecutive bonus - only base coin
            daily_button_text = f"📅 Daily Check-in (+{base_coin} coins)"
        
        # Welcome message with coin preview
        keyboard = [
            [InlineKeyboardButton(daily_button_text, callback_data="daily_checkin")],
            [InlineKeyboardButton("🎰 Join Raffle", callback_data="raffle_list")],
            [InlineKeyboardButton("🛍️ Coin Shop", callback_data="coin_shop")],
            [InlineKeyboardButton(f"👥 Invite Friends (+{settings.get('referral_bonus', 1)} coins each)", callback_data="referral")],
            [InlineKeyboardButton("💰 My Info", callback_data="my_info")]
        ]
        
        # Add invitation code entry option for existing users without referral
        if not user_info.get('referred_by') and not referral_bonus:
            keyboard.append([InlineKeyboardButton(f"🎁 Enter Invitation Code (+{settings.get('referral_bonus', 1)} coins)", callback_data="enter_invite_code")])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        referral_bonus_amount = settings.get('referral_bonus', 1)
        base_daily = settings.get('daily_coin_base', 1)
        
        if referral_bonus:
            welcome_msg = f"""Hello {user.full_name}! Welcome to the Coin Reward System!

🎉 **You've received {referral_bonus_amount} bonus coins for using an invitation code!**

💰 **Current Balance:** {current_coins} coins
🔥 **Consecutive Check-ins:** {consecutive_days} days

**Daily Rewards:**
• Daily check-in: {base_daily} coins (same amount every day)
• Referral bonus: {referral_bonus_amount} coins per friend"""
        else:
            welcome_msg = f"""Hello {user.full_name}! Welcome to the Coin Reward System!

💰 **Current Balance:** {current_coins} coins
🔥 **Consecutive Check-ins:** {consecutive_days} days

**How to Earn Coins:**
• Daily check-in: {base_daily} coins (same amount every day)
• Invite friends: {referral_bonus_amount} coins per referral
• Use invitation codes: {referral_bonus_amount} coins bonus

Click buttons below to start earning!"""
        
        try:
            await update.message.reply_text(welcome_msg, reply_markup=reply_markup)
            logger.info(f"Welcome message sent to user {user.id}")
        except Exception as e:
            logger.error(f"Error sending welcome message: {e}")
            await update.message.reply_text("Hello! Bot has started.")
    
    async def daily_checkin(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Daily check-in handler"""
        query = update.callback_query
        await query.answer()
        
        user_id = query.from_user.id
        today = datetime.now().date()
        
        # Check if already checked in today
        if self.db.has_daily_checkin(user_id, today):
            # Generate monthly calendar to show their progress
            calendar_text = self.generate_monthly_calendar(user_id, today.year, today.month)
            consecutive_days = self.db.get_consecutive_checkins(user_id)
            current_coins = self.db.get_user_coins(user_id)
            
            message = f"""
❌ **Already Checked In Today!**

You've already received your daily coins today. Come back tomorrow for more rewards!

💰 **Current Balance:** {current_coins} coins
🔥 **Consecutive Days:** {consecutive_days} days

{calendar_text}

See you tomorrow for another check-in! 😊
            """
            
            keyboard = [
                [InlineKeyboardButton("📅 View Other Months", callback_data="view_calendar")],
                [InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
            return
        
        # Get settings for coin calculation
        settings = self.db.get_settings()
        
        # Process check-in (this already awards coins in database)
        consecutive_days = self.db.process_daily_checkin(user_id)
        
        # Calculate coins for display (same logic as database)
        base_coin = settings.get('daily_coin_base', 1)
        # No consecutive bonus - only base coin
        total_coin = base_coin
        
        # DON'T award coins again - already done in process_daily_checkin
        
        # Generate monthly calendar
        calendar_text = self.generate_monthly_calendar(user_id, today.year, today.month)
        
        message = f"""
✅ **Check-in Complete!**

🪙 **Coins Earned:** {total_coin} coins
📅 **Consecutive Days:** {consecutive_days} days
💰 **Current Balance:** {self.db.get_user_coins(user_id)} coins

{calendar_text}

Thank you for your daily visit! ✨
        """
        
        keyboard = [
            [InlineKeyboardButton("📅 View Other Months", callback_data="view_calendar")],
            [InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    def generate_monthly_calendar(self, user_id: int, year: int = None, month: int = None) -> str:
        """Generate a clean monthly calendar view"""
        today = datetime.now().date()
        
        if year is None:
            year = today.year
        if month is None:
            month = today.month
        
        # Get check-in dates for the month
        checkin_dates = set(self.db.get_monthly_checkins(user_id, year, month))
        
        # Month names
        month_names = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]
        
        calendar_text = f"📅 **{month_names[month-1]} {year}**\n\n"
        
        # Get first day and days in month
        first_day = datetime(year, month, 1).date()
        if month == 12:
            last_day = datetime(year + 1, 1, 1).date() - timedelta(days=1)
        else:
            last_day = datetime(year, month + 1, 1).date() - timedelta(days=1)
        days_in_month = last_day.day
        
        # Start from Monday (0) to Sunday (6)
        first_weekday = first_day.weekday()
        
        # Calendar header
        calendar_text += "```\n"
        calendar_text += "Mon Tue Wed Thu Fri Sat Sun\n"
        calendar_text += "─" * 27 + "\n"
        
        # Add leading spaces for first week
        week_line = ""
        for i in range(first_weekday):
            week_line += "    "
        
        # Add all days of the month
        for day in range(1, days_in_month + 1):
            current_date = datetime(year, month, day).date()
            
            if current_date in checkin_dates:
                week_line += "✅ "
            elif current_date == today:
                week_line += "📍 "
            elif current_date < today:
                week_line += f"{day:2d} "
            else:
                week_line += "·· "
            
            # New line after Sunday
            if (first_weekday + day) % 7 == 0:
                calendar_text += week_line.rstrip() + "\n"
                week_line = ""
        
        # Add remaining days if any
        if week_line.strip():
            calendar_text += week_line.rstrip() + "\n"
        
        calendar_text += "```\n"
        
        # Month statistics
        monthly_checkins = len(checkin_dates)
        if month == today.month and year == today.year:
            days_so_far = today.day
        elif datetime(year, month, 1).date() < today:
            days_so_far = days_in_month
        else:
            days_so_far = 0
        
        checkin_rate = (monthly_checkins / days_so_far * 100) if days_so_far > 0 else 0
        
        calendar_text += f"📊 **Monthly Stats:**\n"
        calendar_text += f"• Check-ins: {monthly_checkins}/{days_so_far} days\n"
        calendar_text += f"• Success rate: {checkin_rate:.1f}%\n\n"
        calendar_text += "**Legend:**\n"
        calendar_text += "✅ = Checked in  📍 = Today  ·· = Future\n"
        
        return calendar_text
    
    async def view_calendar(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show calendar month selection menu"""
        query = update.callback_query
        await query.answer()
        
        today = datetime.now().date()
        year = today.year
        
        message = f"""
📅 **Calendar View - {year}**

Select a month to view your check-in history:
        """
        
        # Create month selection buttons
        month_names = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]
        
        keyboard = []
        for i in range(0, 12, 3):  # 3 months per row
            row = []
            for j in range(3):
                if i + j < 12:
                    month_num = i + j + 1
                    month_name = month_names[i + j][:3]  # Short name
                    row.append(InlineKeyboardButton(f"{month_name} {year}", callback_data=f"calendar_{year}_{month_num}"))
            keyboard.append(row)
        
        # Add navigation buttons
        keyboard.append([
            InlineKeyboardButton("◀️ Previous Year", callback_data=f"calendar_year_{year-1}"),
            InlineKeyboardButton("Next Year ▶️", callback_data=f"calendar_year_{year+1}")
        ])
        keyboard.append([InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    async def show_calendar_month(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show calendar for specific month"""
        query = update.callback_query
        await query.answer()
        
        # Parse callback data: calendar_year_month
        data_parts = query.data.split('_')
        if len(data_parts) >= 3:
            year = int(data_parts[1])
            month = int(data_parts[2])
        else:
            year = datetime.now().year
            month = datetime.now().month
        
        user_id = query.from_user.id
        calendar_text = self.generate_monthly_calendar(user_id, year, month)
        
        # Navigation buttons
        prev_month = month - 1
        next_month = month + 1
        prev_year = year
        next_year = year
        
        if prev_month == 0:
            prev_month = 12
            prev_year -= 1
        
        if next_month == 13:
            next_month = 1
            next_year += 1
        
        keyboard = [
            [
                InlineKeyboardButton("◀️ Previous", callback_data=f"calendar_{prev_year}_{prev_month}"),
                InlineKeyboardButton("Next ▶️", callback_data=f"calendar_{next_year}_{next_month}")
            ],
            [InlineKeyboardButton("📅 Select Different Month", callback_data="view_calendar")],
            [InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")]
        ]
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(calendar_text, reply_markup=reply_markup, parse_mode='Markdown')
    
    async def show_calendar_year(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show calendar for different year"""
        query = update.callback_query
        await query.answer()
        
        # Parse callback data: calendar_year_YYYY
        data_parts = query.data.split('_')
        if len(data_parts) >= 3:
            year = int(data_parts[2])
        else:
            year = datetime.now().year
        
        message = f"""
📅 **Calendar View - {year}**

Select a month to view your check-in history:
        """
        
        # Create month selection buttons
        month_names = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]
        
        keyboard = []
        for i in range(0, 12, 3):  # 3 months per row
            row = []
            for j in range(3):
                if i + j < 12:
                    month_num = i + j + 1
                    month_name = month_names[i + j][:3]  # Short name
                    row.append(InlineKeyboardButton(f"{month_name} {year}", callback_data=f"calendar_{year}_{month_num}"))
            keyboard.append(row)
        
        # Add navigation buttons
        keyboard.append([
            InlineKeyboardButton("◀️ Previous Year", callback_data=f"calendar_year_{year-1}"),
            InlineKeyboardButton("Next Year ▶️", callback_data=f"calendar_year_{year+1}")
        ])
        keyboard.append([InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    async def raffle_list(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Display raffle list"""
        query = update.callback_query
        await query.answer()
        
        active_raffles = self.db.get_active_raffles()
        
        # Debug logging
        logger.info(f"Found {len(active_raffles)} active raffles")
        for raffle in active_raffles:
            logger.info(f"Raffle: {raffle}")
        
        if not active_raffles:
            keyboard = [[InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                "❌ No active raffles at the moment.\nPlease wait for the admin to add new raffles!",
                reply_markup=reply_markup
            )
            return
        
        message = "🎰 **Active Raffles**\n\n"
        keyboard = []
        
        for raffle in active_raffles:
            message += f"🎁 **{raffle['name']}**\n"
            message += f"💰 Entry Cost: {raffle['entry_cost']} coins\n"
            message += f"🏆 Prize: {raffle['prize']}\n"
            message += f"📅 Ends: {raffle['end_date']}\n\n"
            
            keyboard.append([InlineKeyboardButton(
                f"🎯 Join {raffle['name']}", 
                callback_data=f"join_raffle_{raffle['id']}"
            )])
        
        keyboard.append([InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")])
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    async def join_raffle(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle raffle entry"""
        query = update.callback_query
        await query.answer()
        
        raffle_id = int(query.data.split('_')[2])
        user_id = query.from_user.id
        
        # Get raffle information
        raffle = self.db.get_raffle(raffle_id)
        if not raffle:
            await query.edit_message_text("❌ Raffle not found.")
            return
        
        # Check user coins
        user_coins = self.db.get_user_coins(user_id)
        if user_coins < raffle['entry_cost']:
            message = f"""
❌ **Insufficient coins!**

Required: {raffle['entry_cost']} coins
You have: {user_coins} coins
Missing: {raffle['entry_cost'] - user_coins} coins

Collect coins through daily check-ins!
            """
            
            keyboard = [
                [InlineKeyboardButton("📅 Daily Check-in", callback_data="daily_checkin")],
                [InlineKeyboardButton("🔙 Raffle List", callback_data="raffle_list")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
            return
        
        # Check if already entered
        if self.db.has_raffle_entry(user_id, raffle_id):
            await query.edit_message_text("❌ You have already entered this raffle!")
            return
        
        # Process raffle entry
        self.db.join_raffle(user_id, raffle_id, raffle['entry_cost'])
        
        message = f"""
🎉 **Raffle Entry Complete!**

🎁 Raffle: {raffle['name']}
💰 Coins Used: {raffle['entry_cost']} coins
💰 Remaining: {user_coins - raffle['entry_cost']} coins

Good luck! 🍀
        """
        
        keyboard = [
            [InlineKeyboardButton("🎰 View Other Raffles", callback_data="raffle_list")],
            [InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    async def coin_shop(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Display coin shop"""
        query = update.callback_query
        await query.answer()
        
        products = self.db.get_shop_products()
        user_coins = self.db.get_user_coins(query.from_user.id)
        
        if not products:
            keyboard = [[InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                "🛍️ No products available for sale.\nPlease wait for the admin to add products!",
                reply_markup=reply_markup
            )
            return
        
        message = f"🛍️ **Coin Shop**\n💰 Your Coins: {user_coins} coins\n\n"
        keyboard = []
        
        for product in products:
            status = "✅" if user_coins >= product['price'] else "❌"
            message += f"{status} **{product['name']}**\n"
            message += f"💰 Price: {product['price']} coins\n"
            message += f"📦 Stock: {product['stock']} items\n"
            message += f"📝 {product['description']}\n\n"
            
            if user_coins >= product['price'] and product['stock'] > 0:
                keyboard.append([InlineKeyboardButton(
                    f"🛒 Buy {product['name']}", 
                    callback_data=f"buy_product_{product['id']}"
                )])
        
        keyboard.append([InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")])
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    async def buy_product(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle product purchase"""
        query = update.callback_query
        await query.answer()
        
        product_id = int(query.data.split('_')[2])
        user_id = query.from_user.id
        
        # Get product information
        product = self.db.get_product(product_id)
        if not product:
            await query.edit_message_text("❌ Product not found.")
            return
        
        # Process purchase
        result = self.db.purchase_product(user_id, product_id)
        
        if result['success']:
            message = f"""
✅ **Purchase Complete!**

🛒 Product: {product['name']}
💰 Coins Used: {product['price']} coins
💰 Remaining: {result['remaining_coins']} coins

Thank you for your purchase! 🎉
            """
        else:
            message = f"❌ Purchase failed: {result['error']}"
        
        keyboard = [
            [InlineKeyboardButton("🛍️ Continue Shopping", callback_data="coin_shop")],
            [InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    async def referral(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Referral system"""
        query = update.callback_query
        await query.answer()
        
        user_id = query.from_user.id
        user_info = self.db.get_user_info(user_id)
        
        # Generate referral code if not exists
        if not user_info['referral_code']:
            referral_code = generate_referral_code()
            self.db.set_referral_code(user_id, referral_code)
            user_info['referral_code'] = referral_code
        
        # Referral statistics and settings
        referral_stats = self.db.get_referral_stats(user_id)
        settings = self.db.get_settings()
        referral_bonus = settings.get('referral_bonus', 1)
        
        message = f"""
👥 **Friend Invitation System**

🔗 **Your Invitation Code:** `{user_info['referral_code']}`

📊 **Invitation Status:**
• Total Friends Invited: {referral_stats['total_referrals']} people
• Bonus Coins Earned: {referral_stats['total_bonus']} coins

💰 **Reward System:**
• When friend joins: {referral_bonus} coins
• Friend gets bonus: {referral_bonus} coins

📤 **How to Invite:**
1. Share the link below with friends
2. Friend starts bot using the link
3. Rewards are automatically given!

🔗 **Invitation Link:**
`https://t.me/{context.bot.username}?start={user_info['referral_code']}`
        """
        
        keyboard = []
        
        # Add invitation code entry option if user hasn't been referred
        if not user_info.get('referred_by'):
            keyboard.append([InlineKeyboardButton("🎁 Enter Invitation Code", callback_data="enter_invite_code")])
        
        keyboard.append([InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")])
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    async def my_info(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Display user information"""
        query = update.callback_query
        await query.answer()
        
        user_id = query.from_user.id
        user_info = self.db.get_user_info(user_id)
        referral_stats = self.db.get_referral_stats(user_id)
        
        # Calculate consecutive check-ins
        consecutive_days = self.db.get_consecutive_checkins(user_id)
        
        message = f"""
👤 **My Profile**

📝 **Basic Information:**
• Name: {query.from_user.full_name}
• Joined: {user_info['joined_date']}

💰 **Coin Information:**
• Current Coins: {user_info['coins']} coins
• Total Earned: {user_info['total_earned']} coins

📅 **Check-in Information:**
• Consecutive Days: {consecutive_days} days
• Total Check-ins: {user_info['total_checkins']} days

👥 **Referral Information:**
• Friends Invited: {referral_stats['total_referrals']} people
• Referral Bonus: {referral_stats['total_bonus']} coins

🎰 **Raffle Information:**
• Raffles Entered: {user_info['raffle_entries']} times
• Wins: {user_info['raffle_wins']} times
        """
        
        keyboard = [[InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    async def main_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Return to main menu"""
        query = update.callback_query
        await query.answer()
        
        user_id = query.from_user.id
        
        # Get user info for reward preview
        user_info = self.db.get_user_info(user_id)
        consecutive_days = self.db.get_consecutive_checkins(user_id)
        current_coins = self.db.get_user_coins(user_id)
        
        # Get settings from database
        settings = self.db.get_settings()
        
        # Calculate potential daily reward
        today = datetime.now().date()
        if self.db.has_daily_checkin(user_id, today):
            daily_button_text = "✅ Daily Check-in (Completed)"
        else:
            base_coin = settings.get('daily_coin_base', 1)
            # No consecutive bonus - only base coin
            daily_button_text = f"📅 Daily Check-in (+{base_coin} coins)"
        
        referral_bonus_amount = settings.get('referral_bonus', 1)
        base_daily = settings.get('daily_coin_base', 1)
        
        keyboard = [
            [InlineKeyboardButton(daily_button_text, callback_data="daily_checkin")],
            [InlineKeyboardButton("🎰 Join Raffle", callback_data="raffle_list")],
            [InlineKeyboardButton("🛍️ Coin Shop", callback_data="coin_shop")],
            [InlineKeyboardButton(f"👥 Invite Friends (+{referral_bonus_amount} coins each)", callback_data="referral")],
            [InlineKeyboardButton("💰 My Info", callback_data="my_info")]
        ]
        
        # Add invitation code entry option for existing users without referral
        if not user_info.get('referred_by'):
            keyboard.append([InlineKeyboardButton(f"🎁 Enter Invitation Code (+{referral_bonus_amount} coins)", callback_data="enter_invite_code")])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        message = f"""🪙 **Coin Reward System**

💰 **Your Balance:** {current_coins} coins
🔥 **Consecutive Days:** {consecutive_days} days

**How to Earn More Coins:**
• Daily check-in: {base_daily} coins (same amount every day)
• Invite friends: {referral_bonus_amount} coins per referral
• Use invitation codes: {referral_bonus_amount} coins bonus

Choose an option below:"""
        
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    async def enter_invite_code(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle invitation code entry"""
        query = update.callback_query
        await query.answer()
        
        # Get settings for bonus amount
        settings = self.db.get_settings()
        referral_bonus = settings.get('referral_bonus', 1)
        
        message = f"""
🎁 **Enter Invitation Code**

Do you have an invitation code from a friend?

Please send the invitation code as a message.
For example, if your friend gave you code "ABC123", just type:

`ABC123`

After sending the code, you'll receive **{referral_bonus} bonus coins** if the code is valid!
        """
        
        keyboard = [[InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='Markdown')
        
        # Store that user is expecting invitation code input
        context.user_data['expecting_invite_code'] = True
    
    async def handle_text_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle text messages including invitation codes"""
        user_id = update.effective_user.id
        message_text = update.message.text.strip()
        
        # Check if user is expecting an invitation code
        if context.user_data.get('expecting_invite_code'):
            invitation_code = message_text.upper()
            
            try:
                # Process the invitation code
                self.db.process_referral(user_id, invitation_code)
                
                # Get settings for bonus amount
                settings = self.db.get_settings()
                referral_bonus = settings.get('referral_bonus', 1)
                
                message = f"""
✅ **Invitation Code Accepted!**

You have successfully used the invitation code: `{invitation_code}`

🎉 You've received {referral_bonus} bonus coins!
💰 Your friend also gets {referral_bonus} coins!

Thank you for joining through a friend's invitation!
                """
                
                keyboard = [
                    [InlineKeyboardButton("💰 Check My Info", callback_data="my_info")],
                    [InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")]
                ]
                
            except Exception as e:
                message = f"""
❌ **Invalid Invitation Code**

The code `{invitation_code}` is not valid.

Please check:
• The code is typed correctly
• The code hasn't been used before
• The code exists in our system

Try again or ask your friend for the correct code.
                """
                
                keyboard = [
                    [InlineKeyboardButton("🎁 Try Again", callback_data="enter_invite_code")],
                    [InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")]
                ]
            
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.message.reply_text(message, reply_markup=reply_markup, parse_mode='Markdown')
            
            # Clear the expectation flag
            context.user_data['expecting_invite_code'] = False
            
        else:
            # Handle general text messages - could be invitation code without pressing button
            if len(message_text) >= 6 and message_text.replace('_', '').isalnum():
                # Looks like it could be an invitation code
                invitation_code = message_text.upper()
                
                try:
                    # Try to process it as an invitation code
                    self.db.process_referral(user_id, invitation_code)
                    
                    # Get settings for bonus amount
                    settings = self.db.get_settings()
                    referral_bonus = settings.get('referral_bonus', 1)
                    
                    message = f"""
✅ **Invitation Code Accepted!**

You have successfully used the invitation code: `{invitation_code}`

🎉 You've received {referral_bonus} bonus coins!
💰 Your friend also gets {referral_bonus} coins!

Thank you for joining through a friend's invitation!
                    """
                    
                    keyboard = [
                        [InlineKeyboardButton("💰 Check My Info", callback_data="my_info")],
                        [InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")]
                    ]
                    
                    reply_markup = InlineKeyboardMarkup(keyboard)
                    await update.message.reply_text(message, reply_markup=reply_markup, parse_mode='Markdown')
                    
                except Exception:
                    # If it's not a valid invitation code, provide helpful message
                    message = """
💬 **Hello!**

I received your message. If you're trying to enter an invitation code, please:

1. Click "🎁 Invite Friends" in the main menu
2. Then click "🎁 Enter Invitation Code"
3. Type your code when prompted

Or you can send me your invitation code directly - just type it as a message!
                    """
                    
                    keyboard = [
                        [InlineKeyboardButton("🎁 Enter Invitation Code", callback_data="enter_invite_code")],
                        [InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")]
                    ]
                    
                    reply_markup = InlineKeyboardMarkup(keyboard)
                    await update.message.reply_text(message, reply_markup=reply_markup, parse_mode='Markdown')
            else:
                # General help message for other text
                message = """
💬 **Hello!**

I received your message. Here are some things you can do:

• Use the menu buttons to navigate
• Enter invitation codes to get bonus coins
• Complete daily check-ins to earn coins
• Join raffles and buy products in the coin shop

Use the buttons below to get started!
                """
                
                keyboard = [
                    [InlineKeyboardButton("🎁 Enter Invitation Code", callback_data="enter_invite_code")],
                    [InlineKeyboardButton("🔙 Main Menu", callback_data="main_menu")]
                ]
                
                reply_markup = InlineKeyboardMarkup(keyboard)
                await update.message.reply_text(message, reply_markup=reply_markup, parse_mode='Markdown')
    
    def run(self):
        """Run the bot"""
        if not self.token:
            raise ValueError("TELEGRAM_BOT_TOKEN is not set.")
        
        logger.info(f"Starting bot... Token: {self.token[:10]}...")
        
        # Delete webhook (for polling mode)
        import requests
        try:
            response = requests.post(f"https://api.telegram.org/bot{self.token}/deleteWebhook")
            logger.info(f"Webhook deletion: {response.json()}")
        except Exception as e:
            logger.warning(f"Webhook deletion failed: {e}")
        
        # Create application
        application = Application.builder().token(self.token).build()
        
        # Register handlers
        from telegram.ext import MessageHandler, filters
        
        application.add_handler(CommandHandler("start", self.start))
        application.add_handler(CallbackQueryHandler(self.daily_checkin, pattern="^daily_checkin$"))
        application.add_handler(CallbackQueryHandler(self.view_calendar, pattern="^view_calendar$"))
        application.add_handler(CallbackQueryHandler(self.show_calendar_month, pattern="^calendar_[0-9]+_[0-9]+$"))
        application.add_handler(CallbackQueryHandler(self.show_calendar_year, pattern="^calendar_year_[0-9]+$"))
        application.add_handler(CallbackQueryHandler(self.raffle_list, pattern="^raffle_list$"))
        application.add_handler(CallbackQueryHandler(self.join_raffle, pattern="^join_raffle_"))
        application.add_handler(CallbackQueryHandler(self.coin_shop, pattern="^coin_shop$"))
        application.add_handler(CallbackQueryHandler(self.buy_product, pattern="^buy_product_"))
        application.add_handler(CallbackQueryHandler(self.referral, pattern="^referral$"))
        application.add_handler(CallbackQueryHandler(self.my_info, pattern="^my_info$"))
        application.add_handler(CallbackQueryHandler(self.enter_invite_code, pattern="^enter_invite_code$"))
        application.add_handler(CallbackQueryHandler(self.main_menu, pattern="^main_menu$"))
        application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_text_message))
        
        logger.info("Handler registration complete. Starting polling...")
        
        # Run bot
        try:
            # Delete webhook settings and start in polling mode
            application.run_polling(drop_pending_updates=True)
        except Exception as e:
            logger.error(f"Bot polling error: {e}")
            raise
