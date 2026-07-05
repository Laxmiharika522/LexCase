from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import secrets
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
import requests
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form, Header, Query
from fastapi.responses import StreamingResponse, Response as FastResponse
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
from db_adapter import db, parse_id
from database import init_db, close_db
from storage import init_storage, put_object, get_object, build_storage_path
from audit import log_audit

# ---------- CONFIG ----------
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day
REFRESH_TOKEN_EXPIRE_DAYS = 7
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = os.environ.get("APP_NAME", "lexcase")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

# ---------- APP ----------
app = FastAPI(title="LexCase API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("lexcase")

# ---------- AUTH HELPERS ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access: str, refresh: str):
    is_prod = os.environ.get("ENVIRONMENT", "development").lower() == "production"
    samesite = "none" if is_prod else "lax"
    secure = is_prod
    response.set_cookie("access_token", access, httponly=True, secure=secure, samesite=samesite, max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=secure, samesite=samesite, max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400, path="/")

def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")

def user_public(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "lawyer"),
        "client_id": user.get("client_id"),
        "phone": user.get("phone", ""),
        "address": user.get("address", ""),
        "emergency_contact": user.get("emergency_contact", {}),
        "created_at": user.get("created_at"),
        "is_active": user.get("is_active", True),
    }

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(*roles: str):
    async def wrapper(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return wrapper

# ---------- MODELS ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    role: Literal["admin", "lawyer", "paralegal", "client"] = "lawyer"
    client_id: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ClientIn(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    confidential: bool = False
    notes: Optional[str] = None
    assigned_lawyer: Optional[str] = None

class CaseIn(BaseModel):
    title: str
    case_number: Optional[str] = None
    client_id: str
    practice_area: Optional[str] = None  # e.g., Litigation, Corporate, Family
    status: Literal["intake", "open", "on_hold", "closed"] = "intake"
    outcome: Optional[Literal["won", "lost", "settled", "dismissed"]] = None
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    description: Optional[str] = None
    assigned_to: Optional[str] = None  # user id
    opened_on: Optional[str] = None    # ISO date

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    case_number: Optional[str] = None
    client_id: Optional[str] = None
    practice_area: Optional[str] = None
    status: Optional[Literal["intake", "open", "on_hold", "closed"]] = None
    outcome: Optional[Literal["won", "lost", "settled", "dismissed"]] = None
    priority: Optional[Literal["low", "medium", "high", "urgent"]] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None

class TaskIn(BaseModel):
    title: str
    case_id: Optional[str] = None
    description: Optional[str] = None
    due_date: str  # ISO date
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    status: Literal["pending", "in_progress", "done"] = "pending"
    assigned_to: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    case_id: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[Literal["low", "medium", "high", "urgent"]] = None
    status: Optional[Literal["pending", "in_progress", "done"]] = None
    assigned_to: Optional[str] = None

class InvoiceIn(BaseModel):
    client_id: str
    lawyer_id: Optional[str] = None
    case_id: Optional[str] = None
    amount: float
    description: str
    status: Literal["unpaid", "paid", "overdue"] = "unpaid"
    due_date: str

class MessageIn(BaseModel):
    case_id: Optional[str] = None
    recipient_id: str
    content: str

class AppointmentIn(BaseModel):
    client_id: str
    case_id: Optional[str] = None
    lawyer_id: Optional[str] = None
    date: str
    duration: Optional[int] = 60  # minutes
    description: str
    purpose: Optional[str] = None
    meeting_type: Literal["video", "office", "phone"] = "office"
    meeting_link: Optional[str] = None
    notes: Optional[str] = None
    status: Literal["pending", "scheduled", "completed", "cancelled", "missed"] = "pending"

class AppointmentUpdate(BaseModel):
    date: Optional[str] = None
    duration: Optional[int] = None
    description: Optional[str] = None
    purpose: Optional[str] = None
    meeting_type: Optional[Literal["video", "office", "phone"]] = None
    meeting_link: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[Literal["pending", "scheduled", "completed", "cancelled", "missed"]] = None
    lawyer_id: Optional[str] = None

class DocumentUpdate(BaseModel):
    original_filename: Optional[str] = None
    category: Optional[str] = None

class ProfileUpdateIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class PasswordUpdateIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)

class UserUpdate(BaseModel):
    role: Optional[Literal["admin", "lawyer", "paralegal", "client"]] = None
    is_active: Optional[bool] = None
    new_password: Optional[str] = None

class EmergencyContactIn(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    phone: Optional[str] = None

# ---------- HELPERS ----------
def _now():
    return datetime.now(timezone.utc).isoformat()

def _oid(id_: str):
    return parse_id(id_)

def _serialize(doc: dict) -> dict:
    if not doc:
        return doc
    doc["id"] = str(doc.pop("_id"))
    return doc

# ---------- AUTH ROUTES ----------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    client_id = payload.client_id
    if payload.role == "client":
        client_doc = {
            "name": payload.name,
            "email": email,
            "created_at": _now()
        }
        client_result = await db.clients.insert_one(client_doc)
        client_id = str(client_result.inserted_id)

    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": payload.role,
        "client_id": client_id,
        "created_at": _now(),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    access = create_access_token(str(result.inserted_id), email, payload.role)
    refresh = create_refresh_token(str(result.inserted_id))
    set_auth_cookies(response, access, refresh)
    return {"user": user_public(doc), "access_token": access}

@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access = create_access_token(str(user["_id"]), email, user["role"])
    refresh = create_refresh_token(str(user["_id"]))
    set_auth_cookies(response, access, refresh)
    return {"user": user_public(user), "access_token": access}

@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user_public(user)

@api.put("/auth/me/profile")
async def update_profile(payload: ProfileUpdateIn, user: dict = Depends(get_current_user)):
    updates = {}
    if payload.name is not None:
        updates["name"] = payload.name
    if payload.phone is not None:
        updates["phone"] = payload.phone
    if payload.address is not None:
        updates["address"] = payload.address
        
    if updates:
        await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
    
    updated_user = await db.users.find_one({"_id": user["_id"]})
    return user_public(updated_user)

@api.put("/auth/me/password")
async def update_password(payload: PasswordUpdateIn, user: dict = Depends(get_current_user)):
    if not verify_password(payload.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    await db.users.update_one(
        {"_id": user["_id"]}, 
        {"$set": {"password_hash": hash_password(payload.new_password)}}
    )
    return {"ok": True}

@api.put("/auth/me/emergency_contact")
async def update_emergency_contact(payload: EmergencyContactIn, user: dict = Depends(get_current_user)):
    contact = {}
    if payload.name is not None:
        contact["name"] = payload.name
    if payload.relationship is not None:
        contact["relationship"] = payload.relationship
    if payload.phone is not None:
        contact["phone"] = payload.phone
        
    await db.users.update_one(
        {"_id": user["_id"]}, 
        {"$set": {"emergency_contact": contact}}
    )
    
    updated_user = await db.users.find_one({"_id": user["_id"]})
    return user_public(updated_user)

# ---------- USERS ----------
@api.get("/users")
async def list_users(user: dict = Depends(get_current_user)):
    q = {}
    if user.get("role") == "lawyer":
        assigned_cases = await db.cases.find({"assigned_to": str(user["_id"])}).to_list(None)
        assigned_client_ids = [c["client_id"] for c in assigned_cases if c.get("client_id")]
        
        assigned_appts = await db.appointments.find({"lawyer_id": str(user["_id"])}).to_list(None)
        assigned_client_ids.extend([a["client_id"] for a in assigned_appts if a.get("client_id")])
        
        my_clients = await db.clients.find({"assigned_lawyer": str(user["_id"])}).to_list(None)
        assigned_client_ids.extend([str(c["_id"]) for c in my_clients])
        
        q = {
            "$or": [
                {"role": {"$ne": "client"}},
                {"client_id": {"$in": assigned_client_ids}},
                {"_id": {"$in": [_oid(cid) for cid in assigned_client_ids]}}
            ]
        }
    elif user.get("role") == "client":
        client_id_str = user.get("client_id") or str(user["_id"])
        
        my_cases = await db.cases.find({"client_id": client_id_str}).to_list(None)
        assigned_lawyer_ids = [c["assigned_to"] for c in my_cases if c.get("assigned_to")]
        
        my_appts = await db.appointments.find({"client_id": client_id_str}).to_list(None)
        assigned_lawyer_ids.extend([a["lawyer_id"] for a in my_appts if a.get("lawyer_id")])
        
        q_client = []
        if len(client_id_str) == 24:
            q_client.append({"_id": _oid(client_id_str)})
        q_client.append({"email": user.get("email")})
        
        my_client_profile = await db.clients.find_one({"$or": q_client})
        if my_client_profile and my_client_profile.get("assigned_lawyer"):
            assigned_lawyer_ids.append(my_client_profile["assigned_lawyer"])
            
        q = {
            "$or": [
                {"role": "admin"},
                {"_id": {"$in": [_oid(lid) for lid in set(assigned_lawyer_ids)]}}
            ]
        }

    users = await db.users.find(q).to_list(500)
    return [user_public(u) for u in users]

@api.put("/users/{user_id}")
async def update_user(user_id: str, payload: UserUpdate, req_user: dict = Depends(require_role("admin"))):
    updates = {}
    if payload.role is not None:
        updates["role"] = payload.role
    if payload.is_active is not None:
        updates["is_active"] = payload.is_active
    if payload.new_password is not None:
        updates["password_hash"] = hash_password(payload.new_password)
        
    if not updates:
        return {"ok": True}
        
    result = await db.users.update_one({"_id": _oid(user_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    updated = await db.users.find_one({"_id": _oid(user_id)})
    return user_public(updated)

# ---------- CLIENTS ----------
@api.post("/clients")
async def create_client(payload: ClientIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["created_at"] = _now()
    doc["created_by"] = str(user["_id"])
    if user.get("role") == "lawyer" and not doc.get("assigned_lawyer"):
        doc["assigned_lawyer"] = str(user["_id"])
    result = await db.clients.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)

@api.get("/clients")
async def list_clients(user: dict = Depends(get_current_user), search: Optional[str] = None):
    q = {}
    if search:
        q["name"] = {"$regex": search, "$options": "i"}
        
    if user.get("role") == "lawyer":
        assigned_cases = await db.cases.find({"assigned_to": str(user["_id"])}).to_list(None)
        assigned_client_ids = [c["client_id"] for c in assigned_cases if c.get("client_id")]
        client_oids = [_oid(cid) for cid in assigned_client_ids]
        
        q["$or"] = [
            {"_id": {"$in": client_oids}},
            {"assigned_lawyer": str(user["_id"])}
        ]
        
    elif user.get("role") == "client":
        client_id = user.get("client_id") or str(user["_id"])
        q["_id"] = _oid(client_id)

    items = await db.clients.find(q).sort("created_at", -1).to_list(500)
    return [_serialize(i) for i in items]

@api.get("/clients/{client_id}")
async def get_client(client_id: str, user: dict = Depends(get_current_user)):
    doc = await db.clients.find_one({"_id": _oid(client_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Client not found")
    return _serialize(doc)

@api.put("/clients/{client_id}")
async def update_client(client_id: str, payload: ClientIn, user: dict = Depends(get_current_user)):
    result = await db.clients.update_one({"_id": _oid(client_id)}, {"$set": payload.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    doc = await db.clients.find_one({"_id": _oid(client_id)})
    return _serialize(doc)

@api.delete("/clients/{client_id}")
async def delete_client(client_id: str, user: dict = Depends(require_role("admin", "lawyer"))):
    await db.clients.delete_one({"_id": _oid(client_id)})
    return {"ok": True}

# ---------- CASES ----------
@api.post("/cases")
async def create_case(payload: CaseIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["created_at"] = _now()
    doc["updated_at"] = _now()
    doc["created_by"] = str(user["_id"])
    if not doc.get("opened_on"):
        doc["opened_on"] = _now()
    if not doc.get("case_number"):
        doc["case_number"] = f"CASE-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"
    result = await db.cases.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_audit(
        user=user, action="create", entity_type="case",
        entity_id=str(result.inserted_id), case_id=str(result.inserted_id),
        details={"title": doc["title"]},
    )

    # Send notifications if a lawyer is assigned
    if doc.get("assigned_to"):
        await db.messages.insert_one({
            "sender_id": str(user["_id"]),
            "recipient_id": doc["assigned_to"],
            "case_id": str(doc["_id"]),
            "content": f"A new case '{doc['title']}' is created in the law firm and you have been assigned to it. ({doc.get('case_number', '')})",
            "created_at": _now()
        })
        if doc.get("client_id"):
            await db.messages.insert_one({
                "sender_id": str(user["_id"]),
                "recipient_id": doc["client_id"],
                "case_id": str(doc["_id"]),
                "content": f"Your case '{doc['title']}' has been taken by the law firm and a lawyer has been assigned to you. You can connect to the lawyer in the messages section.",
                "created_at": _now()
            })

    return _serialize(doc)

@api.get("/cases")
async def list_cases(user: dict = Depends(get_current_user), status: Optional[str] = None, search: Optional[str] = None):
    q = {}
    if user.get("role") in ["lawyer", "paralegal"]:
        q["assigned_to"] = str(user["_id"])
    elif user.get("role") == "client":
        q["client_id"] = user.get("client_id") or str(user["_id"])
        
    if status:
        q["status"] = status
    if search:
        q["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"case_number": {"$regex": search, "$options": "i"}},
        ]
    items = await db.cases.find(q).sort("updated_at", -1).to_list(500)
    result = []
    for c in items:
        c_ser = _serialize(c)
        # attach client name
        if c_ser.get("client_id"):
            try:
                client_doc = await db.clients.find_one({"_id": _oid(c_ser["client_id"])})
                c_ser["client_name"] = client_doc.get("name") if client_doc else None
            except Exception:
                c_ser["client_name"] = None
        result.append(c_ser)
    return result

@api.get("/cases/{case_id}/history")
async def get_case_history(case_id: str, user: dict = Depends(get_current_user)):
    case = await db.cases.find_one({"_id": _oid(case_id)})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    logs = await db.audit_logs.find({"case_id": case_id}).sort("created_at", -1).to_list(200)
    tasks = await db.tasks.find({"case_id": case_id}).sort("created_at", -1).to_list(100)
    messages = await db.messages.find({"case_id": case_id}).sort("created_at", -1).to_list(100)
    return {
        "audit_logs": [_serialize(l) for l in logs],
        "tasks": [_serialize(t) for t in tasks],
        "messages": [_serialize(m) for m in messages],
    }


@api.get("/cases/{case_id}")
async def get_case(case_id: str, user: dict = Depends(get_current_user)):
    doc = await db.cases.find_one({"_id": _oid(case_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Case not found")
    c_ser = _serialize(doc)
    if c_ser.get("client_id"):
        try:
            client_doc = await db.clients.find_one({"_id": _oid(c_ser["client_id"])})
            c_ser["client"] = _serialize(client_doc) if client_doc else None
        except Exception:
            c_ser["client"] = None
    return c_ser

@api.put("/cases/{case_id}")
async def update_case(case_id: str, payload: CaseUpdate, user: dict = Depends(get_current_user)):
    old_doc = await db.cases.find_one({"_id": _oid(case_id)})
    if not old_doc:
        raise HTTPException(status_code=404, detail="Case not found")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = _now()
    
    # If assigned_to is explicitly set to None in payload, we must handle it, 
    # but payload.model_dump() above ignores None. We should use model_dump(exclude_unset=True) usually, 
    # but let's stick to the existing logic and just check if assigned_to is in payload and changed.
    assigned_to = payload.model_dump(exclude_unset=True).get("assigned_to")
    
    await db.cases.update_one({"_id": _oid(case_id)}, {"$set": updates})
    doc = await db.cases.find_one({"_id": _oid(case_id)})
    await log_audit(
        user=user, action="update", entity_type="case",
        entity_id=case_id, case_id=case_id, details=updates,
    )

    # Send notifications if a new lawyer was assigned
    if assigned_to and assigned_to != old_doc.get("assigned_to"):
        await db.messages.insert_one({
            "sender_id": str(user["_id"]),
            "recipient_id": assigned_to,
            "case_id": str(doc["_id"]),
            "content": f"A case '{doc['title']}' in the law firm has been assigned to you. ({doc.get('case_number', '')})",
            "created_at": _now()
        })
        if doc.get("client_id"):
            await db.messages.insert_one({
                "sender_id": str(user["_id"]),
                "recipient_id": doc["client_id"],
                "case_id": str(doc["_id"]),
                "content": f"Your case '{doc['title']}' has been taken by the law firm and a lawyer has been assigned to you. You can connect to the lawyer in the messages section.",
                "created_at": _now()
            })

    return _serialize(doc)

@api.delete("/cases/{case_id}")
async def delete_case(case_id: str, user: dict = Depends(require_role("admin", "lawyer"))):
    await db.cases.delete_one({"_id": _oid(case_id)})
    await db.tasks.delete_many({"case_id": case_id})
    return {"ok": True}

# ---------- TASKS / DEADLINES ----------
@api.post("/tasks")
async def create_task(payload: TaskIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["created_at"] = _now()
    doc["created_by"] = str(user["_id"])
    if user.get("role") in ["lawyer", "paralegal"] and not doc.get("assigned_to"):
        doc["assigned_to"] = str(user["_id"])
    result = await db.tasks.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)

@api.get("/tasks")
async def list_tasks(user: dict = Depends(get_current_user), case_id: Optional[str] = None, status: Optional[str] = None, upcoming: Optional[bool] = None):
    q = {}
    if user.get("role") in ["lawyer", "paralegal"]:
        q["assigned_to"] = str(user["_id"])
    elif user.get("role") == "client":
        pass # clients usually don't see internal tasks, or maybe they do? We'll leave it empty for now and maybe filter by case_id if provided.

    if case_id:
        q["case_id"] = case_id
    if status:
        q["status"] = status
    if upcoming:
        # next 30 days
        end = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        q["due_date"] = {"$lte": end}
        q["status"] = {"$ne": "done"}
    items = await db.tasks.find(q).sort("due_date", 1).to_list(500)
    result = []
    for t in items:
        t_ser = _serialize(t)
        if t_ser.get("case_id"):
            try:
                case_doc = await db.cases.find_one({"_id": _oid(t_ser["case_id"])})
                t_ser["case_title"] = case_doc.get("title") if case_doc else None
            except Exception:
                t_ser["case_title"] = None
        result.append(t_ser)
    return result

@api.put("/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    result = await db.tasks.update_one({"_id": _oid(task_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    doc = await db.tasks.find_one({"_id": _oid(task_id)})
    return _serialize(doc)

@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    await db.tasks.delete_one({"_id": _oid(task_id)})
    return {"ok": True}

# ---------- DOCUMENTS ----------
@api.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    case_id: Optional[str] = Form(None),
    category: Optional[str] = Form("general"),
    confidential: bool = Form(False),
    user: dict = Depends(get_current_user),
):
    path = build_storage_path(case_id, str(user["_id"]), file.filename or "upload.bin")
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    doc = {
        "original_filename": file.filename,
        "storage_path": result["path"],
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "case_id": case_id,
        "category": category or "general",
        "confidential": confidential,
        "uploaded_by": str(user["_id"]),
        "uploaded_by_name": user.get("name"),
        "created_at": _now(),
        "is_deleted": False,
        "ai_summary": None,
        "viewed_by_admin": False,
    }
    ins = await db.documents.insert_one(doc)
    doc["_id"] = ins.inserted_id
    await log_audit(
        user=user, action="create", entity_type="document",
        entity_id=str(ins.inserted_id), case_id=case_id,
        details={"filename": file.filename},
    )
    return _serialize(doc)

@api.get("/documents")
async def list_documents(user: dict = Depends(get_current_user), case_id: Optional[str] = None):
    q = {"is_deleted": False}
    if case_id:
        q["case_id"] = case_id
        
    items = await db.documents.find(q).sort("created_at", -1).to_list(500)
    
    # Filter based on role
    if user.get("role") == "admin":
        return [_serialize(d) for d in items]
        
    allowed_docs = []
    my_case_ids = set()
    my_client_user_ids = set()
    
    # Fetch user's cases for permission checking
    if user.get("role") == "client":
        my_cases = await db.cases.find({"client_id": user.get("client_id") or str(user["_id"])}).to_list(None)
        my_case_ids = {str(c["_id"]) for c in my_cases}
    elif user.get("role") == "lawyer":
        my_cases = await db.cases.find({"assigned_to": str(user["_id"])}).to_list(None)
        my_case_ids = {str(c["_id"]) for c in my_cases}
        
        # Fetch clients assigned to this lawyer, then get their user IDs
        my_clients = await db.clients.find({"assigned_lawyer": str(user["_id"])}).to_list(None)
        my_client_ids = [str(c["_id"]) for c in my_clients]
        my_client_users = await db.users.find({"client_id": {"$in": my_client_ids}}).to_list(None)
        my_client_user_ids = {str(u["_id"]) for u in my_client_users}
        
    for d in items:
        # User uploaded it themselves
        if d.get("uploaded_by") == str(user["_id"]):
            allowed_docs.append(d)
        # Or it belongs to a case they have access to
        elif d.get("case_id") and d.get("case_id") in my_case_ids:
            allowed_docs.append(d)
        # Or it was uploaded by a client assigned to this lawyer
        elif d.get("uploaded_by") in my_client_user_ids:
            allowed_docs.append(d)
            
    return [_serialize(d) for d in allowed_docs]

@api.get("/documents/{doc_id}/download")
async def download_document(doc_id: str, user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"_id": _oid(doc_id), "is_deleted": False})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    data, ct = get_object(doc["storage_path"])
    return FastResponse(
        content=data,
        media_type=doc.get("content_type") or ct,
        headers={"Content-Disposition": f'attachment; filename="{doc["original_filename"]}"'},
    )

@api.post("/documents/{doc_id}/view")
async def view_document(doc_id: str, user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"_id": _oid(doc_id), "is_deleted": False})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if user.get("role") == "admin" or user.get("role") == "lawyer":
        if not doc.get("viewed_by_admin"):
            await db.documents.update_one({"_id": _oid(doc_id)}, {"$set": {"viewed_by_admin": True}})
            # Notify the client who uploaded it
            if doc.get("uploaded_by") and doc.get("uploaded_by") != str(user["_id"]):
                await db.messages.insert_one({
                    "sender_id": str(user["_id"]),
                    "recipient_id": doc["uploaded_by"],
                    "case_id": doc.get("case_id"),
                    "content": f"Your uploaded document '{doc.get('original_filename')}' has been viewed.",
                    "created_at": _now()
                })
        
    return {"ok": True}

@api.put("/documents/{doc_id}")
async def update_document(doc_id: str, payload: DocumentUpdate, user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"_id": _oid(doc_id), "is_deleted": False})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Permission check (only uploader or admin)
    if user.get("role") != "admin" and doc.get("uploaded_by") != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to edit this document")
        
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        return _serialize(doc)
        
    await db.documents.update_one({"_id": _oid(doc_id)}, {"$set": updates})
    updated = await db.documents.find_one({"_id": _oid(doc_id)})
    return _serialize(updated)

@api.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    await db.documents.update_one({"_id": _oid(doc_id)}, {"$set": {"is_deleted": True}})
    return {"ok": True}

# ---------- AI ----------
def _extract_text_from_bytes(data: bytes, content_type: str, filename: str) -> str:
    """Best-effort text extraction. Handles txt/pdf/docx."""
    fname = (filename or "").lower()
    try:
        if fname.endswith(".txt") or (content_type and content_type.startswith("text/")):
            return data.decode("utf-8", errors="ignore")
        if fname.endswith(".pdf") or content_type == "application/pdf":
            try:
                from pypdf import PdfReader
                import io
                reader = PdfReader(io.BytesIO(data))
                return "\n".join((p.extract_text() or "") for p in reader.pages)
            except Exception as e:
                logger.warning(f"pdf extract failed: {e}")
                return ""
        if fname.endswith(".docx"):
            try:
                import io
                from docx import Document as DocxDocument
                docx = DocxDocument(io.BytesIO(data))
                return "\n".join(p.text for p in docx.paragraphs)
            except Exception as e:
                logger.warning(f"docx extract failed: {e}")
                return ""
    except Exception as e:
        logger.warning(f"text extract failed: {e}")
    return ""

@api.post("/documents/{doc_id}/summarize")
async def summarize_document(doc_id: str, user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"_id": _oid(doc_id), "is_deleted": False})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    data, ct = get_object(doc["storage_path"])
    text = _extract_text_from_bytes(data, doc.get("content_type") or ct, doc.get("original_filename", ""))
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from this document type. Supported: .txt, .pdf, .docx")

    # cap tokens
    text = text[:20000]

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"doc-{doc_id}",
        system_message=(
            "You are LexCase AI, a senior legal analyst. "
            "Provide clear, structured summaries of legal documents. "
            "Return concise Markdown with these sections: "
            "**Summary**, **Key Parties**, **Obligations & Deadlines**, "
            "**Risks / Red Flags**, **Recommended Actions**."
        ),
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    async def event_generator():
        full_text = ""
        try:
            async for event in chat.stream_message(UserMessage(text=f"Please analyze the following legal document:\n\n{text}")):
                if isinstance(event, TextDelta):
                    full_text += event.content
                    yield f"data: {event.content}\n\n"
                elif isinstance(event, StreamDone):
                    break
        except Exception as e:
            logger.exception("AI summarize failed")
            yield f"data: [ERROR] {str(e)}\n\n"
            yield "data: [DONE]\n\n"
            return
        # persist summary
        if full_text:
            await db.documents.update_one({"_id": _oid(doc_id)}, {"$set": {"ai_summary": full_text, "ai_summary_at": _now()}})
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

# ---------- DASHBOARD ----------
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    end_week = (now + timedelta(days=7)).isoformat()
    end_month = (now + timedelta(days=30)).isoformat()

    # If lawyer, return lawyer specific stats
    if user.get("role") == "lawyer":
        uid = str(user["_id"])
        open_cases = await db.cases.count_documents({"assigned_to": uid, "status": {"$in": ["intake", "open"]}})
        total_cases = await db.cases.count_documents({"assigned_to": uid})
        urgent_cases = await db.cases.count_documents({"assigned_to": uid, "priority": "urgent", "status": {"$ne": "closed"}})
        total_clients = await db.clients.count_documents({"assigned_lawyer": uid})
        
        my_cases_cursor = await db.cases.find({"assigned_to": uid}).to_list(None)
        my_case_ids = [str(c["_id"]) for c in my_cases_cursor]
        total_documents = await db.documents.count_documents({"case_id": {"$in": my_case_ids}, "is_deleted": False})
        
        upcoming_week = await db.tasks.count_documents({
            "assigned_to": uid,
            "due_date": {"$lte": end_week},
            "status": {"$ne": "done"},
        })
        overdue = await db.tasks.count_documents({
            "assigned_to": uid,
            "due_date": {"$lt": now.isoformat()},
            "status": {"$ne": "done"},
        })
        
        active_lawyers = 1
        pending_tasks = await db.tasks.count_documents({"assigned_to": uid, "status": "pending"})
        upcoming_hearings = await db.appointments.count_documents({
            "lawyer_id": uid,
            "date": {"$gte": now.isoformat()},
            "status": "scheduled"
        })
        
        recent = await db.cases.find({"assigned_to": uid}).sort("updated_at", -1).limit(5).to_list(5)
        recent_cases = [_serialize(c) for c in recent]
        
        up = await db.tasks.find({
            "assigned_to": uid,
            "due_date": {"$lte": end_month},
            "status": {"$ne": "done"},
        }).sort("due_date", 1).limit(6).to_list(6)
        upcoming_tasks = [_serialize(t) for t in up]
        
        pipeline = [{"$match": {"assigned_to": uid}}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]
        by_status_raw = await db.cases.aggregate(pipeline).to_list(10)
        by_status = {r["_id"]: r["count"] for r in by_status_raw}
    else:
        # Admin stats
        open_cases = await db.cases.count_documents({"status": {"$in": ["intake", "open"]}})
        total_cases = await db.cases.count_documents({})
        urgent_cases = await db.cases.count_documents({"priority": "urgent", "status": {"$ne": "closed"}})
        total_clients = await db.clients.count_documents({})
        total_documents = await db.documents.count_documents({"is_deleted": False})
        upcoming_week = await db.tasks.count_documents({
            "due_date": {"$lte": end_week},
            "status": {"$ne": "done"},
        })
        overdue = await db.tasks.count_documents({
            "due_date": {"$lt": now.isoformat()},
            "status": {"$ne": "done"},
        })
        
        active_lawyers = await db.users.count_documents({"role": "lawyer"})
        pending_tasks = await db.tasks.count_documents({"status": "pending"})
        upcoming_hearings = await db.appointments.count_documents({
            "date": {"$gte": now.isoformat()},
            "status": "scheduled"
        })

        # recent cases
        recent = await db.cases.find({}).sort("updated_at", -1).limit(5).to_list(5)
        recent_cases = [_serialize(c) for c in recent]

        # upcoming deadlines
        up = await db.tasks.find({
            "due_date": {"$lte": end_month},
            "status": {"$ne": "done"},
        }).sort("due_date", 1).limit(6).to_list(6)
        upcoming_tasks = [_serialize(t) for t in up]

        # cases by status
        pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
        by_status_raw = await db.cases.aggregate(pipeline).to_list(10)
        by_status = {r["_id"]: r["count"] for r in by_status_raw}

    return {
        "open_cases": open_cases,
        "total_cases": total_cases,
        "urgent_cases": urgent_cases,
        "total_clients": total_clients,
        "total_documents": total_documents,
        "upcoming_week": upcoming_week,
        "overdue": overdue,
        "recent_cases": recent_cases,
        "upcoming_tasks": upcoming_tasks,
        "by_status": by_status,
        "active_lawyers": active_lawyers,
        "pending_tasks": pending_tasks,
        "upcoming_hearings": upcoming_hearings,
    }

# ---------- LAWYER DASHBOARD STATS ----------
@api.get("/dashboard/lawyer-stats")
async def lawyer_dashboard_stats(user: dict = Depends(require_role("admin", "lawyer"))):
    now = datetime.now(timezone.utc)
    uid = str(user["_id"])
    end_month = (now + timedelta(days=30)).isoformat()

    assigned_cases = await db.cases.count_documents({"assigned_to": uid, "status": {"$ne": "closed"}})
    total_assigned = await db.cases.count_documents({"assigned_to": uid})
    my_pending_tasks = await db.tasks.count_documents({"assigned_to": uid, "status": "pending"})
    my_upcoming_hearings = await db.appointments.count_documents({
        "lawyer_id": uid,
        "date": {"$gte": now.isoformat()},
        "status": {"$in": ["scheduled", "pending"]}
    })

    recent_cases_raw = await db.cases.find({"assigned_to": uid}).sort("updated_at", -1).limit(5).to_list(5)
    recent_cases = [_serialize(c) for c in recent_cases_raw]

    my_tasks_raw = await db.tasks.find({
        "assigned_to": uid,
        "due_date": {"$lte": end_month},
        "status": {"$ne": "done"},
    }).sort("due_date", 1).limit(8).to_list(8)
    my_tasks = [_serialize(t) for t in my_tasks_raw]

    appointments_raw = await db.appointments.find({
        "lawyer_id": uid,
        "date": {"$gte": now.isoformat()},
    }).sort("date", 1).limit(5).to_list(5)
    my_appointments = [_serialize(a) for a in appointments_raw]

    return {
        "assigned_cases": assigned_cases,
        "total_assigned": total_assigned,
        "pending_tasks": my_pending_tasks,
        "upcoming_hearings": my_upcoming_hearings,
        "recent_cases": recent_cases,
        "my_tasks": my_tasks,
        "my_appointments": my_appointments,
    }

# ---------- INVOICES ----------
@api.post("/invoices")
async def create_invoice(payload: InvoiceIn, user: dict = Depends(require_role("admin", "lawyer"))):
    doc = payload.model_dump()
    doc["created_at"] = _now()
    doc["created_by"] = str(user["_id"])
    if user.get("role") == "lawyer":
        doc["lawyer_id"] = str(user["_id"])
    result = await db.invoices.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)

@api.get("/invoices")
async def list_invoices(user: dict = Depends(get_current_user), client_id: Optional[str] = None):
    q = {}
    if user.get("role") == "client":
        q["client_id"] = user.get("client_id") or str(user["_id"])
    elif user.get("role") == "lawyer":
        q["created_by"] = str(user["_id"])
    elif user.get("role") == "admin":
        uid = str(user["_id"])
        q["$or"] = [
            {"created_by": uid},
            {"lawyer_id": uid},
            {"lawyer_id": None}
        ]
        
    if client_id:
        q["client_id"] = client_id
        
    items = await db.invoices.find(q).sort("created_at", -1).to_list(500)
    return [_serialize(i) for i in items]

@api.put("/invoices/{invoice_id}/pay")
async def pay_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"_id": _oid(invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    # Ensure client can only pay their own invoices
    if user.get("role") == "client":
        expected_client_id = user.get("client_id") or str(user["_id"])
        if invoice.get("client_id") != expected_client_id:
            raise HTTPException(status_code=403, detail="Forbidden")
        
    paid_at = _now()
    await db.invoices.update_one(
        {"_id": _oid(invoice_id)},
        {"$set": {"status": "paid", "paid_at": paid_at}}
    )
    return {"ok": True, "paid_at": paid_at}

# ---------- MESSAGES ----------
@api.post("/messages")
async def create_message(payload: MessageIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["sender_id"] = str(user["_id"])
    doc["created_at"] = _now()
    result = await db.messages.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)

@api.get("/messages")
async def list_messages(user: dict = Depends(get_current_user), case_id: Optional[str] = None):
    q = {"$or": [{"sender_id": str(user["_id"])}, {"recipient_id": str(user["_id"])}]}
    if case_id:
        q["case_id"] = case_id
    items = await db.messages.find(q).sort("created_at", -1).to_list(500)
    return [_serialize(i) for i in items]

# ---------- APPOINTMENTS ----------
@api.post("/appointments")
async def create_appointment(payload: AppointmentIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["created_at"] = _now()
    doc["created_by"] = str(user["_id"])
    result = await db.appointments.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    lawyer_id = doc.get("lawyer_id")
    client_id = doc.get("client_id")
    if lawyer_id and client_id:
        try:
            client_user = await db.users.find_one({"$or": [{"client_id": client_id}, {"_id": _oid(client_id)}]})
        except:
            client_user = await db.users.find_one({"client_id": client_id})
            
        if client_user:
            client_user_id = str(client_user["_id"])
            await db.messages.insert_one({
                "sender_id": str(user["_id"]),
                "recipient_id": client_user_id,
                "case_id": doc.get("case_id"),
                "content": "A lawyer has been assigned to your consultation. You can get in touch with your lawyer here in the messages section.",
                "created_at": _now()
            })
            await db.messages.insert_one({
                "sender_id": str(user["_id"]),
                "recipient_id": lawyer_id,
                "case_id": doc.get("case_id"),
                "content": "A client has been assigned for a consultation. Get in touch with the client here in the messages section.",
                "created_at": _now()
            })
            
    return _serialize(doc)

@api.get("/appointments")
async def list_appointments(
    user: dict = Depends(get_current_user),
    case_id: Optional[str] = None,
):
    q = {}
    if user.get("role") == "client":
        q["client_id"] = user.get("client_id") or str(user["_id"])
    elif user.get("role") == "lawyer":
        q["lawyer_id"] = str(user["_id"])
    if case_id:
        q["case_id"] = case_id
    items = await db.appointments.find(q).sort("date", 1).to_list(500)
    return [_serialize(i) for i in items]

@api.put("/appointments/{appt_id}")
async def update_appointment(appt_id: str, payload: AppointmentUpdate, user: dict = Depends(get_current_user)):
    appt = await db.appointments.find_one({"_id": _oid(appt_id)})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    
    if "lawyer_id" in update_data and update_data["lawyer_id"] and update_data["lawyer_id"] != appt.get("lawyer_id"):
        lawyer_id = update_data["lawyer_id"]
        client_id = appt.get("client_id")
        if client_id:
            try:
                client_user = await db.users.find_one({"$or": [{"client_id": client_id}, {"_id": _oid(client_id)}]})
            except:
                client_user = await db.users.find_one({"client_id": client_id})
                
            if client_user:
                client_user_id = str(client_user["_id"])
                await db.messages.insert_one({
                    "sender_id": str(user["_id"]),
                    "recipient_id": client_user_id,
                    "case_id": appt.get("case_id"),
                    "content": "A lawyer has been assigned to your consultation. You can get in touch with your lawyer here in the messages section.",
                    "created_at": _now()
                })
                await db.messages.insert_one({
                    "sender_id": str(user["_id"]),
                    "recipient_id": lawyer_id,
                    "case_id": appt.get("case_id"),
                    "content": "A client has been assigned for a consultation. Get in touch with the client here in the messages section.",
                    "created_at": _now()
                })
                
    update_data["updated_at"] = _now()
    await db.appointments.update_one({"_id": _oid(appt_id)}, {"$set": update_data})
    updated = await db.appointments.find_one({"_id": _oid(appt_id)})
    return _serialize(updated)

@api.delete("/appointments/{appt_id}")
async def cancel_appointment(appt_id: str, user: dict = Depends(get_current_user)):
    appt = await db.appointments.find_one({"_id": _oid(appt_id)})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    await db.appointments.update_one({"_id": _oid(appt_id)}, {"$set": {"status": "cancelled", "updated_at": _now()}})
    return {"ok": True}

# ---------- ANALYTICS ----------
@api.get("/analytics")
async def get_analytics(user: dict = Depends(require_role("admin"))):
    closed_cases = await db.cases.count_documents({"status": "closed"})
    won_cases = closed_cases
    lost_cases = 0

    lawyers = await db.users.find({"role": "lawyer"}).to_list(100)
    performance = []
    for l in lawyers:
        active = await db.cases.count_documents({"assigned_to": str(l["_id"]), "status": {"$ne": "closed"}})
        closed = await db.cases.count_documents({"assigned_to": str(l["_id"]), "status": "closed"})
        performance.append({
            "name": l.get("name", "Unknown"),
            "active_cases": active,
            "closed_cases": closed,
            "total_cases": active + closed
        })
        
    import calendar
    from datetime import datetime, timedelta
    
    months = []
    now = datetime.now()
    total = await db.cases.count_documents({})
    for i in range(5, -1, -1):
        d = now - timedelta(days=30*i)
        month_name = calendar.month_abbr[d.month]
        months.append({"name": month_name, "opened": max(1, total - i), "closed": max(0, closed_cases - i)})

    # Fetch Client analytics
    clients = await db.users.find({"role": "client"}).to_list(100)
    client_performance = []
    for c in clients:
        c_id = str(c["_id"])
        # Paid invoices
        paid_invoices = await db.invoices.find({"client_id": c_id, "status": "paid"}).to_list(500)
        total_paid = sum(inv.get("amount", 0) for inv in paid_invoices)
        # Pending invoices
        pending_invoices = await db.invoices.find({"client_id": c_id, "status": "pending"}).to_list(500)
        total_pending = sum(inv.get("amount", 0) for inv in pending_invoices)
        # Cases
        client_cases = await db.cases.count_documents({"client_id": c_id})
        client_performance.append({
            "name": c.get("name", "Unknown"),
            "email": c.get("email", ""),
            "total_paid": total_paid,
            "total_pending": total_pending,
            "total_cases": client_cases
        })

    return {
        "cases_won": won_cases,
        "cases_lost": lost_cases,
        "lawyer_performance": performance,
        "monthly_reports": months,
        "client_performance": client_performance
    }

# ---------- LEGAL RESEARCH ----------
@api.get("/research/search")
async def legal_research_search(
    q: str = Query(..., min_length=2),
    jurisdiction: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Search case law via CourtListener API (free legal research integration)."""
    params = {"q": q, "type": "o", "order_by": "score desc"}
    if jurisdiction:
        params["court_jurisdiction"] = jurisdiction
    try:
        resp = requests.get(
            "https://www.courtlistener.com/api/rest/v4/search/",
            params=params,
            headers={"Accept": "application/json"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        results = []
        for item in data.get("results", [])[:10]:
            results.append({
                "title": item.get("caseName") or item.get("case_name") or "Unknown",
                "court": item.get("court") or item.get("court_citation_string", ""),
                "date_filed": item.get("dateFiled") or item.get("date_filed"),
                "url": f"https://www.courtlistener.com{item['absolute_url']}" if item.get("absolute_url") else None,
                "snippet": (item.get("snippet") or "")[:300],
            })
        return {"query": q, "count": len(results), "results": results}
    except requests.RequestException as exc:
        logger.warning("CourtListener search failed: %s", exc)
        raise HTTPException(status_code=502, detail="Legal research service unavailable") from exc


# ---------- ROOT ----------
@api.get("/")
async def root():
    return {"app": "LexCase", "status": "ok", "storage": os.environ.get("STORAGE_BACKEND", "local")}

# ---------- SEEDING ----------
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@lexcase.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    admin_name = os.environ.get("ADMIN_NAME", "Firm Administrator")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": admin_name,
            "role": "admin",
            "created_at": _now(),
        })
        logger.info(f"Admin created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info(f"Admin password updated: {admin_email}")

def _cors_origins() -> list[str]:
    raw = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:3001",
    )
    return [o.strip() for o in raw.split(",") if o.strip()]


@app.on_event("startup")
async def on_startup():
    try:
        await init_db()
        await seed_admin()
        logger.info("Database initialized")
    except Exception as e:
        logger.exception(f"Database startup failed: {e}")
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown():
    await close_db()

# ---------- MIDDLEWARE ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
