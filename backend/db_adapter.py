"""
MongoDB-style collection adapter over PostgreSQL.

Keeps server.py changes minimal by translating familiar db.* calls to SQLAlchemy.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy import String, cast, delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from database import async_session
from models import (
    Appointment,
    AuditLog,
    Case,
    Client,
    Document,
    Invoice,
    Message,
    Task,
    User,
)

MODEL_MAP = {
    "users": User,
    "clients": Client,
    "cases": Case,
    "tasks": Task,
    "documents": Document,
    "messages": Message,
    "invoices": Invoice,
    "appointments": Appointment,
    "audit_logs": AuditLog,
}


@dataclass
class InsertOneResult:
    inserted_id: uuid.UUID


@dataclass
class UpdateResult:
    matched_count: int


def parse_id(id_: Any) -> uuid.UUID:
    if isinstance(id_, uuid.UUID):
        return id_
    try:
        return uuid.UUID(str(id_))
    except (ValueError, AttributeError) as exc:
        raise HTTPException(status_code=400, detail="Invalid id") from exc


def _to_iso(val: Any) -> Any:
    if isinstance(val, datetime):
        return val.isoformat()
    return val


def _parse_dt(val: Any, col_name: str) -> Any:
    if col_name in ("due_date", "date", "opened_on", "paid_at", "ai_summary_at"):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except ValueError:
            return val
    return val


def row_to_doc(row) -> dict:
    doc = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name)
        if col.name == "id":
            doc["_id"] = val
        else:
            doc[col.name] = _to_iso(val)
    return doc


def _apply_op(column, op: str, value):
    if op == "$eq":
        return column == value
    if op == "$ne":
        return column != value
    if op == "$in":
        return column.in_(value)
    if op == "$nin":
        return ~column.in_(value)
    if op == "$lte":
        return column <= value
    if op == "$lt":
        return column < value
    if op == "$gte":
        return column >= value
    if op == "$gt":
        return column > value
    raise ValueError(f"Unsupported operator: {op}")


def build_filter(model, query: dict):
    clauses = []
    for key, value in query.items():
        if key == "$or":
            sub = [build_filter(model, subq) for subq in value]
            clauses.append(or_(*sub))
            continue
        col_name = "id" if key == "_id" else key
        if not hasattr(model, col_name):
            continue
        column = getattr(model, col_name)
        if isinstance(value, dict):
            if "$regex" in value:
                clauses.append(cast(column, String).ilike(f"%{value['$regex']}%"))
                continue
            for op, op_val in value.items():
                if op == "$or":
                    continue
                clauses.append(_apply_op(column, op, op_val))
        else:
            if col_name == "id":
                value = parse_id(value)
            clauses.append(column == value)
    return clauses


class FindCursor:
    def __init__(self, model, query: dict):
        self.model = model
        self.query = query
        self._sort_field = None
        self._sort_dir = 1
        self._limit = None

    def sort(self, field: str, direction: int = 1):
        self._sort_field = field
        self._sort_dir = direction
        return self

    def limit(self, n: int):
        self._limit = n
        return self

    async def to_list(self, length: int | None = None):
        limit = length if length is not None else self._limit
        async with async_session() as session:
            stmt = select(self.model)
            clauses = build_filter(self.model, self.query)
            if clauses:
                stmt = stmt.where(*clauses)
            if self._sort_field:
                col_name = "id" if self._sort_field == "_id" else self._sort_field
                col = getattr(self.model, col_name, None)
                if col is not None:
                    stmt = stmt.order_by(col.desc() if self._sort_dir < 0 else col.asc())
            if limit:
                stmt = stmt.limit(limit)
            result = await session.execute(stmt)
            return [row_to_doc(r) for r in result.scalars().all()]


class AggregateCursor:
    def __init__(self, model, pipeline: list):
        self.model = model
        self.pipeline = pipeline

    async def to_list(self, length: int | None = None):
        async with async_session() as session:
            for stage in self.pipeline:
                if "$match" in stage:
                    clauses = build_filter(self.model, stage["$match"])
                    stmt = select(self.model)
                    if clauses:
                        stmt = stmt.where(*clauses)
                    result = await session.execute(stmt)
                    rows = result.scalars().all()
                    if "$group" in stage:
                        group = stage["$group"]
                        group_field = group["_id"].replace("$", "")
                        counts: dict[str, int] = {}
                        for row in rows:
                            key = getattr(row, group_field, "unknown")
                            counts[str(key)] = counts.get(str(key), 0) + 1
                        return [{"_id": k, "count": v} for k, v in counts.items()]
            return []


class Collection:
    def __init__(self, name: str):
        self.name = name
        self.model = MODEL_MAP[name]

    def find(self, query: dict | None = None):
        return FindCursor(self.model, query or {})

    def aggregate(self, pipeline: list):
        return AggregateCursor(self.model, pipeline)

    async def find_one(self, query: dict):
        async with async_session() as session:
            clauses = build_filter(self.model, query)
            stmt = select(self.model)
            if clauses:
                stmt = stmt.where(*clauses)
            stmt = stmt.limit(1)
            result = await session.execute(stmt)
            row = result.scalar_one_or_none()
            return row_to_doc(row) if row else None

    async def insert_one(self, doc: dict) -> InsertOneResult:
        payload = dict(doc)
        row_id = payload.pop("_id", None) or uuid.uuid4()
        if not isinstance(row_id, uuid.UUID):
            row_id = parse_id(row_id)
        payload["id"] = row_id

        valid_cols = {c.name for c in self.model.__table__.columns}
        filtered = {
            k: _parse_dt(v, k) for k, v in payload.items() if k in valid_cols
        }

        async with async_session() as session:
            row = self.model(**filtered)
            session.add(row)
            await session.commit()
            return InsertOneResult(inserted_id=row_id)

    async def update_one(self, query: dict, update_doc: dict) -> UpdateResult:
        sets = update_doc.get("$set", update_doc)
        async with async_session() as session:
            clauses = build_filter(self.model, query)
            count_stmt = select(func.count()).select_from(self.model)
            if clauses:
                count_stmt = count_stmt.where(*clauses)
            matched = (await session.execute(count_stmt)).scalar() or 0

            stmt = update(self.model)
            if clauses:
                stmt = stmt.where(*clauses)
            valid_cols = {c.name for c in self.model.__table__.columns}
            values = {k: _parse_dt(v, k) for k, v in sets.items() if k in valid_cols}
            if values:
                stmt = stmt.values(**values)
                await session.execute(stmt)
            await session.commit()
            return UpdateResult(matched_count=matched if values else 0)

    async def delete_one(self, query: dict) -> None:
        async with async_session() as session:
            clauses = build_filter(self.model, query)
            stmt = delete(self.model)
            if clauses:
                stmt = stmt.where(*clauses)
            await session.execute(stmt)
            await session.commit()

    async def delete_many(self, query: dict) -> None:
        await self.delete_one(query)

    async def count_documents(self, query: dict | None = None) -> int:
        async with async_session() as session:
            clauses = build_filter(self.model, query or {})
            stmt = select(func.count()).select_from(self.model)
            if clauses:
                stmt = stmt.where(*clauses)
            result = await session.execute(stmt)
            return result.scalar() or 0

    async def create_index(self, field: str, unique: bool = False) -> None:
        pass  # indexes defined in models / migrations


class Database:
    def __init__(self):
        self.users = Collection("users")
        self.clients = Collection("clients")
        self.cases = Collection("cases")
        self.tasks = Collection("tasks")
        self.documents = Collection("documents")
        self.messages = Collection("messages")
        self.invoices = Collection("invoices")
        self.appointments = Collection("appointments")
        self.audit_logs = Collection("audit_logs")


db = Database()