from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

SECRET_KEY = os.environ.get('JWT_SECRET', 'fethmes-secret-key-2025')
ALGORITHM = "HS256"

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable format"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == '_id':
                continue  # Skip MongoDB _id field
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = serialize_doc(value)
            else:
                result[key] = value
        return result
    return doc

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    full_name: str
    role: Literal["admin", "supervisor", "worker"]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: Literal["admin", "supervisor", "worker"]

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    full_name: str
    role: str
    created_at: datetime

class Machine(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    status: Literal["idle", "running", "stopped", "pause"] = "idle"
    current_work_order_id: Optional[str] = None
    current_worker_id: Optional[str] = None
    current_task_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MachineCreate(BaseModel):
    name: str
    code: str

class MachineUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    status: Optional[Literal["idle", "running", "stopped", "pause"]] = None

class WorkOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_no: str
    part_name: str
    quantity: int
    description: Optional[str] = None
    status: Literal["pending", "assigned", "in_progress", "completed", "cancelled"] = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class WorkOrderCreate(BaseModel):
    order_no: str
    part_name: str
    quantity: int
    description: Optional[str] = None

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    work_order_id: str
    machine_id: str
    assigned_worker_id: Optional[str] = None
    assigned_by: str
    status: Literal["assigned", "preparation", "in_progress", "paused", "completed", "cancelled"] = "assigned"
    quantity_assigned: int
    quantity_completed: int = 0
    assigned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaskCreate(BaseModel):
    work_order_id: str
    machine_id: str
    quantity_assigned: int

class WorkLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str
    worker_id: str
    machine_id: str
    event_type: Literal["prep_start", "prep_end", "work_start", "work_pause", "work_resume", "work_complete"]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    pause_reason: Optional[Literal["break", "failure", "material_shortage", "toilet", "prayer", "meal"]] = None
    quantity_completed: Optional[int] = None
    notes: Optional[str] = None

class WorkLogCreate(BaseModel):
    task_id: str
    event_type: Literal["prep_start", "prep_end", "work_start", "work_pause", "work_resume", "work_complete"]
    pause_reason: Optional[Literal["break", "failure", "material_shortage", "toilet", "prayer", "meal"]] = None
    quantity_completed: Optional[int] = None
    notes: Optional[str] = None

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    user = await db.users.find_one({"username": login_data.username}, {"_id": 0})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı")
    
    token = create_access_token({"user_id": user["id"], "role": user["role"]})
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    return {"token": token, "user": user_response}

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten mevcut")
    
    user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role
    )
    doc = user.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.users.insert_one(doc)
    
    response_dict = {k: v for k, v in doc.items() if k != "password_hash"}
    if isinstance(response_dict["created_at"], str):
        response_dict["created_at"] = datetime.fromisoformat(response_dict["created_at"])
    return response_dict

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    update_dict = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if "password" in update_dict:
        update_dict["password_hash"] = hash_password(update_dict.pop("password"))
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="Güncellenecek veri yok")
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if isinstance(user["created_at"], str):
        user["created_at"] = datetime.fromisoformat(user["created_at"])
    return user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return {"message": "Kullanıcı silindi"}

@api_router.get("/machines")
async def get_machines(current_user: dict = Depends(get_current_user)):
    machines = await db.machines.find({}, {"_id": 0}).to_list(1000)
    return machines

@api_router.post("/machines")
async def create_machine(machine_data: MachineCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    existing = await db.machines.find_one({"code": machine_data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Bu makine kodu zaten mevcut")
    
    machine = Machine(**machine_data.model_dump())
    doc = machine.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.machines.insert_one(doc)
    return serialize_doc(doc)

@api_router.put("/machines/{machine_id}")
async def update_machine(machine_id: str, machine_data: MachineUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    update_dict = {k: v for k, v in machine_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="Güncellenecek veri yok")
    
    result = await db.machines.update_one({"id": machine_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Makine bulunamadı")
    
    machine = await db.machines.find_one({"id": machine_id}, {"_id": 0})
    return machine

@api_router.delete("/machines/{machine_id}")
async def delete_machine(machine_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    result = await db.machines.delete_one({"id": machine_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Makine bulunamadı")
    return {"message": "Makine silindi"}

@api_router.get("/work-orders")
async def get_work_orders(current_user: dict = Depends(get_current_user)):
    work_orders = await db.work_orders.find({}, {"_id": 0}).to_list(1000)
    return work_orders

@api_router.post("/work-orders")
async def create_work_order(order_data: WorkOrderCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    work_order = WorkOrder(**order_data.model_dump(), created_by=current_user["id"])
    doc = work_order.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.work_orders.insert_one(doc)
    return serialize_doc(doc)

@api_router.delete("/work-orders/{order_id}")
async def delete_work_order(order_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    result = await db.work_orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="İş emri bulunamadı")
    return {"message": "İş emri silindi"}

@api_router.get("/tasks")
async def get_tasks(current_user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(1000)
    return tasks

@api_router.post("/tasks")
async def create_task(task_data: TaskCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    work_order = await db.work_orders.find_one({"id": task_data.work_order_id})
    if not work_order:
        raise HTTPException(status_code=404, detail="İş emri bulunamadı")
    
    machine = await db.machines.find_one({"id": task_data.machine_id})
    if not machine:
        raise HTTPException(status_code=404, detail="Makine bulunamadı")
    
    task = Task(**task_data.model_dump(), assigned_by=current_user["id"])
    doc = task.model_dump()
    doc["assigned_at"] = doc["assigned_at"].isoformat()
    await db.tasks.insert_one(doc)
    
    await db.work_orders.update_one({"id": task_data.work_order_id}, {"$set": {"status": "assigned"}})
    
    return serialize_doc(doc)

@api_router.put("/tasks/{task_id}/claim-worker")
async def claim_worker_to_task(task_id: str, worker_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tasks.update_one({"id": task_id}, {"$set": {"current_worker_id": worker_id}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    return {"message": "İş alındı"}

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    await db.tasks.delete_one({"id": task_id})
    
    await db.machines.update_one(
        {"id": task["machine_id"]},
        {"$set": {"status": "idle", "current_task_id": None, "current_worker_id": None, "current_work_order_id": None}}
    )
    
    return {"message": "Görev geri çekildi"}

@api_router.get("/tasks/worker/{worker_id}")
async def get_worker_tasks(worker_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "worker" and current_user["id"] != worker_id:
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    tasks = await db.tasks.find({"assigned_worker_id": worker_id, "status": {"$nin": ["completed", "cancelled"]}}, {"_id": 0}).to_list(1000)
    return tasks

@api_router.post("/work-logs")
async def create_work_log(log_data: WorkLogCreate, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": log_data.task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    work_log = WorkLog(
        **log_data.model_dump(),
        worker_id=current_user["id"],
        machine_id=task["machine_id"]
    )
    doc = work_log.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.work_logs.insert_one(doc)
    
    if log_data.event_type == "prep_start":
        await db.tasks.update_one({"id": log_data.task_id}, {"$set": {"status": "preparation"}})
        await db.machines.update_one(
            {"id": task["machine_id"]},
            {"$set": {"status": "running", "current_task_id": log_data.task_id, "current_worker_id": current_user["id"], "current_work_order_id": task["work_order_id"]}}
        )
    elif log_data.event_type == "prep_end":
        await db.tasks.update_one({"id": log_data.task_id}, {"$set": {"status": "in_progress"}})
        await db.work_orders.update_one({"id": task["work_order_id"]}, {"$set": {"status": "in_progress"}})
        await db.machines.update_one({"id": task["machine_id"]}, {"$set": {"status": "running"}})
    elif log_data.event_type == "work_start":
        await db.tasks.update_one({"id": log_data.task_id}, {"$set": {"status": "in_progress"}})
        await db.work_orders.update_one({"id": task["work_order_id"]}, {"$set": {"status": "in_progress"}})
        await db.machines.update_one({"id": task["machine_id"]}, {"$set": {"status": "running"}})
    elif log_data.event_type == "work_pause":
        await db.tasks.update_one({"id": log_data.task_id}, {"$set": {"status": "paused"}})
        await db.machines.update_one({"id": task["machine_id"]}, {"$set": {"status": "pause"}})
    elif log_data.event_type == "work_resume":
        await db.tasks.update_one({"id": log_data.task_id}, {"$set": {"status": "in_progress"}})
        await db.machines.update_one({"id": task["machine_id"]}, {"$set": {"status": "running"}})
    elif log_data.event_type == "work_complete":
        quantity_completed = log_data.quantity_completed or 0
        await db.tasks.update_one(
            {"id": log_data.task_id},
            {"$set": {"status": "completed", "quantity_completed": quantity_completed}}
        )
        
        remaining = task["quantity_assigned"] - quantity_completed
        if remaining > 0:
            new_task = Task(
                work_order_id=task["work_order_id"],
                machine_id=task["machine_id"],
                assigned_by=task["assigned_by"],
                status="assigned",
                quantity_assigned=remaining
            )
            new_doc = new_task.model_dump()
            new_doc["assigned_at"] = new_doc["assigned_at"].isoformat()
            await db.tasks.insert_one(new_doc)
        
        all_tasks = await db.tasks.find({"work_order_id": task["work_order_id"]}).to_list(1000)
        all_completed = all([t["status"] == "completed" for t in all_tasks])
        if all_completed:
            await db.work_orders.update_one({"id": task["work_order_id"]}, {"$set": {"status": "completed"}})
        
        await db.machines.update_one(
            {"id": task["machine_id"]},
            {"$set": {"status": "idle", "current_task_id": None, "current_worker_id": None, "current_work_order_id": None}}
        )
    
    return serialize_doc(doc)

@api_router.get("/work-logs/task/{task_id}")
async def get_task_logs(task_id: str, current_user: dict = Depends(get_current_user)):
    logs = await db.work_logs.find({"task_id": task_id}, {"_id": 0}).to_list(1000)
    return logs

@api_router.get("/dashboard/live-status")
async def get_live_status(current_user: dict = Depends(get_current_user)):
    machines = await db.machines.find({}, {"_id": 0}).to_list(1000)
    tasks = await db.tasks.find({"status": {"$in": ["preparation", "in_progress", "paused"]}}, {"_id": 0}).to_list(1000)
    
    machine_status = []
    for machine in machines:
        task_info = None
        worker_info = None
        work_order_info = None
        
        if machine.get("current_task_id"):
            task = next((t for t in tasks if t["id"] == machine["current_task_id"]), None)
            if task:
                task_info = task
                work_order = await db.work_orders.find_one({"id": task["work_order_id"]}, {"_id": 0})
                work_order_info = work_order
                
                if machine.get("current_worker_id"):
                    worker = await db.users.find_one({"id": machine["current_worker_id"]}, {"_id": 0, "password_hash": 0})
                    worker_info = worker
        
        machine_status.append({
            "machine": machine,
            "task": task_info,
            "worker": worker_info,
            "work_order": work_order_info
        })
    
    return machine_status

@api_router.get("/reports/daily")
async def get_daily_report(date: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    try:
        target_date = datetime.fromisoformat(date)
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        
        logs = await db.work_logs.find({
            "timestamp": {
                "$gte": start_of_day.isoformat(),
                "$lt": end_of_day.isoformat()
            }
        }, {"_id": 0}).to_list(10000)
        
        total_production = sum([log.get("quantity_completed", 0) for log in logs if log.get("quantity_completed")])
        
        pause_logs = [log for log in logs if log["event_type"] == "work_pause"]
        pause_reasons = {}
        for log in pause_logs:
            reason = log.get("pause_reason", "unknown")
            pause_reasons[reason] = pause_reasons.get(reason, 0) + 1
        
        return {
            "date": date,
            "total_logs": len(logs),
            "total_production": total_production,
            "pause_reasons": pause_reasons,
            "logs": logs
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/reports/weekly")
async def get_weekly_report(start_date: str, end_date: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    try:
        start = datetime.fromisoformat(start_date).replace(hour=0, minute=0, second=0, microsecond=0)
        end = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59, microsecond=999999)
        
        logs = await db.work_logs.find({
            "timestamp": {
                "$gte": start.isoformat(),
                "$lte": end.isoformat()
            }
        }, {"_id": 0}).to_list(10000)
        
        total_production = sum([log.get("quantity_completed", 0) for log in logs if log.get("quantity_completed")])
        
        pause_logs = [log for log in logs if log["event_type"] == "work_pause"]
        pause_reasons = {}
        for log in pause_logs:
            reason = log.get("pause_reason", "unknown")
            pause_reasons[reason] = pause_reasons.get(reason, 0) + 1
        
        return {
            "start_date": start_date,
            "end_date": end_date,
            "total_logs": len(logs),
            "total_production": total_production,
            "pause_reasons": pause_reasons,
            "logs": logs
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/reports/worker-performance")
async def get_worker_performance(worker_id: str, start_date: str, end_date: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    try:
        start = datetime.fromisoformat(start_date).replace(hour=0, minute=0, second=0, microsecond=0)
        end = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Worker bilgisi
        worker = await db.users.find_one({"id": worker_id}, {"_id": 0, "password_hash": 0})
        if not worker:
            raise HTTPException(status_code=404, detail="Eleman bulunamadı")
        
        # Worker'ın tüm logları
        logs = await db.work_logs.find({
            "worker_id": worker_id,
            "timestamp": {
                "$gte": start.isoformat(),
                "$lte": end.isoformat()
            }
        }, {"_id": 0}).to_list(10000)
        
        # Toplam üretim
        total_production = sum([log.get("quantity_completed", 0) for log in logs if log.get("quantity_completed")])
        
        # Süreleri hesapla
        prep_time = 0  # Ön hazırlık süresi (dakika)
        work_time = 0  # Üretim süresi (dakika)
        pause_times = {
            "break": 0,
            "failure": 0,
            "material_shortage": 0,
            "toilet": 0,
            "prayer": 0,
            "meal": 0
        }  # Mola süreleri (dakika)
        
        # Task bazlı hesaplama
        tasks = await db.tasks.find({
            "current_worker_id": worker_id
        }, {"_id": 0}).to_list(1000)
        
        for task in tasks:
            task_logs = [log for log in logs if log["task_id"] == task["id"]]
            task_logs.sort(key=lambda x: x["timestamp"])
            
            i = 0
            while i < len(task_logs):
                log = task_logs[i]
                
                if log["event_type"] == "prep_start" and i + 1 < len(task_logs):
                    next_log = task_logs[i + 1]
                    if next_log["event_type"] == "prep_end":
                        t1 = datetime.fromisoformat(log["timestamp"])
                        t2 = datetime.fromisoformat(next_log["timestamp"])
                        prep_time += (t2 - t1).total_seconds() / 60
                        i += 2
                        continue
                
                elif log["event_type"] == "work_start" or log["event_type"] == "work_resume":
                    if i + 1 < len(task_logs):
                        next_log = task_logs[i + 1]
                        if next_log["event_type"] in ["work_pause", "work_complete"]:
                            t1 = datetime.fromisoformat(log["timestamp"])
                            t2 = datetime.fromisoformat(next_log["timestamp"])
                            work_time += (t2 - t1).total_seconds() / 60
                            i += 2
                            continue
                
                elif log["event_type"] == "work_pause":
                    if i + 1 < len(task_logs):
                        next_log = task_logs[i + 1]
                        if next_log["event_type"] == "work_resume":
                            t1 = datetime.fromisoformat(log["timestamp"])
                            t2 = datetime.fromisoformat(next_log["timestamp"])
                            pause_duration = (t2 - t1).total_seconds() / 60
                            reason = log.get("pause_reason", "break")
                            if reason in pause_times:
                                pause_times[reason] += pause_duration
                            i += 2
                            continue
                
                i += 1
        
        # Toplam çalışma süresi
        total_work_time = prep_time + work_time
        total_pause_time = sum(pause_times.values())
        
        # Günlük bazda dağılım
        daily_breakdown = {}
        for log in logs:
            log_date = datetime.fromisoformat(log["timestamp"]).date().isoformat()
            if log_date not in daily_breakdown:
                daily_breakdown[log_date] = {
                    "date": log_date,
                    "prep_time": 0,
                    "work_time": 0,
                    "pause_time": 0,
                    "production": 0
                }
        
        return {
            "worker": worker,
            "start_date": start_date,
            "end_date": end_date,
            "summary": {
                "total_production": total_production,
                "total_prep_time_minutes": round(prep_time, 2),
                "total_work_time_minutes": round(work_time, 2),
                "total_work_time_hours": round(total_work_time / 60, 2),
                "total_pause_time_minutes": round(total_pause_time, 2),
                "total_pause_time_hours": round(total_pause_time / 60, 2),
                "pause_breakdown": {
                    "break_minutes": round(pause_times["break"], 2),
                    "failure_minutes": round(pause_times["failure"], 2),
                    "material_shortage_minutes": round(pause_times["material_shortage"], 2),
                    "toilet_minutes": round(pause_times["toilet"], 2),
                    "prayer_minutes": round(pause_times["prayer"], 2),
                    "meal_minutes": round(pause_times["meal"], 2)
                }
            },
            "logs": logs
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/init-data")
async def initialize_data():
    existing_admin = await db.users.find_one({"role": "admin"})
    if existing_admin:
        return {"message": "Veriler zaten mevcut"}
    
    admin = User(
        username="admin",
        password_hash=hash_password("admin123"),
        full_name="Yönetici",
        role="admin"
    )
    admin_doc = admin.model_dump()
    admin_doc["created_at"] = admin_doc["created_at"].isoformat()
    await db.users.insert_one(admin_doc)
    
    supervisor = User(
        username="ustabasi1",
        password_hash=hash_password("usta123"),
        full_name="Ahmet Yılmaz",
        role="supervisor"
    )
    supervisor_doc = supervisor.model_dump()
    supervisor_doc["created_at"] = supervisor_doc["created_at"].isoformat()
    await db.users.insert_one(supervisor_doc)
    
    worker1 = User(
        username="eleman1",
        password_hash=hash_password("eleman123"),
        full_name="Mehmet Demir",
        role="worker"
    )
    worker1_doc = worker1.model_dump()
    worker1_doc["created_at"] = worker1_doc["created_at"].isoformat()
    await db.users.insert_one(worker1_doc)
    
    worker2 = User(
        username="eleman2",
        password_hash=hash_password("eleman123"),
        full_name="Ali Kaya",
        role="worker"
    )
    worker2_doc = worker2.model_dump()
    worker2_doc["created_at"] = worker2_doc["created_at"].isoformat()
    await db.users.insert_one(worker2_doc)
    
    machine1 = Machine(name="Torna 1", code="T001")
    machine1_doc = machine1.model_dump()
    machine1_doc["created_at"] = machine1_doc["created_at"].isoformat()
    await db.machines.insert_one(machine1_doc)
    
    machine2 = Machine(name="Torna 2", code="T002")
    machine2_doc = machine2.model_dump()
    machine2_doc["created_at"] = machine2_doc["created_at"].isoformat()
    await db.machines.insert_one(machine2_doc)
    
    return {"message": "Demo veriler oluşturuldu", "admin": {"username": "admin", "password": "admin123"}, "supervisor": {"username": "ustabasi1", "password": "usta123"}, "worker": {"username": "eleman1", "password": "eleman123"}}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()