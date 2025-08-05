import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, date, timedelta
from database import Database
from typing import Dict, Any, List

class AdminPanel:
    def __init__(self, database: Database):
        self.db = database
    
    def render(self):
        """Render admin panel"""
        st.header("📊 Admin Panel")
        
        # Create tabs
        tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
            "📊 Dashboard", "👥 User Management", "🎰 Raffle Management", 
            "🛍️ Product Management", "📈 Statistics", "⚙️ Settings"
        ])
        
        with tab1:
            self.render_dashboard()
        
        with tab2:
            self.render_user_management()
        
        with tab3:
            self.render_raffle_management()
        
        with tab4:
            self.render_product_management()
        
        with tab5:
            self.render_statistics()
        
        with tab6:
            self.render_settings()
    
    def render_dashboard(self):
        """Render dashboard"""
        st.subheader("📊 System Overview")
        
        try:
            # 주요 지표
            stats = self.db.get_quick_stats()
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric(
                    label="총 사용자",
                    value=stats['total_users'],
                    delta=None
                )
            
            with col2:
                st.metric(
                    label="오늘 로그인",
                    value=stats['today_logins'],
                    delta=None
                )
            
            with col3:
                st.metric(
                    label="활성 래플",
                    value=stats['active_raffles'],
                    delta=None
                )
            
            with col4:
                # 총 코인 발행량 계산
                users = self.db.get_all_users()
                total_coins = sum(user['total_earned'] for user in users)
                st.metric(
                    label="총 발행 코인",
                    value=f"{total_coins:,}",
                    delta=None
                )
            
            st.divider()
            
            # 최근 활동
            st.subheader("📅 최근 활동")
            
            # 최근 가입한 사용자들
            users = self.db.get_all_users()
            if users:
                recent_users = users[:5]  # 최근 5명
                
                st.write("**최근 가입 사용자**")
                for user in recent_users:
                    st.write(f"• {user['full_name']} (@{user['username'] or 'N/A'}) - {user['joined_date'][:10]}")
            
        except Exception as e:
            st.error(f"대시보드 로딩 중 오류: {e}")
    
    def render_user_management(self):
        """User Management"""
        st.subheader("👥 User Management")
        
        try:
            users = self.db.get_all_users()
            
            if not users:
                st.info("No registered users found.")
                return
            
            # Convert user list to DataFrame
            df = pd.DataFrame(users)
            
            # Search functionality
            search_term = st.text_input("🔍 Search Users (name or username)")
            if search_term:
                df = df[
                    df['full_name'].str.contains(search_term, case=False, na=False) |
                    df['username'].str.contains(search_term, case=False, na=False)
                ]
            
            # Sort options
            sort_options = {
                "Joined Date (Newest)": ("joined_date", False),
                "Joined Date (Oldest)": ("joined_date", True),
                "Coins (Most)": ("coins", False),
                "Coins (Least)": ("coins", True),
                "Total Earned (Most)": ("total_earned", False),
                "Consecutive Check-ins (Most)": ("consecutive_checkins", False)
            }
            
            sort_by = st.selectbox("Sort by", list(sort_options.keys()))
            column, ascending = sort_options[sort_by]
            df = df.sort_values(by=column, ascending=ascending)
            
            # User list display
            st.dataframe(
                df[['user_id', 'full_name', 'username', 'coins', 'total_earned', 
                    'consecutive_checkins', 'total_checkins', 'joined_date']],
                column_config={
                    'user_id': 'User ID',
                    'full_name': 'Full Name',
                    'username': 'Username',
                    'coins': 'Current Coins',
                    'total_earned': 'Total Earned',
                    'consecutive_checkins': 'Consecutive Days',
                    'total_checkins': 'Total Check-ins',
                    'joined_date': 'Joined Date'
                },
                use_container_width=True
            )
            
            # Coin management section
            st.subheader("💰 Coin Management")
            
            # Create user selection options
            user_options = ["Select a user..."]
            user_mapping = {}
            
            for _, user in df.iterrows():
                display_name = f"{user['full_name']} ({user['username']}) - Current: {user['coins']} coins"
                user_options.append(display_name)
                user_mapping[display_name] = user['user_id']
            
            col1, col2 = st.columns(2)
            
            with col1:
                # Replace the number input with user selection dropdown
                selected_user = st.selectbox(
                    "Choose User",
                    user_options,
                    help="Select a user to manage their coins"
                )
                
                coin_amount = st.number_input("Coin Amount", min_value=1, value=10, step=10)
                
            with col2:
                action = st.radio("Action", ["Add Coins", "Remove Coins"])
                reason = st.text_input("Reason", placeholder="e.g., Event reward, Policy violation, etc.")
            
            # Process coins if user is selected
            if st.button("💰 Process Coins", type="primary"):
                if selected_user != "Select a user..." and coin_amount and reason:
                    try:
                        target_user_id = user_mapping[selected_user]
                        user_info = self.db.get_user_info(target_user_id)
                        
                        if not user_info:
                            st.error("User not found.")
                        else:
                            amount = coin_amount if action == "Add Coins" else -coin_amount
                            self.db.add_coins(target_user_id, amount)
                            
                            action_text = "added to" if action == "Add Coins" else "removed from"
                            st.success(f"✅ {coin_amount} coins {action_text} {user_info['full_name']}!")
                            st.rerun()
                    except Exception as e:
                        st.error(f"Error processing coins: {e}")
                else:
                    st.warning("Please select a user, enter coin amount, and provide a reason.")
            
            # Fallback manual entry for admin (always available)
            st.markdown("---")
            st.markdown("**Manual Coin Management (alternative method):**")
            
            col1, col2 = st.columns(2)
            
            with col1:
                manual_user_id = st.number_input("User ID", min_value=1, step=1, key="manual_user_id")
                manual_coin_amount = st.number_input("Coin Amount", min_value=1, value=10, step=10, key="manual_coins")
                
            with col2:
                manual_action = st.radio("Action", ["Add Coins", "Remove Coins"], key="manual_action")
                manual_reason = st.text_input("Reason", placeholder="e.g., Event reward, Policy violation, etc.", key="manual_reason")
            
            if st.button("💰 Process Coins (Manual)", type="secondary"):
                if manual_user_id and manual_coin_amount and manual_reason:
                    try:
                        user_info = self.db.get_user_info(manual_user_id)
                        if not user_info:
                            st.error("User not found.")
                        else:
                            amount = manual_coin_amount if manual_action == "Add Coins" else -manual_coin_amount
                            self.db.add_coins(manual_user_id, amount)
                            
                            action_text = "added to" if manual_action == "Add Coins" else "removed from"
                            st.success(f"✅ {manual_coin_amount} coins {action_text} User ID {manual_user_id}!")
                            st.rerun()
                    except Exception as e:
                        st.error(f"Error processing coins: {e}")
                else:
                    st.warning("Please fill all fields.")
            
        except Exception as e:
            st.error(f"Error loading user management: {e}")
    
    def render_raffle_management(self):
        """래플 관리"""
        st.subheader("🎰 Raffle Management")
        
        # Create new raffle
        with st.expander("➕ Create New Raffle"):
            with st.form("create_raffle"):
                col1, col2 = st.columns(2)
                
                with col1:
                    raffle_name = st.text_input("Raffle Name", placeholder="e.g., iPhone 15 Pro Giveaway")
                    prize = st.text_input("Prize", placeholder="e.g., iPhone 15 Pro 256GB")
                    entry_cost = st.number_input("Entry Cost (coins)", min_value=1, value=100)
                
                with col2:
                    description = st.text_area("Description", placeholder="Enter detailed description of the raffle")
                    end_date = st.date_input("End Date", value=date.today() + timedelta(days=7))
                    end_time = st.time_input("End Time", value=datetime.now().time())
                
                submitted = st.form_submit_button("🎰 Create Raffle")
                
                if submitted and raffle_name and prize:
                    try:
                        end_datetime = datetime.combine(end_date, end_time)
                        raffle_id = self.db.create_raffle(
                            name=raffle_name,
                            description=description,
                            prize=prize,
                            entry_cost=entry_cost,
                            end_date=end_datetime.isoformat()
                        )
                        st.success(f"✅ Raffle '{raffle_name}' created successfully! (ID: {raffle_id})")
                        st.rerun()
                    except Exception as e:
                        st.error(f"래플 생성 중 오류: {e}")
        
        # 기존 래플 목록
        st.subheader("📋 래플 목록")
        
        try:
            raffles = self.db.get_all_raffles()
            
            if not raffles:
                st.info("생성된 래플이 없습니다.")
                return
            
            # 래플 목록을 DataFrame으로 변환
            df = pd.DataFrame(raffles)
            
            # 상태별 필터링
            status_filter = st.selectbox("상태 필터", ["전체", "진행중", "종료"])
            
            if status_filter != "전체":
                filter_status = "active" if status_filter == "진행중" else "completed"
                df = df[df['status'] == filter_status]
            
            # 래플 목록 표시
            for _, raffle in df.iterrows():
                with st.container():
                    col1, col2, col3 = st.columns([2, 1, 1])
                    
                    with col1:
                        status_emoji = "🟢" if raffle['status'] == 'active' else "🔴"
                        st.write(f"{status_emoji} **{raffle['name']}**")
                        st.write(f"🏆 상품: {raffle['prize']}")
                        st.write(f"💰 참여비: {raffle['entry_cost']} 코인")
                    
                    with col2:
                        st.write(f"📅 시작: {raffle['start_date'][:10]}")
                        st.write(f"📅 마감: {raffle['end_date'][:10]}")
                        if raffle['winner_id']:
                            # Get winner information
                            winner_info = self.db.get_user_info(raffle['winner_id'])
                            if winner_info:
                                winner_display = f"{winner_info['full_name']} (ID: {raffle['winner_id']})"
                            else:
                                winner_display = f"User ID: {raffle['winner_id']}"
                            st.write(f"🏆 Winner: {winner_display}")
                    
                    with col3:
                        if raffle['status'] == 'active':
                            if st.button(f"🎯 Draw Winner", key=f"draw_{raffle['id']}"):
                                self.draw_raffle_winner(int(raffle['id']))
                            
                            if st.button(f"⏹️ Stop Raffle", key=f"stop_{raffle['id']}"):
                                self.stop_raffle(int(raffle['id']))
                        
                        # Delete button for all raffles
                        if st.button(f"🗑️ Delete", key=f"delete_raffle_{raffle['id']}"):
                            st.session_state[f"confirm_delete_raffle_{raffle['id']}"] = True
                        
                        # Show confirmation dialog if delete was clicked
                        if st.session_state.get(f"confirm_delete_raffle_{raffle['id']}", False):
                            st.warning(f"⚠️ Are you sure you want to delete raffle '{raffle['name']}'?")
                            st.warning("This will permanently remove the raffle and all entries!")
                            col_confirm, col_cancel = st.columns(2)
                            
                            with col_confirm:
                                if st.button("✅ Yes, Delete", key=f"confirm_delete_raffle_yes_{raffle['id']}"):
                                    self.delete_raffle(int(raffle['id']))
                            
                            with col_cancel:
                                if st.button("❌ Cancel", key=f"confirm_delete_raffle_no_{raffle['id']}"):
                                    st.session_state[f"confirm_delete_raffle_{raffle['id']}"] = False
                                    st.rerun()
                    
                    st.divider()
        
        except Exception as e:
            st.error(f"래플 목록 로딩 중 오류: {e}")
    
    def draw_raffle_winner(self, raffle_id: int):
        """Draw a winner for the raffle"""
        try:
            # Get raffle entries
            entries = self.db.get_raffle_entries(raffle_id)
            
            if not entries:
                st.warning("No entries found for this raffle.")
                return
                
            # Randomly select a winner
            import random
            winner_id = random.choice(entries)
            
            # Update raffle with winner
            self.db.set_raffle_winner(raffle_id, winner_id)
            
            # Get winner info
            winner_info = self.db.get_user_info(winner_id)
            raffle_info = self.db.get_raffle(raffle_id)
            
            if winner_info and raffle_info:
                st.success(f"🎉 Winner drawn! {winner_info['full_name']} won '{raffle_info['prize']}'!")
                st.balloons()
                st.rerun()
            else:
                st.error("Could not retrieve winner or raffle information.")
            
        except Exception as e:
            st.error(f"Error drawing winner: {e}")
    
    def stop_raffle(self, raffle_id: int):
        """Stop a raffle"""
        try:
            self.db.stop_raffle_by_id(raffle_id)
            st.success("Raffle stopped successfully!")
            st.rerun()
            
        except Exception as e:
            st.error(f"Error stopping raffle: {e}")
    
    def delete_raffle(self, raffle_id: int):
        """Delete a raffle completely"""
        try:
            # Get raffle info for confirmation message
            raffle_info = self.db.get_raffle(raffle_id)
            if raffle_info:
                raffle_name = raffle_info['name']
            else:
                raffle_name = f"Raffle ID {raffle_id}"
            
            # Delete the raffle
            self.db.delete_raffle(raffle_id)
            st.success(f"Raffle '{raffle_name}' deleted successfully!")
            
            # Clear confirmation state
            st.session_state[f"confirm_delete_raffle_{raffle_id}"] = False
            st.rerun()
            
        except Exception as e:
            st.error(f"Error deleting raffle: {e}")
    
    def render_product_management(self):
        """상품 관리"""
        st.subheader("🛍️ 상품 관리")
        
        # 새 상품 생성
        with st.expander("➕ 새 상품 추가"):
            with st.form("create_product"):
                col1, col2 = st.columns(2)
                
                with col1:
                    product_name = st.text_input("상품명", placeholder="예: 스타벅스 아메리카노")
                    price = st.number_input("가격 (코인)", min_value=1, value=50)
                    stock = st.number_input("재고", min_value=0, value=10)
                
                with col2:
                    # Category selection with custom input option
                    category_options = [
                        "Gift Cards", "Food & Drinks", "Digital Products", 
                        "Physical Items", "Electronics", "Other", "Custom..."
                    ]
                    category_choice = st.selectbox("Category", category_options)
                    
                    # If user selects "Custom...", show text input
                    if category_choice == "Custom...":
                        category = st.text_input("Enter Custom Category", placeholder="Type your custom category")
                    else:
                        category = category_choice
                    
                    description = st.text_area("Product Description", placeholder="Enter detailed product description")
                
                submitted = st.form_submit_button("🛍️ Add Product")
                
                if submitted and product_name and category:
                    try:
                        product_id = self.db.create_product(
                            name=product_name,
                            description=description,
                            price=price,
                            stock=stock,
                            category=category
                        )
                        st.success(f"✅ Product '{product_name}' added successfully! (ID: {product_id})")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Error adding product: {e}")
                elif submitted:
                    st.warning("Please fill in product name and category.")
        
        # Existing product list
        st.subheader("📋 Product List")
        
        try:
            products = self.db.get_all_products()
            
            if not products:
                st.info("No products registered yet.")
                return
            
            # Convert product list to DataFrame
            df = pd.DataFrame(products)
            
            # Category filtering
            categories = ["All"] + list(df['category'].unique())
            category_filter = st.selectbox("Category Filter", categories)
            
            if category_filter != "All":
                df = df[df['category'] == category_filter]
            
            # Display product list
            for _, product in df.iterrows():
                with st.container():
                    col1, col2, col3 = st.columns([2, 1, 1])
                    
                    with col1:
                        status_emoji = "✅" if product['is_active'] else "❌"
                        stock_status = "🟢" if product['stock'] > 0 else "🔴"
                        st.write(f"{status_emoji} **{product['name']}** {stock_status}")
                        st.write(f"📝 {product['description']}")
                        st.write(f"🏷️ Category: {product['category']}")
                    
                    with col2:
                        st.write(f"💰 Price: {product['price']} coins")
                        st.write(f"📦 Stock: {product['stock']} items")
                        st.write(f"🔄 Status: {'Active' if product['is_active'] else 'Inactive'}")
                    
                    with col3:
                        # Edit product with expandable form
                        if st.button(f"📝 Edit", key=f"edit_{product['id']}"):
                            st.session_state[f"editing_{product['id']}"] = True
                        
                        if st.button(f"🗑️ Delete", key=f"delete_{product['id']}"):
                            # Add confirmation step
                            st.session_state[f"confirm_delete_{product['id']}"] = True
                        
                        # Show confirmation dialog if delete was clicked
                        if st.session_state.get(f"confirm_delete_{product['id']}", False):
                            st.warning(f"⚠️ Are you sure you want to delete '{product['name']}'?")
                            col_confirm, col_cancel = st.columns(2)
                            
                            with col_confirm:
                                if st.button("✅ Yes, Delete", key=f"confirm_yes_{product['id']}"):
                                    try:
                                        self.db.delete_product(int(product['id']))
                                        st.success(f"✅ Product '{product['name']}' deleted successfully!")
                                        st.session_state[f"confirm_delete_{product['id']}"] = False
                                        st.rerun()
                                    except Exception as e:
                                        st.error(f"Error deleting product: {e}")
                            
                            with col_cancel:
                                if st.button("❌ Cancel", key=f"confirm_no_{product['id']}"):
                                    st.session_state[f"confirm_delete_{product['id']}"] = False
                                    st.rerun()
                    
                    # Show edit form if editing this product
                    if st.session_state.get(f"editing_{product['id']}", False):
                        with st.expander(f"Edit {product['name']}", expanded=True):
                            with st.form(f"edit_product_{product['id']}"):
                                edit_col1, edit_col2 = st.columns(2)
                                
                                with edit_col1:
                                    new_name = st.text_input("Product Name", value=product['name'])
                                    new_price = st.number_input("Price (coins)", value=int(product['price']), min_value=1)
                                    new_stock = st.number_input("Stock", value=int(product['stock']), min_value=0)
                                
                                with edit_col2:
                                    # Category edit with custom input
                                    current_category = product['category']
                                    category_options = [
                                        "Gift Cards", "Food & Drinks", "Digital Products", 
                                        "Physical Items", "Electronics", "Other", "Custom..."
                                    ]
                                    
                                    if current_category not in category_options[:-1]:
                                        # If current category is custom, select "Custom..." and show text input
                                        category_choice = st.selectbox("Category", category_options, index=len(category_options)-1)
                                        new_category = st.text_input("Custom Category", value=current_category)
                                    else:
                                        # If current category is in options, select it
                                        idx = category_options.index(current_category) if current_category in category_options else 0
                                        category_choice = st.selectbox("Category", category_options, index=idx)
                                        
                                        if category_choice == "Custom...":
                                            new_category = st.text_input("Custom Category", placeholder="Type your custom category")
                                        else:
                                            new_category = category_choice
                                    
                                    new_description = st.text_area("Description", value=product['description'] or "")
                                
                                col_save, col_cancel = st.columns(2)
                                with col_save:
                                    if st.form_submit_button("💾 Save Changes"):
                                        try:
                                            # Validate inputs
                                            if not new_name or not new_name.strip():
                                                st.error("Product name cannot be empty")
                                            elif not new_category or not new_category.strip():
                                                st.error("Category cannot be empty")
                                            else:
                                                # Update product in database
                                                self.db.update_product(
                                                    product_id=int(product['id']),
                                                    name=new_name.strip(),
                                                    description=new_description.strip() if new_description else "",
                                                    price=int(new_price),
                                                    stock=int(new_stock),
                                                    category=new_category.strip()
                                                )
                                                st.success(f"✅ Product '{new_name}' updated successfully!")
                                                st.session_state[f"editing_{product['id']}"] = False
                                                st.rerun()
                                        except Exception as e:
                                            st.error(f"Error updating product: {e}")
                                
                                with col_cancel:
                                    if st.form_submit_button("❌ Cancel"):
                                        st.session_state[f"editing_{product['id']}"] = False
                                        st.rerun()
                    
                    st.divider()
        
        except Exception as e:
            st.error(f"Error loading product list: {e}")
    
    def render_statistics(self):
        """통계"""
        st.subheader("📈 시스템 통계")
        
        try:
            users = self.db.get_all_users()
            
            if not users:
                st.info("통계를 표시할 데이터가 없습니다.")
                return
            
            df = pd.DataFrame(users)
            
            # 기본 통계
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric("총 사용자", len(df))
                st.metric("평균 보유 코인", f"{df['coins'].mean():.1f}")
            
            with col2:
                st.metric("총 발행 코인", f"{df['total_earned'].sum():,}")
                st.metric("평균 연속 체크인", f"{df['consecutive_checkins'].mean():.1f}일")
            
            with col3:
                active_users = len(df[df['consecutive_checkins'] > 0])
                st.metric("활성 사용자", f"{active_users}")
                st.metric("활성 비율", f"{active_users/len(df)*100:.1f}%")
            
            st.divider()
            
            # 차트들
            col1, col2 = st.columns(2)
            
            with col1:
                # 코인 분포 히스토그램
                fig_coins = px.histogram(
                    df, x='coins', nbins=20,
                    title="사용자별 보유 코인 분포",
                    labels={'coins': '보유 코인', 'count': '사용자 수'}
                )
                st.plotly_chart(fig_coins, use_container_width=True)
            
            with col2:
                # 연속 체크인 분포
                fig_checkins = px.histogram(
                    df, x='consecutive_checkins', nbins=15,
                    title="연속 체크인 일수 분포",
                    labels={'consecutive_checkins': '연속 체크인 일수', 'count': '사용자 수'}
                )
                st.plotly_chart(fig_checkins, use_container_width=True)
            
            # 가입일별 사용자 증가 추이
            df['joined_date'] = pd.to_datetime(df['joined_date'])
            daily_signups = df.groupby(df['joined_date'].dt.date).size().reset_index()
            daily_signups.columns = ['date', 'signups']
            daily_signups['cumulative'] = daily_signups['signups'].cumsum()
            
            fig_growth = go.Figure()
            fig_growth.add_trace(go.Scatter(
                x=daily_signups['date'], 
                y=daily_signups['cumulative'],
                mode='lines+markers',
                name='누적 사용자',
                line=dict(color='blue', width=3)
            ))
            fig_growth.update_layout(
                title="사용자 증가 추이",
                xaxis_title="날짜",
                yaxis_title="누적 사용자 수",
                hovermode='x unified'
            )
            st.plotly_chart(fig_growth, use_container_width=True)
            
            # 상위 사용자들
            st.subheader("🏆 상위 사용자")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.write("**💰 코인 많이 보유한 사용자**")
                top_coins = df.nlargest(10, 'coins')[['full_name', 'coins']]
                for idx, row in top_coins.iterrows():
                    st.write(f"{row.name + 1}. {row['full_name']}: {row['coins']} 코인")
            
            with col2:
                st.write("**📅 연속 체크인 상위 사용자**")
                top_checkins = df.nlargest(10, 'consecutive_checkins')[['full_name', 'consecutive_checkins']]
                for idx, row in top_checkins.iterrows():
                    st.write(f"{row.name + 1}. {row['full_name']}: {row['consecutive_checkins']}일")
        
        except Exception as e:
            st.error(f"통계 로딩 중 오류: {e}")
    
    def render_settings(self):
        """설정"""
        st.subheader("⚙️ System Settings")
        
        try:
            # Load current settings
            current_settings = self.db.get_settings()
            
            # Bot Token Configuration
            st.write("### 🤖 Bot Configuration")
            bot_token = st.text_input(
                "Telegram Bot Token", 
                value=current_settings.get('bot_token', ''),
                type="password",
                help="Enter your bot token from @BotFather"
            )
            
            # Coin Settings
            st.write("### 💰 Coin Settings")
            
            col1, col2 = st.columns(2)
            
            with col1:
                daily_coin_base = st.number_input(
                    "Base Daily Coins", 
                    value=current_settings.get('daily_coin_base', 10), 
                    min_value=1
                )
                # Max Consecutive Bonus removed - unlimited consecutive bonuses
                referral_bonus = st.number_input(
                    "Referral Bonus Coins", 
                    value=current_settings.get('referral_bonus', 100), 
                    min_value=0
                )
            
            with col2:
                # Max consecutive days removed - unlimited consecutive days
                welcome_bonus = st.number_input(
                    "Welcome Bonus", 
                    value=current_settings.get('welcome_bonus', 50), 
                    min_value=0
                )
            
            # System Settings
            st.write("### 🔧 System Settings")
            
            col1, col2 = st.columns(2)
            
            with col1:
                auto_raffle_draw = st.checkbox(
                    "Auto Raffle Draw", 
                    value=current_settings.get('auto_raffle_draw', False)
                )
                send_daily_reminder = st.checkbox(
                    "Send Daily Reminders", 
                    value=current_settings.get('send_daily_reminder', True)
                )
            
            with col2:
                maintenance_mode = st.checkbox(
                    "Maintenance Mode", 
                    value=current_settings.get('maintenance_mode', False)
                )
                debug_mode = st.checkbox(
                    "Debug Mode", 
                    value=current_settings.get('debug_mode', False)
                )
            
            # Notification Settings
            st.write("### 📱 Notification Settings")
            
            col1, col2 = st.columns(2)
            
            with col1:
                notify_new_user = st.checkbox(
                    "New User Registration", 
                    value=current_settings.get('notify_new_user', True)
                )
                notify_large_transaction = st.checkbox(
                    "Large Coin Transactions", 
                    value=current_settings.get('notify_large_transaction', True)
                )
            
            with col2:
                notify_raffle_end = st.checkbox(
                    "Raffle End Notifications", 
                    value=current_settings.get('notify_raffle_end', True)
                )
                notify_system_error = st.checkbox(
                    "System Error Alerts", 
                    value=current_settings.get('notify_system_error', True)
                )
            
            # Database Management
            st.write("### 🗄️ Database Management")
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                if st.button("📊 Database Optimization"):
                    st.info("Database optimization feature is under development.")
            
            with col2:
                if st.button("💾 Create Backup"):
                    st.info("Backup creation feature is under development.")
            
            with col3:
                if st.button("🔄 Clear Cache"):
                    st.info("Cache clearing feature is under development.")
            
            # Settings Save
            if st.button("💾 Save Settings", type="primary"):
                try:
                    # Collect all settings
                    settings_to_save = {
                        'bot_token': bot_token,
                        'daily_coin_base': daily_coin_base,
                        'referral_bonus': referral_bonus,
                        'welcome_bonus': welcome_bonus,
                        'auto_raffle_draw': auto_raffle_draw,
                        'send_daily_reminder': send_daily_reminder,
                        'maintenance_mode': maintenance_mode,
                        'debug_mode': debug_mode,
                        'notify_new_user': notify_new_user,
                        'notify_large_transaction': notify_large_transaction,
                        'notify_raffle_end': notify_raffle_end,
                        'notify_system_error': notify_system_error
                    }
                    
                    # Save to database
                    self.db.save_settings(settings_to_save)
                    st.success("✅ Settings saved successfully!")
                    
                    # Save bot token to file for bot.py
                    if bot_token:
                        with open('bot_token.txt', 'w') as f:
                            f.write(bot_token)
                        st.info("📝 Bot token saved to file for bot system.")
                    
                    st.info("💡 Some settings may require bot restart to take effect.")
                    st.rerun()
                    
                except Exception as e:
                    st.error(f"Error saving settings: {e}")
        
        except Exception as e:
            st.error(f"Error loading settings: {e}")
