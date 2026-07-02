"""
AWS Lambda handler for deadline reminders (EventBridge daily trigger).

Deploy this Lambda in the AWS Console and set DATABASE_URL as an environment variable.
The Lambda inserts in-app reminder messages for tasks due within 48 hours.
"""

import json
import os
import uuid
from datetime import datetime, timedelta, timezone

import asyncpg


async def _run():
    db_url = os.environ["DATABASE_URL"]
    # asyncpg expects postgresql:// not postgresql+asyncpg://
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

    now = datetime.now(timezone.utc)
    cutoff = (now + timedelta(hours=48)).isoformat()
    now_iso = now.isoformat()

    conn = await asyncpg.connect(db_url)
    try:
        rows = await conn.fetch(
            """
            SELECT id, title, case_id, assigned_to, due_date
            FROM tasks
            WHERE status != 'done'
              AND due_date >= $1
              AND due_date <= $2
            """,
            now_iso,
            cutoff,
        )
        sent = 0
        for row in rows:
            if not row["assigned_to"]:
                continue
            content = (
                f"Reminder: task '{row['title']}' is due by "
                f"{row['due_date'][:10]}. Please review and update status."
            )
            await conn.execute(
                """
                INSERT INTO messages (id, sender_id, recipient_id, case_id, content, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                uuid.uuid4(),
                "system",
                row["assigned_to"],
                row["case_id"],
                content,
                now,
            )
            sent += 1
        return {"reminders_sent": sent, "tasks_checked": len(rows)}
    finally:
        await conn.close()


def handler(event, context):
    import asyncio

    result = asyncio.get_event_loop().run_until_complete(_run())
    return {"statusCode": 200, "body": json.dumps(result)}