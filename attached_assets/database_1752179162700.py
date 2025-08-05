import sqlite3
import threading
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
import json

class Database:
    def __init__(self, db_path: str = "coin_reward_system.db"):
        self.db_path = db_path
        self.lock = threading.Lock()
        self.init_database()
    
    def init_database(self):
        """데이터베이스 초기화"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 사용자 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER UNIQUE NOT NULL,
                    username TEXT,
                    full_name TEXT NOT NULL,
                    chat_id INTEGER,
                    coins INTEGER DEFAULT 0,
                    total_earned INTEGER DEFAULT 0,
                    referral_code TEXT UNIQUE,
                    referred_by INTEGER,
                    joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_checkin DATE,
                    consecutive_checkins INTEGER DEFAULT 0,
                    total_checkins INTEGER DEFAULT 0,
                    raffle_entries INTEGER DEFAULT 0,
                    raffle_wins INTEGER DEFAULT 0
                )
            """)
            
            # 데일리 체크인 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS daily_checkins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    checkin_date DATE NOT NULL,
                    coins_earned INTEGER NOT NULL,
                    consecutive_days INTEGER NOT NULL,
                    UNIQUE(user_id, checkin_date),
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            """)
            
            # 래플 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS raffles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    prize TEXT NOT NULL,
                    entry_cost INTEGER NOT NULL,
                    max_entries INTEGER,
                    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    end_date TIMESTAMP NOT NULL,
                    winner_id INTEGER,
                    status TEXT DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 래플 참여 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS raffle_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    raffle_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    entry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    coins_spent INTEGER NOT NULL,
                    UNIQUE(raffle_id, user_id),
                    FOREIGN KEY (raffle_id) REFERENCES raffles (id),
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            """)
            
            # 상품 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    price INTEGER NOT NULL,
                    stock INTEGER NOT NULL,
                    category TEXT,
                    image_url TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 구매 내역 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS purchases (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    coins_spent INTEGER NOT NULL,
                    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'completed',
                    FOREIGN KEY (user_id) REFERENCES users (user_id),
                    FOREIGN KEY (product_id) REFERENCES products (id)
                )
            """)
            
            # 추천 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS referrals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    referrer_id INTEGER NOT NULL,
                    referee_id INTEGER NOT NULL,
                    referral_code TEXT NOT NULL,
                    bonus_coins INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (referrer_id) REFERENCES users (user_id),
                    FOREIGN KEY (referee_id) REFERENCES users (user_id)
                )
            """)
            
            # 코인 거래 내역 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS coin_transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    amount INTEGER NOT NULL,
                    transaction_type TEXT NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            """)
            
            conn.commit()
            conn.close()
    
    def register_user(self, user_id: int, username: str, full_name: str, chat_id: int):
        """사용자 등록 또는 업데이트"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO users 
                    (user_id, username, full_name, chat_id)
                    VALUES (?, ?, ?, ?)
                """, (user_id, username, full_name, chat_id))
                conn.commit()
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()
    
    def has_daily_checkin(self, user_id: int, date: date) -> bool:
        """특정 날짜에 체크인했는지 확인"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT COUNT(*) FROM daily_checkins 
                WHERE user_id = ? AND checkin_date = ?
            """, (user_id, date))
            
            result = cursor.fetchone()[0] > 0
            conn.close()
            return result
    
    def process_daily_checkin(self, user_id: int) -> int:
        """데일리 체크인 처리"""
        # Get settings OUTSIDE the lock to avoid deadlock
        settings = self.get_settings()
        base_coin = settings.get('daily_coin_base', 1)
        # No consecutive bonus - only base coin
        total_coin = base_coin
        
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            try:
                today = datetime.now().date()
                yesterday = today - timedelta(days=1)
                
                # 어제 체크인했는지 확인
                cursor.execute("""
                    SELECT consecutive_checkins FROM users 
                    WHERE user_id = ?
                """, (user_id,))
                
                user_data = cursor.fetchone()
                if not user_data:
                    consecutive_days = 1
                else:
                    # 어제 체크인 확인
                    cursor.execute("""
                        SELECT COUNT(*) FROM daily_checkins 
                        WHERE user_id = ? AND checkin_date = ?
                    """, (user_id, yesterday))
                    
                    if cursor.fetchone()[0] > 0:
                        consecutive_days = user_data[0] + 1
                    else:
                        consecutive_days = 1
                
                cursor.execute("""
                    INSERT INTO daily_checkins 
                    (user_id, checkin_date, coins_earned, consecutive_days)
                    VALUES (?, ?, ?, ?)
                """, (user_id, today, total_coin, consecutive_days))
                
                # 사용자 정보 업데이트
                cursor.execute("""
                    UPDATE users SET 
                        last_checkin = ?,
                        consecutive_checkins = ?,
                        total_checkins = total_checkins + 1
                    WHERE user_id = ?
                """, (today, consecutive_days, user_id))
                
                # 사용자 코인 잔액 업데이트
                cursor.execute("""
                    UPDATE users SET 
                        coins = coins + ?,
                        total_earned = total_earned + ?
                    WHERE user_id = ?
                """, (total_coin, total_coin, user_id))
                
                # 코인 거래 기록
                cursor.execute("""
                    INSERT INTO coin_transactions 
                    (user_id, amount, transaction_type, description)
                    VALUES (?, ?, 'earn', ?)
                """, (user_id, total_coin, f"데일리 체크인 (연속 {consecutive_days}일)"))
                
                conn.commit()
                return total_coin
                
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()
    
    def add_coins(self, user_id: int, amount: int):
        """코인 추가"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            try:
                cursor.execute("""
                    UPDATE users SET 
                        coins = coins + ?,
                        total_earned = total_earned + ?
                    WHERE user_id = ?
                """, (amount, amount, user_id))
                conn.commit()
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()
    
    def get_user_coins(self, user_id: int) -> int:
        """사용자 코인 조회"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT coins FROM users WHERE user_id = ?", (user_id,))
            result = cursor.fetchone()
            conn.close()
            
            return result[0] if result else 0
    
    def get_monthly_checkins(self, user_id: int, year: int, month: int) -> List[date]:
        """월별 체크인 기록 조회"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT checkin_date FROM daily_checkins 
                WHERE user_id = ? AND strftime('%Y-%m', checkin_date) = ?
                ORDER BY checkin_date
            """, (user_id, f"{year:04d}-{month:02d}"))
            
            results = cursor.fetchall()
            conn.close()
            
            return [datetime.strptime(row[0], '%Y-%m-%d').date() for row in results]
    
    def get_active_raffles(self) -> List[Dict[str, Any]]:
        """활성 래플 목록 조회"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, name, description, prize, entry_cost, end_date
                FROM raffles 
                WHERE status = 'active' AND end_date > datetime('now')
                ORDER BY end_date ASC
            """)
            
            results = cursor.fetchall()
            conn.close()
            
            raffles = []
            for row in results:
                raffles.append({
                    'id': row[0],
                    'name': row[1],
                    'description': row[2],
                    'prize': row[3],
                    'entry_cost': row[4],
                    'end_date': row[5]
                })
            
            return raffles
    
    def get_raffle(self, raffle_id: int) -> Optional[Dict[str, Any]]:
        """특정 래플 정보 조회"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, name, description, prize, entry_cost, end_date, status
                FROM raffles WHERE id = ?
            """, (raffle_id,))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                return {
                    'id': result[0],
                    'name': result[1],
                    'description': result[2],
                    'prize': result[3],
                    'entry_cost': result[4],
                    'end_date': result[5],
                    'status': result[6]
                }
            return None
    
    def has_raffle_entry(self, user_id: int, raffle_id: int) -> bool:
        """래플 참여 여부 확인"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT COUNT(*) FROM raffle_entries 
                WHERE user_id = ? AND raffle_id = ?
            """, (user_id, raffle_id))
            
            result = cursor.fetchone()[0] > 0
            conn.close()
            return result
    
    def join_raffle(self, user_id: int, raffle_id: int, entry_cost: int):
        """래플 참여"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            try:
                # 래플 참여 기록
                cursor.execute("""
                    INSERT INTO raffle_entries (raffle_id, user_id, coins_spent)
                    VALUES (?, ?, ?)
                """, (raffle_id, user_id, entry_cost))
                
                # 코인 차감
                cursor.execute("""
                    UPDATE users SET coins = coins - ?, raffle_entries = raffle_entries + 1
                    WHERE user_id = ?
                """, (entry_cost, user_id))
                
                # 코인 거래 기록
                cursor.execute("""
                    INSERT INTO coin_transactions 
                    (user_id, amount, transaction_type, description)
                    VALUES (?, ?, 'spend', ?)
                """, (user_id, -entry_cost, f"래플 참여 (ID: {raffle_id})"))
                
                conn.commit()
                
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()
    
    def get_shop_products(self) -> List[Dict[str, Any]]:
        """상품 목록 조회"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, name, description, price, stock, category
                FROM products 
                WHERE is_active = 1 AND stock > 0
                ORDER BY category, price
            """)
            
            results = cursor.fetchall()
            conn.close()
            
            products = []
            for row in results:
                products.append({
                    'id': row[0],
                    'name': row[1],
                    'description': row[2],
                    'price': row[3],
                    'stock': row[4],
                    'category': row[5]
                })
            
            return products
    
    def get_product(self, product_id: int) -> Optional[Dict[str, Any]]:
        """특정 상품 정보 조회"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, name, description, price, stock, category
                FROM products WHERE id = ? AND is_active = 1
            """, (product_id,))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                return {
                    'id': result[0],
                    'name': result[1],
                    'description': result[2],
                    'price': result[3],
                    'stock': result[4],
                    'category': result[5]
                }
            return None
    
    def purchase_product(self, user_id: int, product_id: int) -> Dict[str, Any]:
        """상품 구매"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            try:
                # 상품 정보 조회
                cursor.execute("""
                    SELECT price, stock FROM products 
                    WHERE id = ? AND is_active = 1
                """, (product_id,))
                
                product_info = cursor.fetchone()
                if not product_info:
                    return {'success': False, 'error': '상품을 찾을 수 없습니다.'}
                
                price, stock = product_info
                
                if stock <= 0:
                    return {'success': False, 'error': '재고가 부족합니다.'}
                
                # 사용자 코인 확인
                cursor.execute("SELECT coins FROM users WHERE user_id = ?", (user_id,))
                user_coins = cursor.fetchone()
                
                if not user_coins or user_coins[0] < price:
                    return {'success': False, 'error': '코인이 부족합니다.'}
                
                # 구매 처리
                cursor.execute("""
                    INSERT INTO purchases (user_id, product_id, coins_spent)
                    VALUES (?, ?, ?)
                """, (user_id, product_id, price))
                
                # 코인 차감
                cursor.execute("""
                    UPDATE users SET coins = coins - ?
                    WHERE user_id = ?
                """, (price, user_id))
                
                # 재고 차감
                cursor.execute("""
                    UPDATE products SET stock = stock - 1
                    WHERE id = ?
                """, (product_id,))
                
                # 코인 거래 기록
                cursor.execute("""
                    INSERT INTO coin_transactions 
                    (user_id, amount, transaction_type, description)
                    VALUES (?, ?, 'spend', ?)
                """, (user_id, -price, f"상품 구매 (ID: {product_id})"))
                
                remaining_coins = user_coins[0] - price
                
                conn.commit()
                return {'success': True, 'remaining_coins': remaining_coins}
                
            except Exception as e:
                conn.rollback()
                return {'success': False, 'error': str(e)}
            finally:
                conn.close()
    
    def get_user_info(self, user_id: int) -> Dict[str, Any]:
        """사용자 정보 조회"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT user_id, username, full_name, coins, total_earned, 
                       referral_code, joined_date, consecutive_checkins, 
                       total_checkins, raffle_entries, raffle_wins
                FROM users WHERE user_id = ?
            """, (user_id,))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                return {
                    'user_id': result[0],
                    'username': result[1],
                    'full_name': result[2],
                    'coins': result[3],
                    'total_earned': result[4],
                    'referral_code': result[5],
                    'joined_date': result[6],
                    'consecutive_checkins': result[7],
                    'total_checkins': result[8],
                    'raffle_entries': result[9],
                    'raffle_wins': result[10]
                }
            return {}
    
    def set_referral_code(self, user_id: int, referral_code: str):
        """추천 코드 설정"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE users SET referral_code = ? WHERE user_id = ?
            """, (referral_code, user_id))
            
            conn.commit()
            conn.close()
    
    def process_referral(self, new_user_id: int, referral_code: str):
        """추천 처리"""
        # Get settings OUTSIDE the lock to avoid deadlock
        settings = self.get_settings()
        referral_bonus = settings.get('referral_bonus', 1)
        
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            try:
                # 추천인 찾기
                cursor.execute("""
                    SELECT user_id FROM users WHERE referral_code = ?
                """, (referral_code,))
                
                referrer = cursor.fetchone()
                if not referrer:
                    return False
                
                referrer_id = referrer[0]
                
                # 자신을 추천할 수 없음
                if referrer_id == new_user_id:
                    return False
                
                # 이미 추천된 사용자인지 확인
                cursor.execute("""
                    SELECT COUNT(*) FROM referrals WHERE referee_id = ?
                """, (new_user_id,))
                
                if cursor.fetchone()[0] > 0:
                    return False
                
                # 추천 기록 추가
                cursor.execute("""
                    INSERT INTO referrals (referrer_id, referee_id, referral_code, bonus_coins)
                    VALUES (?, ?, ?, ?)
                """, (referrer_id, new_user_id, referral_code, referral_bonus))
                
                # 추천인에게 보너스 코인 지급
                cursor.execute("""
                    UPDATE users SET 
                        coins = coins + ?,
                        total_earned = total_earned + ?
                    WHERE user_id = ?
                """, (referral_bonus, referral_bonus, referrer_id))
                
                # 신규 사용자에게도 보너스 지급 (invitation code bonus)
                cursor.execute("""
                    UPDATE users SET 
                        coins = coins + ?,
                        total_earned = total_earned + ?,
                        referred_by = ?
                    WHERE user_id = ?
                """, (referral_bonus, referral_bonus, referrer_id, new_user_id))
                
                # 코인 거래 기록 (referrer)
                cursor.execute("""
                    INSERT INTO coin_transactions 
                    (user_id, amount, transaction_type, description)
                    VALUES (?, ?, 'earn', ?)
                """, (referrer_id, referral_bonus, "Friend referral bonus"))
                
                # 코인 거래 기록 (new user)
                cursor.execute("""
                    INSERT INTO coin_transactions 
                    (user_id, amount, transaction_type, description)
                    VALUES (?, ?, 'earn', ?)
                """, (new_user_id, referral_bonus, "Invitation code bonus"))
                
                conn.commit()
                return True
                
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()
    
    def get_referral_stats(self, user_id: int) -> Dict[str, int]:
        """추천 통계 조회"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT COUNT(*), COALESCE(SUM(bonus_coins), 0)
                FROM referrals WHERE referrer_id = ?
            """, (user_id,))
            
            result = cursor.fetchone()
            conn.close()
            
            return {
                'total_referrals': result[0] if result else 0,
                'total_bonus': result[1] if result else 0
            }
    
    def get_consecutive_checkins(self, user_id: int) -> int:
        """연속 체크인 일수 조회"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT consecutive_checkins FROM users WHERE user_id = ?
            """, (user_id,))
            
            result = cursor.fetchone()
            conn.close()
            
            return result[0] if result else 0
    
    def get_quick_stats(self) -> Dict[str, int]:
        """빠른 통계 조회"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 총 사용자 수
            cursor.execute("SELECT COUNT(*) FROM users")
            total_users = cursor.fetchone()[0]
            
            # 오늘 로그인한 사용자 수
            today = datetime.now().date()
            cursor.execute("""
                SELECT COUNT(*) FROM daily_checkins 
                WHERE checkin_date = ?
            """, (today,))
            today_logins = cursor.fetchone()[0]
            
            # 활성 래플 수
            cursor.execute("""
                SELECT COUNT(*) FROM raffles 
                WHERE status = 'active' AND end_date > datetime('now')
            """)
            active_raffles = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'total_users': total_users,
                'today_logins': today_logins,
                'active_raffles': active_raffles
            }
    
    def get_all_users(self) -> List[Dict[str, Any]]:
        """모든 사용자 조회 (관리용)"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT user_id, username, full_name, coins, total_earned,
                       joined_date, consecutive_checkins, total_checkins
                FROM users
                ORDER BY joined_date DESC
            """)
            
            results = cursor.fetchall()
            conn.close()
            
            users = []
            for row in results:
                users.append({
                    'user_id': row[0],
                    'username': row[1],
                    'full_name': row[2],
                    'coins': row[3],
                    'total_earned': row[4],
                    'joined_date': row[5],
                    'consecutive_checkins': row[6],
                    'total_checkins': row[7]
                })
            
            return users
    
    def create_raffle(self, name: str, description: str, prize: str, entry_cost: int, end_date: str) -> int:
        """래플 생성"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO raffles (name, description, prize, entry_cost, end_date)
                VALUES (?, ?, ?, ?, ?)
            """, (name, description, prize, entry_cost, end_date))
            
            raffle_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            return raffle_id
    
    def create_product(self, name: str, description: str, price: int, stock: int, category: str) -> int:
        """상품 생성"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO products (name, description, price, stock, category)
                VALUES (?, ?, ?, ?, ?)
            """, (name, description, price, stock, category))
            
            product_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            return product_id
    
    def get_all_raffles(self) -> List[Dict[str, Any]]:
        """모든 래플 조회 (관리용)"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, name, description, prize, entry_cost, 
                       start_date, end_date, status, winner_id
                FROM raffles
                ORDER BY created_at DESC
            """)
            
            results = cursor.fetchall()
            conn.close()
            
            raffles = []
            for row in results:
                raffles.append({
                    'id': row[0],
                    'name': row[1],
                    'description': row[2],
                    'prize': row[3],
                    'entry_cost': row[4],
                    'start_date': row[5],
                    'end_date': row[6],
                    'status': row[7],
                    'winner_id': row[8]
                })
            
            return raffles
    
    def get_all_products(self) -> List[Dict[str, Any]]:
        """모든 상품 조회 (관리용)"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, name, description, price, stock, category, is_active
                FROM products
                WHERE is_active = 1
                ORDER BY created_at DESC
            """)
            
            results = cursor.fetchall()
            conn.close()
            
            products = []
            for row in results:
                products.append({
                    'id': row[0],
                    'name': row[1],
                    'description': row[2],
                    'price': row[3],
                    'stock': row[4],
                    'category': row[5],
                    'is_active': row[6]
                })
            
            return products
    
    def get_raffle_entries(self, raffle_id: int) -> List[int]:
        """Get all user IDs who entered a specific raffle"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT DISTINCT user_id FROM raffle_entries 
                WHERE raffle_id = ?
            """, (raffle_id,))
            
            results = cursor.fetchall()
            conn.close()
            
            return [row[0] for row in results]
    
    def set_raffle_winner(self, raffle_id: int, winner_id: int):
        """Set winner for a raffle and mark as completed"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE raffles 
                SET winner_id = ?, status = 'completed'
                WHERE id = ?
            """, (winner_id, raffle_id))
            
            conn.commit()
            conn.close()
    
    def stop_raffle_by_id(self, raffle_id: int):
        """Stop a raffle by setting status to stopped"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE raffles 
                SET status = 'stopped'
                WHERE id = ?
            """, (raffle_id,))
            
            conn.commit()
            conn.close()
    
    def delete_product(self, product_id: int):
        """Delete a product by setting is_active to False"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE products 
                SET is_active = 0
                WHERE id = ?
            """, (product_id,))
            
            conn.commit()
            conn.close()
    
    def update_product(self, product_id: int, name: str, description: str, price: int, stock: int, category: str):
        """Update product information"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE products 
                SET name = ?, description = ?, price = ?, stock = ?, category = ?
                WHERE id = ?
            """, (name, description, price, stock, category, product_id))
            
            conn.commit()
            conn.close()
    
    def delete_raffle(self, raffle_id: int):
        """Delete a raffle completely"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # First delete all raffle entries
            cursor.execute("DELETE FROM raffle_entries WHERE raffle_id = ?", (raffle_id,))
            
            # Then delete the raffle itself
            cursor.execute("DELETE FROM raffles WHERE id = ?", (raffle_id,))
            
            conn.commit()
            conn.close()
    
    def save_settings(self, settings: dict):
        """Save system settings"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create settings table if it doesn't exist
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Save each setting
            for key, value in settings.items():
                cursor.execute("""
                    INSERT OR REPLACE INTO settings (key, value, updated_at)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                """, (key, str(value)))
            
            conn.commit()
            conn.close()
    
    def get_settings(self) -> dict:
        """Get all system settings"""
        with self.lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create settings table if it doesn't exist
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("SELECT key, value FROM settings")
            results = cursor.fetchall()
            conn.close()
            
            # Convert to dictionary with default values
            settings = {
                'daily_coin_base': 1,
                'daily_coin_bonus_max': 7,
                'referral_bonus': 1,
                'max_consecutive_bonus': 7,
                'welcome_bonus': 1,
                'auto_raffle_draw': False,
                'send_daily_reminder': True,
                'maintenance_mode': False,
                'debug_mode': False,
                'notify_new_user': True,
                'notify_large_transaction': True,
                'notify_raffle_end': True,
                'notify_system_error': True,
                'bot_token': ''
            }
            
            # Update with saved values
            for key, value in results:
                if key in settings:
                    # Convert string values back to appropriate types
                    if isinstance(settings[key], bool):
                        settings[key] = value.lower() == 'true'
                    elif isinstance(settings[key], int):
                        settings[key] = int(value)
                    else:
                        settings[key] = value
            
            return settings
