from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
from passlib.context import CryptContext
from jose import JWTError, jwt
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Email settings
ADMIN_EMAIL = "nischal.vasista13@gmail.com"

# Security
security = HTTPBearer()

# Helper function to convert ObjectId to string
def object_id_to_str(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

# ===== MODELS =====

class Settings(BaseModel):
    shopName: str
    ownerName: str
    upiId: Optional[str] = ""
    setupCompleted: bool = True

class SettingsResponse(BaseModel):
    id: str = Field(alias="_id")
    shopName: str
    ownerName: str
    upiId: Optional[str] = ""
    setupCompleted: bool

    class Config:
        populate_by_name = True

class Product(BaseModel):
    name: str
    price: float
    stock: int
    category: Optional[str] = ""
    size: Optional[str] = ""
    color: Optional[str] = ""
    images: List[str] = []  # Base64 images
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

class ProductResponse(BaseModel):
    id: str = Field(alias="_id")
    name: str
    price: float
    stock: int
    category: Optional[str] = ""
    size: Optional[str] = ""
    color: Optional[str] = ""
    images: List[str] = []
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    category: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    images: Optional[List[str]] = None

class SaleItem(BaseModel):
    productId: str
    productName: str
    quantity: int
    price: float
    image: str

class Sale(BaseModel):
    items: List[SaleItem]
    total: float
    paymentMethod: str
    timestamp: Optional[datetime] = None
    date: Optional[str] = None

class SaleResponse(BaseModel):
    id: str = Field(alias="_id")
    items: List[SaleItem]
    total: float
    paymentMethod: str
    timestamp: datetime
    date: str

    class Config:
        populate_by_name = True

# ===== SETTINGS ENDPOINTS =====

@api_router.post("/settings/setup")
async def create_setup(settings: Settings):
    # Check if setup already exists
    existing = await db.settings.find_one()
    if existing:
        raise HTTPException(status_code=400, detail="Setup already completed")
    
    settings_dict = settings.dict()
    result = await db.settings.insert_one(settings_dict)
    settings_dict['_id'] = str(result.inserted_id)
    return settings_dict

@api_router.get("/settings")
async def get_settings():
    settings = await db.settings.find_one()
    if not settings:
        return {"setupCompleted": False}
    return object_id_to_str(settings)

@api_router.put("/settings/{settings_id}")
async def update_settings(settings_id: str, settings_update: Settings):
    try:
        update_dict = settings_update.dict()
        update_dict.pop('setupCompleted', None)  # Don't allow changing setupCompleted
        
        result = await db.settings.update_one(
            {"_id": ObjectId(settings_id)},
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Settings not found")
        
        updated_settings = await db.settings.find_one({"_id": ObjectId(settings_id)})
        return object_id_to_str(updated_settings)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ===== PRODUCT ENDPOINTS =====

@api_router.post("/products")
async def create_product(product: Product):
    product_dict = product.dict()
    product_dict['createdAt'] = datetime.utcnow()
    product_dict['updatedAt'] = datetime.utcnow()
    
    result = await db.products.insert_one(product_dict)
    product_dict['_id'] = str(result.inserted_id)
    return product_dict

@api_router.get("/products")
async def get_products():
    products = await db.products.find().to_list(1000)
    return [object_id_to_str(p) for p in products]

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    try:
        product = await db.products.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return object_id_to_str(product)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product_update: ProductUpdate):
    try:
        update_dict = {k: v for k, v in product_update.dict().items() if v is not None}
        update_dict['updatedAt'] = datetime.utcnow()
        
        result = await db.products.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        
        updated_product = await db.products.find_one({"_id": ObjectId(product_id)})
        return object_id_to_str(updated_product)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    try:
        result = await db.products.delete_one({"_id": ObjectId(product_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"message": "Product deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ===== SALES ENDPOINTS =====

@api_router.post("/sales")
async def create_sale(sale: Sale):
    sale_dict = sale.dict()
    sale_dict['timestamp'] = datetime.utcnow()
    sale_dict['date'] = datetime.utcnow().strftime('%Y-%m-%d')
    
    # Update stock for each item
    for item in sale_dict['items']:
        await db.products.update_one(
            {"_id": ObjectId(item['productId'])},
            {"$inc": {"stock": -item['quantity']}}
        )
    
    result = await db.sales.insert_one(sale_dict)
    sale_dict['_id'] = str(result.inserted_id)
    return sale_dict

@api_router.get("/sales/today")
async def get_today_sales():
    today = datetime.utcnow().strftime('%Y-%m-%d')
    sales = await db.sales.find({"date": today}).to_list(1000)
    return [object_id_to_str(s) for s in sales]

@api_router.get("/sales")
async def get_all_sales():
    sales = await db.sales.find().sort("timestamp", -1).to_list(1000)
    return [object_id_to_str(s) for s in sales]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
