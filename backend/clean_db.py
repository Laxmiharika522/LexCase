import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def run():
    mongo_url = os.environ.get("MONGO_URI", "mongodb://mongo:27017")
    db = AsyncIOMotorClient(mongo_url)['lexcase']
    await db.users.delete_many({'role': 'paralegal'})
    print('Deleted paralegals')

if __name__ == "__main__":
    asyncio.run(run())
