import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import datetime

async def fix():
    client = AsyncIOMotorClient('mongodb://mongo:27017')
    db = client.lexcase
    
    users = await db.users.find({'role': 'client'}).to_list(None)
    for u in users:
        if not u.get('client_id'):
            print('Fixing user:', u['email'])
            c = await db.clients.insert_one({'name': u['name'], 'email': u['email'], 'created_at': datetime.datetime.now()})
            await db.users.update_one({'_id': u['_id']}, {'$set': {'client_id': str(c.inserted_id)}})

asyncio.run(fix())
