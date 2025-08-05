#!/usr/bin/env python3

import sqlite3
from datetime import datetime

def check_raffles():
    conn = sqlite3.connect("coin_reward_system.db")
    cursor = conn.cursor()
    
    print("=== Current raffles in database ===")
    cursor.execute("SELECT id, name, prize, entry_cost, end_date, status FROM raffles")
    raffles = cursor.fetchall()
    
    if not raffles:
        print("No raffles found in database")
    else:
        for raffle in raffles:
            print(f"ID: {raffle[0]}")
            print(f"Name: {raffle[1]}")
            print(f"Prize: {raffle[2]}")
            print(f"Entry Cost: {raffle[3]}")
            print(f"End Date: {raffle[4]}")
            print(f"Status: {raffle[5]}")
            print("---")
    
    print("\n=== Current time ===")
    cursor.execute("SELECT datetime('now')")
    current_time = cursor.fetchone()[0]
    print(f"Current time: {current_time}")
    
    print("\n=== Active raffles query ===")
    cursor.execute("""
        SELECT id, name, prize, entry_cost, end_date, status
        FROM raffles 
        WHERE status = 'active' AND end_date > datetime('now')
        ORDER BY end_date ASC
    """)
    active_raffles = cursor.fetchall()
    
    if not active_raffles:
        print("No active raffles found")
    else:
        for raffle in active_raffles:
            print(f"Active raffle: {raffle[1]} (ends: {raffle[4]})")
    
    conn.close()

if __name__ == "__main__":
    check_raffles()