#!/usr/bin/env python3
"""
Debug authentication issue
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def debug_auth():
    print("🔍 Debugging authentication...")
    
    # Get admin user from database
    admin_user = await db.users.find_one({"username": "admin"})
    if not admin_user:
        print("❌ Admin user not found in database")
        return
    
    print(f"✅ Found admin user: {admin_user['username']}")
    print(f"   Full name: {admin_user['full_name']}")
    print(f"   Role: {admin_user['role']}")
    print(f"   Password hash: {admin_user['password_hash'][:50]}...")
    
    # Test password verification
    test_password = "admin123"
    print(f"\n🔐 Testing password verification for '{test_password}'...")
    
    try:
        is_valid = pwd_context.verify(test_password, admin_user['password_hash'])
        print(f"Password verification result: {is_valid}")
        
        if is_valid:
            print("✅ Password verification successful!")
        else:
            print("❌ Password verification failed!")
            
            # Try creating a new hash to compare
            new_hash = pwd_context.hash(test_password)
            print(f"New hash for same password: {new_hash[:50]}...")
            
            # Test the new hash
            is_new_valid = pwd_context.verify(test_password, new_hash)
            print(f"New hash verification: {is_new_valid}")
            
    except Exception as e:
        print(f"❌ Error during password verification: {e}")
    
    # Check other users too
    print("\n👥 Checking other users...")
    users = await db.users.find({}).to_list(10)
    for user in users:
        print(f"User: {user['username']} ({user['role']})")
        if user['username'] == 'ustabasi1':
            is_valid = pwd_context.verify('usta123', user['password_hash'])
            print(f"  usta123 verification: {is_valid}")
        elif user['username'] == 'eleman1':
            is_valid = pwd_context.verify('eleman123', user['password_hash'])
            print(f"  eleman123 verification: {is_valid}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(debug_auth())