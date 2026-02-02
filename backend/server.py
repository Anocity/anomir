from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Scheduler instance
scheduler = AsyncIOScheduler()

async def scheduled_reset_job():
    """Background job to reset confirmed accounts after 30 days"""
    logger.info("Running scheduled reset job...")
    try:
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        
        accounts = await db.accounts.find({
            "confirmed": True,
            "confirmed_at": {"$ne": None}
        }).to_list(1000)
        
        reset_count = 0
        for account in accounts:
            confirmed_at_str = account.get('confirmed_at')
            if confirmed_at_str:
                try:
                    confirmed_at = datetime.fromisoformat(confirmed_at_str.replace('Z', '+00:00'))
                    if confirmed_at < thirty_days_ago:
                        await db.accounts.update_one(
                            {"id": account['id']},
                            {"$set": {
                                "confirmed": False,
                                "confirmed_at": None,
                                "bosses": {
                                    "medio2": 0, "grande2": 0,
                                    "medio4": 0, "grande4": 0,
                                    "medio6": 0, "grande6": 0,
                                    "medio7": 0, "grande7": 0,
                                    "medio8": 0, "grande8": 0
                                },
                                "special_bosses": {
                                    "xama": 0, "praca_4f": 0, "cracha_epica": 0
                                },
                                "gold": 0
                            }}
                        )
                        reset_count += 1
                        logger.info(f"Reset account: {account.get('name', account['id'])}")
                except Exception as e:
                    logger.error(f"Error parsing date for account {account['id']}: {e}")
        
        logger.info(f"Scheduled reset complete. Reset {reset_count} account(s).")
    except Exception as e:
        logger.error(f"Error in scheduled reset job: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app lifecycle - start/stop scheduler"""
    # Start scheduler on startup
    scheduler.add_job(
        scheduled_reset_job,
        IntervalTrigger(hours=6),  # Run every 6 hours
        id="reset_confirmed_accounts",
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started - will check for expired confirmations every 6 hours")
    
    # Run once on startup to catch any missed resets
    asyncio.create_task(scheduled_reset_job())
    
    yield
    
    # Shutdown scheduler
    scheduler.shutdown()
    logger.info("Scheduler stopped")

app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# Models
class BossQuantities(BaseModel):
    medio2: int = Field(default=0, ge=0)
    grande2: int = Field(default=0, ge=0)
    medio4: int = Field(default=0, ge=0)
    grande4: int = Field(default=0, ge=0)
    medio6: int = Field(default=0, ge=0)
    grande6: int = Field(default=0, ge=0)
    medio7: int = Field(default=0, ge=0)
    grande7: int = Field(default=0, ge=0)
    medio8: int = Field(default=0, ge=0)
    grande8: int = Field(default=0, ge=0)

class SpecialBosses(BaseModel):
    xama: int = Field(default=0, ge=0)
    praca_4f: int = Field(default=0, ge=0)
    cracha_epica: int = Field(default=0, ge=0)

class MaterialTier(BaseModel):
    """Quantidade de um material por raridade"""
    raro: int = Field(default=0, ge=0)
    epico: int = Field(default=0, ge=0)
    lendario: int = Field(default=0, ge=0)

class AccountMaterials(BaseModel):
    """Todos os materiais da conta com 3 raridades cada"""
    anima: MaterialTier = Field(default_factory=MaterialTier)
    bugiganga: MaterialTier = Field(default_factory=MaterialTier)
    lunar: MaterialTier = Field(default_factory=MaterialTier)
    iluminado: MaterialTier = Field(default_factory=MaterialTier)
    quintessencia: MaterialTier = Field(default_factory=MaterialTier)
    esfera: MaterialTier = Field(default_factory=MaterialTier)
    platina: MaterialTier = Field(default_factory=MaterialTier)
    aco: MaterialTier = Field(default_factory=MaterialTier)

class CraftResources(BaseModel):
    """Recursos globais para craft"""
    po: int = Field(default=0, ge=0)
    ds: int = Field(default=0, ge=0)
    cobre: int = Field(default=0, ge=0)

class AccountInfo(BaseModel):
    """Informações adicionais da conta"""
    power: int = Field(default=0, ge=0)
    praca: Optional[str] = None  # 4F, 5F, 7F, 8F, 9F, 10F
    praca_atq: Optional[str] = None
    pico: Optional[str] = None
    raid: Optional[str] = None
    raid_boss: Optional[str] = None

class Account(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    bosses: BossQuantities
    sala_pico: str = ""
    special_bosses: SpecialBosses
    materials: AccountMaterials = Field(default_factory=AccountMaterials)
    craft_resources: CraftResources = Field(default_factory=CraftResources)
    craft_item: Optional[str] = None  # Item de criação selecionado
    account_info: AccountInfo = Field(default_factory=AccountInfo)  # Info adicional
    gold: float = Field(default=0, ge=0)
    confirmed: bool = False
    confirmed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AccountCreate(BaseModel):
    name: str
    bosses: BossQuantities
    sala_pico: str = ""
    special_bosses: SpecialBosses
    materials: AccountMaterials = Field(default_factory=AccountMaterials)
    craft_resources: CraftResources = Field(default_factory=CraftResources)
    account_info: AccountInfo = Field(default_factory=AccountInfo)
    gold: float = Field(default=0, ge=0)

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    bosses: Optional[BossQuantities] = None
    sala_pico: Optional[str] = None
    special_bosses: Optional[SpecialBosses] = None
    materials: Optional[AccountMaterials] = None
    craft_resources: Optional[CraftResources] = None
    craft_item: Optional[str] = None
    account_info: Optional[AccountInfo] = None
    gold: Optional[float] = Field(default=None, ge=0)
    confirmed: Optional[bool] = None

class BossPrices(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = "default"
    medio2_price: float = Field(default=0.045, ge=0)
    grande2_price: float = Field(default=0.09, ge=0)
    medio4_price: float = Field(default=0.14, ge=0)
    grande4_price: float = Field(default=0.18, ge=0)
    medio6_price: float = Field(default=0.36, ge=0)
    grande6_price: float = Field(default=0.45, ge=0)
    medio7_price: float = Field(default=0, ge=0)
    grande7_price: float = Field(default=0, ge=0)
    medio8_price: float = Field(default=0, ge=0)
    grande8_price: float = Field(default=0, ge=0)
    xama_price: float = Field(default=0, ge=0)
    praca_4f_price: float = Field(default=0, ge=0)
    cracha_epica_price: float = Field(default=0, ge=0)

class BossPricesUpdate(BaseModel):
    medio2_price: Optional[float] = Field(default=None, ge=0)
    grande2_price: Optional[float] = Field(default=None, ge=0)
    medio4_price: Optional[float] = Field(default=None, ge=0)
    grande4_price: Optional[float] = Field(default=None, ge=0)
    medio6_price: Optional[float] = Field(default=None, ge=0)
    grande6_price: Optional[float] = Field(default=None, ge=0)
    medio7_price: Optional[float] = Field(default=None, ge=0)
    grande7_price: Optional[float] = Field(default=None, ge=0)
    medio8_price: Optional[float] = Field(default=None, ge=0)
    grande8_price: Optional[float] = Field(default=None, ge=0)
    xama_price: Optional[float] = Field(default=None, ge=0)
    praca_4f_price: Optional[float] = Field(default=None, ge=0)
    cracha_epica_price: Optional[float] = Field(default=None, ge=0)

# Helper functions
def calculate_account_usd(account: dict, prices: BossPrices) -> float:
    bosses = account.get('bosses', {})
    special = account.get('special_bosses', {})
    
    total = 0.0
    total += bosses.get('medio2', 0) * prices.medio2_price
    total += bosses.get('grande2', 0) * prices.grande2_price
    total += bosses.get('medio4', 0) * prices.medio4_price
    total += bosses.get('grande4', 0) * prices.grande4_price
    total += bosses.get('medio6', 0) * prices.medio6_price
    total += bosses.get('grande6', 0) * prices.grande6_price
    total += bosses.get('medio7', 0) * prices.medio7_price
    total += bosses.get('grande7', 0) * prices.grande7_price
    total += bosses.get('medio8', 0) * prices.medio8_price
    total += bosses.get('grande8', 0) * prices.grande8_price
    total += special.get('xama', 0) * prices.xama_price
    total += special.get('praca_4f', 0) * prices.praca_4f_price
    total += special.get('cracha_epica', 0) * prices.cracha_epica_price
    
    return round(total, 2)

async def check_and_reset_accounts():
    """Check accounts and reset those confirmed more than 30 days ago - called manually"""
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    
    accounts = await db.accounts.find({
        "confirmed": True,
        "confirmed_at": {"$ne": None}
    }).to_list(1000)
    
    reset_count = 0
    for account in accounts:
        confirmed_at_str = account.get('confirmed_at')
        if confirmed_at_str:
            confirmed_at = datetime.fromisoformat(confirmed_at_str.replace('Z', '+00:00'))
            if confirmed_at < thirty_days_ago:
                await db.accounts.update_one(
                    {"id": account['id']},
                    {"$set": {
                        "confirmed": False,
                        "confirmed_at": None,
                        "bosses": {
                            "medio2": 0, "grande2": 0,
                            "medio4": 0, "grande4": 0,
                            "medio6": 0, "grande6": 0,
                            "medio7": 0, "grande7": 0,
                            "medio8": 0, "grande8": 0
                        },
                        "special_bosses": {
                            "xama": 0, "praca_4f": 0, "cracha_epica": 0
                        },
                        "gold": 0
                    }}
                )
                reset_count += 1
    
    return reset_count

# Routes
@api_router.get("/")
async def root():
    return {"message": "MIR4 Account Manager API"}

@api_router.get("/scheduler-status")
async def get_scheduler_status():
    """Get the status of the scheduler and next run time"""
    jobs = scheduler.get_jobs()
    job_info = []
    for job in jobs:
        job_info.append({
            "id": job.id,
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None
        })
    return {"scheduler_running": scheduler.running, "jobs": job_info}

@api_router.get("/boss-prices", response_model=BossPrices)
async def get_boss_prices():
    prices = await db.boss_prices.find_one({"id": "default"}, {"_id": 0})
    if not prices:
        default_prices = BossPrices()
        await db.boss_prices.insert_one(default_prices.model_dump())
        return default_prices
    return BossPrices(**prices)

@api_router.put("/boss-prices", response_model=BossPrices)
async def update_boss_prices(update: BossPricesUpdate):
    current_prices = await db.boss_prices.find_one({"id": "default"}, {"_id": 0})
    
    if not current_prices:
        current_prices = BossPrices().model_dump()
    
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        current_prices[key] = value
    
    await db.boss_prices.update_one(
        {"id": "default"},
        {"$set": current_prices},
        upsert=True
    )
    
    return BossPrices(**current_prices)

@api_router.get("/accounts")
async def get_accounts():
    accounts = await db.accounts.find({}, {"_id": 0}).to_list(1000)
    prices = await get_boss_prices()
    
    accounts_with_values = []
    for account in accounts:
        total_usd = calculate_account_usd(account, prices)
        account_with_value = {**account, "total_usd": total_usd}
        accounts_with_values.append(account_with_value)
    
    return accounts_with_values

@api_router.get("/accounts/{account_id}")
async def get_account(account_id: str):
    account = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    prices = await get_boss_prices()
    total_usd = calculate_account_usd(account, prices)
    
    return {**account, "total_usd": total_usd}

@api_router.post("/accounts")
async def create_account(account_data: AccountCreate):
    account = Account(**account_data.model_dump())
    
    await db.accounts.insert_one(account.model_dump())
    
    prices = await get_boss_prices()
    total_usd = calculate_account_usd(account.model_dump(), prices)
    
    return {**account.model_dump(), "total_usd": total_usd}

@api_router.put("/accounts/{account_id}")
async def update_account(account_id: str, update: AccountUpdate):
    existing = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
    
    update_data = update.model_dump(exclude_unset=True)
    
    await db.accounts.update_one(
        {"id": account_id},
        {"$set": update_data}
    )
    
    updated_account = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    prices = await get_boss_prices()
    total_usd = calculate_account_usd(updated_account, prices)
    
    return {**updated_account, "total_usd": total_usd}

@api_router.post("/accounts/{account_id}/confirm")
async def confirm_account(account_id: str):
    existing = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.accounts.update_one(
        {"id": account_id},
        {"$set": {
            "confirmed": True,
            "confirmed_at": now
        }}
    )
    
    updated_account = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    prices = await get_boss_prices()
    total_usd = calculate_account_usd(updated_account, prices)
    
    return {**updated_account, "total_usd": total_usd}

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    result = await db.accounts.delete_one({"id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account deleted successfully"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
