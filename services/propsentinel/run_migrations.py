import asyncio
import asyncpg
import sys
import os

from config import settings

async def run_migrations():
    print(f"Connecting to {settings.database_url}")
    try:
        conn = await asyncpg.connect(settings.database_url)
        print("Connected. Running migrations...")
        
        with open(os.path.join(os.path.dirname(__file__), "migrations", "001_initial_schema.sql"), "r") as f:
            sql = f.read()
            
        await conn.execute(sql)
        print("Migrations applied successfully.")
        await conn.close()
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_migrations())
