#!/usr/bin/env python3
"""
Fix authentication by recreating users with correct password hashes
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

# Load environment
ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def fix_users():
    print("🔧 Fixing user authentication...")
    
    # Delete all existing users
    result = await db.users.delete_many({})
    print(f"Deleted {result.deleted_count} existing users")
    
    # Create users with correct password hashes
    users_to_create = [
        {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password": "admin123",
            "full_name": "Yönetici",
            "role": "admin"
        },
        {
            "id": str(uuid.uuid4()),
            "username": "ustabasi1", 
            "password": "usta123",
            "full_name": "Ahmet Yılmaz",
            "role": "supervisor"
        },
        {
            "id": str(uuid.uuid4()),
            "username": "eleman1",
            "password": "eleman123", 
            "full_name": "Mehmet Demir",
            "role": "worker"
        },
        {
            "id": str(uuid.uuid4()),
            "username": "eleman2",
            "password": "eleman123",
            "full_name": "Ali Kaya", 
            "role": "worker"
        }
    ]
    
    for user_data in users_to_create:
        password = user_data.pop("password")
        password_hash = pwd_context.hash(password)
        
        user_doc = {
            **user_data,
            "password_hash": password_hash,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(user_doc)
        print(f"✅ Created user: {user_data['username']} ({user_data['role']})")
        
        # Verify the password works
        is_valid = pwd_context.verify(password, password_hash)
        print(f"   Password verification: {is_valid}")
    
    print("\n🎉 User authentication fixed!")
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_users())