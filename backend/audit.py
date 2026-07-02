"""Audit logging for case history and compliance."""

from datetime import datetime, timezone

from db_adapter import db as database


async def log_audit(
    *,
    user: dict | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    case_id: str | None = None,
    details: dict | None = None,
) -> None:
    user_id = str(user["_id"]) if user else None
    user_email = user.get("email") if user else None
    await database.audit_logs.insert_one({
        "user_id": user_id,
        "user_email": user_email,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "case_id": case_id,
        "details": details or {},
        "created_at": datetime.now(timezone.utc),
    })