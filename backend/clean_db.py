"""Clear all LexCase tables (PostgreSQL)."""
import asyncio

from database import init_db
from db_adapter import db


async def main():
    await init_db()
    for name in ("audit_logs", "documents", "messages", "tasks", "invoices",
                 "appointments", "cases", "clients", "users"):
        await getattr(db, name).delete_many({})
    print("All tables cleared.")


if __name__ == "__main__":
    asyncio.run(main())