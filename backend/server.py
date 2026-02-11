from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta, timezone
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
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'nischal.vasista13@gmail.com')

# Security
security = HTTPBearer()

# ===== AUTH DEPENDENCY =====
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract and validate user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        business_id = payload.get("business_id")
        username = payload.get("sub")
        
        if not user_id or not business_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing user or business info")
        
        return {
            "user_id": user_id,
            "business_id": business_id,
            "username": username
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# Helper function to convert ObjectId to string
def object_id_to_str(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

# ===== MODELS =====

# Auth Models
class UserCreate(BaseModel):
    username: str
    password: str
    businessName: str  # Shop/business name for the new business

class UserLogin(BaseModel):
    username: str
    password: str

class SignupResponse(BaseModel):
    message: str
    userId: str
    businessId: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    userId: str
    businessId: str
    username: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ForgotPassword(BaseModel):
    username: str

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
    stock: int  # Total stock (sum of all sizes)
    category: Optional[str] = ""
    size: Optional[str] = ""  # Kept for backward compatibility
    sizeQuantities: Optional[dict] = {}  # {"S": 10, "M": 15, "L": 20, "XL": 5}
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
    price: float  # Original unit price
    image: str
    size: Optional[str] = ""
    # Per-item discount tracking
    itemTotal: Optional[float] = None  # price * quantity (original)
    discountAmount: Optional[float] = 0  # Discount applied to this item
    finalPaidAmount: Optional[float] = None  # itemTotal - discountAmount (what customer actually paid)

class Sale(BaseModel):
    items: List[SaleItem]
    total: float  # Final paid amount (after discount)
    paymentMethod: str
    timestamp: Optional[datetime] = None
    date: Optional[str] = None
    # Discount details
    originalTotal: Optional[float] = None  # Sum of all items before discount
    discountType: Optional[str] = None  # "percentage" or "flat"
    discountValue: Optional[float] = 0  # The value entered (e.g., 10 for 10% or ₹10)
    discountAmount: Optional[float] = 0  # Actual discount amount in rupees
    # WhatsApp
    customerPhone: Optional[str] = None

class SaleResponse(BaseModel):
    id: str = Field(alias="_id")
    items: List[SaleItem]
    total: float
    paymentMethod: str
    timestamp: datetime
    date: str
    originalTotal: Optional[float] = None
    discountType: Optional[str] = None
    discountValue: Optional[float] = 0
    discountAmount: Optional[float] = 0
    customerPhone: Optional[str] = None

    class Config:
        populate_by_name = True

# Return Models
class ReturnItem(BaseModel):
    productId: str
    productName: str
    quantity: int
    price: float  # Original unit price
    size: Optional[str] = ""
    finalPaidPrice: Optional[float] = None  # Discounted unit price (for refund calculation)

class Return(BaseModel):
    originalSaleId: str
    items: List[ReturnItem]
    returnTotal: float
    reason: Optional[str] = ""
    type: str  # "return" or "exchange"
    exchangeSaleId: Optional[str] = None  # Links to new sale if exchange
    timestamp: Optional[datetime] = None
    date: Optional[str] = None

class ReturnResponse(BaseModel):
    id: str = Field(alias="_id")
    originalSaleId: str
    items: List[ReturnItem]
    returnTotal: float
    reason: Optional[str] = ""
    type: str
    exchangeSaleId: Optional[str] = None
    timestamp: datetime
    date: str

    class Config:
        populate_by_name = True

# ===== AUTH HELPER FUNCTIONS =====

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def send_email(subject: str, body: str, to_email: str):
    try:
        message = MIMEMultipart()
        message["From"] = "pos-app@noreply.com"
        message["To"] = to_email
        message["Subject"] = subject
        message.attach(MIMEText(body, "plain"))
        
        # Note: This is a placeholder. In production, configure actual SMTP settings
        logger.info(f"Email notification: {subject} to {to_email}")
        logger.info(f"Body: {body}")
        # await aiosmtplib.send(message, hostname="smtp.gmail.com", port=587)
    except Exception as e:
        logger.error(f"Failed to send email: {e}")

# ===== AUTH ENDPOINTS =====

@api_router.post("/auth/signup", response_model=SignupResponse)
async def signup(user: UserCreate):
    """
    Create a new user with a new business.
    Does NOT auto-login - redirects to signin.
    """
    # Check if username exists
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create new business first
    business_doc = {
        "name": user.businessName,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    business_result = await db.businesses.insert_one(business_doc)
    business_id = str(business_result.inserted_id)
    
    # Create new user linked to the business
    hashed_password = hash_password(user.password)
    user_doc = {
        "username": user.username,
        "password": hashed_password,
        "businessId": business_id,
        "createdAt": datetime.now(timezone.utc)
    }
    
    user_result = await db.users.insert_one(user_doc)
    user_id = str(user_result.inserted_id)
    
    # Create default settings for the business
    settings_doc = {
        "businessId": business_id,
        "shopName": user.businessName,
        "ownerName": "",
        "upiId": "",
        "setupCompleted": False,
        "createdAt": datetime.now(timezone.utc)
    }
    await db.settings.insert_one(settings_doc)
    
    # Do NOT return token - user must sign in manually
    return SignupResponse(
        message="Account created successfully. Please sign in.",
        userId=user_id,
        businessId=business_id
    )

@api_router.post("/auth/signin", response_model=LoginResponse)
async def signin(user: UserLogin):
    """
    Sign in user and return token with userId and businessId.
    """
    # Find user
    db_user = await db.users.find_one({"username": user.username})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(db_user["_id"])
    business_id = db_user.get("businessId")
    
    if not business_id:
        raise HTTPException(status_code=400, detail="User has no associated business")
    
    # Create access token with userId and businessId
    access_token = create_access_token(data={
        "sub": user.username,
        "user_id": user_id,
        "business_id": business_id
    })
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        userId=user_id,
        businessId=business_id,
        username=user.username
    )

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPassword):
    # Check if user exists
    user = await db.users.find_one({"username": request.username})
    if not user:
        # Don't reveal if user exists or not
        return {"message": "Password reset request sent to admin."}
    
    # Send email to admin
    subject = f"Password Reset Request - POS App"
    body = f"""
Password reset request received for user: {request.username}

User ID: {str(user['_id'])}
Username: {request.username}
Request Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}

Please assist the user with password reset.
    """
    
    await send_email(subject, body, ADMIN_EMAIL)
    
    return {"message": "Password reset request sent to admin."}

# ===== SETTINGS ENDPOINTS =====

@api_router.post("/settings/setup")
async def create_setup(settings: Settings, current_user: dict = Depends(get_current_user)):
    """Create or update settings for the current business"""
    business_id = current_user["business_id"]
    
    # Check if setup already exists for this business
    existing = await db.settings.find_one({"businessId": business_id})
    if existing:
        # Update existing settings
        update_dict = settings.dict()
        update_dict["businessId"] = business_id
        update_dict["updatedAt"] = datetime.now(timezone.utc)
        await db.settings.update_one(
            {"businessId": business_id},
            {"$set": update_dict}
        )
        updated = await db.settings.find_one({"businessId": business_id})
        return object_id_to_str(updated)
    
    settings_dict = settings.dict()
    settings_dict["businessId"] = business_id
    settings_dict["createdAt"] = datetime.now(timezone.utc)
    result = await db.settings.insert_one(settings_dict)
    settings_dict['_id'] = str(result.inserted_id)
    return settings_dict

@api_router.get("/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    """Get settings for the current business"""
    business_id = current_user["business_id"]
    settings = await db.settings.find_one({"businessId": business_id})
    if not settings:
        return {"setupCompleted": False, "businessId": business_id}
    return object_id_to_str(settings)

@api_router.put("/settings/{settings_id}")
async def update_settings(settings_id: str, settings_update: Settings, current_user: dict = Depends(get_current_user)):
    try:
        business_id = current_user["business_id"]
        
        # Verify settings belong to user's business
        existing = await db.settings.find_one({"_id": ObjectId(settings_id), "businessId": business_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Settings not found")
        
        update_dict = settings_update.dict()
        update_dict.pop('setupCompleted', None)  # Don't allow changing setupCompleted directly
        update_dict["updatedAt"] = datetime.now(timezone.utc)
        
        result = await db.settings.update_one(
            {"_id": ObjectId(settings_id), "businessId": business_id},
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
    # Optimized query with projection - only fetch needed fields
    products = await db.products.find(
        {},
        {
            'name': 1, 
            'price': 1, 
            'stock': 1, 
            'images': 1, 
            'category': 1,
            'size': 1,
            'color': 1,
            'createdAt': 1,
            'updatedAt': 1
        }
    ).to_list(500)  # Reasonable limit
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
    
    # Calculate per-item discount distribution
    items = sale_dict['items']
    original_total = sum(item['price'] * item['quantity'] for item in items)
    discount_amount = sale_dict.get('discountAmount', 0) or 0
    
    # Store originalTotal if not provided
    if not sale_dict.get('originalTotal'):
        sale_dict['originalTotal'] = original_total
    
    # Distribute discount proportionally across items
    for item in items:
        item_total = item['price'] * item['quantity']
        item['itemTotal'] = item_total
        
        if original_total > 0 and discount_amount > 0:
            # Proportional discount: (item_total / original_total) * total_discount
            item_discount = (item_total / original_total) * discount_amount
            item['discountAmount'] = round(item_discount, 2)
            item['finalPaidAmount'] = round(item_total - item_discount, 2)
        else:
            item['discountAmount'] = 0
            item['finalPaidAmount'] = item_total
    
    # Update stock for all items using bulk_write (optimized)
    from pymongo import UpdateOne
    bulk_operations = [
        UpdateOne(
            {"_id": ObjectId(item['productId'])},
            {"$inc": {"stock": -item['quantity']}}
        )
        for item in sale_dict['items']
    ]
    
    if bulk_operations:
        await db.products.bulk_write(bulk_operations)
    
    result = await db.sales.insert_one(sale_dict)
    sale_dict['_id'] = str(result.inserted_id)
    return sale_dict

@api_router.get("/sales/today")
async def get_today_sales():
    today = datetime.utcnow().strftime('%Y-%m-%d')
    # Optimized query with projection and reasonable limit
    sales = await db.sales.find(
        {"date": today},
        {
            'items': 1,
            'total': 1,
            'paymentMethod': 1,
            'timestamp': 1,
            'date': 1
        }
    ).sort("timestamp", -1).limit(200).to_list(200)
    return [object_id_to_str(s) for s in sales]

@api_router.get("/sales/date-range")
async def get_sales_by_date_range(start_date: str, end_date: str):
    """Get sales between start_date and end_date (inclusive, format: YYYY-MM-DD)"""
    try:
        # Optimized query with date range and projection
        sales = await db.sales.find(
            {
                "date": {
                    "$gte": start_date,
                    "$lte": end_date
                }
            },
            {
                'items': 1,
                'total': 1,
                'paymentMethod': 1,
                'timestamp': 1,
                'date': 1
            }
        ).sort("timestamp", -1).limit(500).to_list(500)
        return [object_id_to_str(s) for s in sales]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/sales/summary")
async def get_sales_summary(start_date: str, end_date: str):
    """Get sales summary with payment-wise breakdown for date range"""
    try:
        # Aggregate sales by payment method
        pipeline = [
            {
                "$match": {
                    "date": {
                        "$gte": start_date,
                        "$lte": end_date
                    }
                }
            },
            {
                "$group": {
                    "_id": "$paymentMethod",
                    "total": {"$sum": "$total"},
                    "count": {"$sum": 1}
                }
            }
        ]
        
        result = await db.sales.aggregate(pipeline).to_list(100)
        
        # Initialize summary
        summary = {
            "totalSales": 0,
            "cashTotal": 0,
            "upiTotal": 0,
            "cardTotal": 0,
            "creditTotal": 0,
            "otherTotal": 0,
            "totalTransactions": 0,
            "breakdown": {}
        }
        
        # Process aggregation results
        for item in result:
            payment_method = item['_id'].lower() if item['_id'] else 'other'
            total = item['total']
            count = item['count']
            
            summary["totalSales"] += total
            summary["totalTransactions"] += count
            
            if payment_method == 'cash':
                summary["cashTotal"] = total
            elif payment_method == 'upi':
                summary["upiTotal"] = total
            elif payment_method == 'card':
                summary["cardTotal"] = total
            elif payment_method == 'credit':
                summary["creditTotal"] = total
            else:
                summary["otherTotal"] += total
            
            summary["breakdown"][payment_method] = {
                "total": total,
                "count": count
            }
        
        return summary
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/sales")
async def get_all_sales():
    # Optimized query with projection, sort, and limit
    sales = await db.sales.find(
        {},
        {
            'items': 1,
            'total': 1,
            'paymentMethod': 1,
            'timestamp': 1,
            'date': 1
        }
    ).sort("timestamp", -1).limit(100).to_list(100)
    return [object_id_to_str(s) for s in sales]

@api_router.get("/sales/{sale_id}")
async def get_sale_by_id(sale_id: str):
    """Get a specific sale by ID"""
    try:
        sale = await db.sales.find_one({"_id": ObjectId(sale_id)})
        if not sale:
            raise HTTPException(status_code=404, detail="Sale not found")
        return object_id_to_str(sale)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ===== RETURNS ENDPOINTS =====

@api_router.post("/returns")
async def create_return(return_data: Return):
    """Create a return and update inventory"""
    try:
        # Verify original sale exists
        original_sale = await db.sales.find_one({"_id": ObjectId(return_data.originalSaleId)})
        if not original_sale:
            raise HTTPException(status_code=404, detail="Original sale not found")
        
        return_dict = return_data.dict()
        return_dict['timestamp'] = datetime.utcnow()
        return_dict['date'] = datetime.utcnow().strftime('%Y-%m-%d')
        
        # Update inventory - increase stock for returned items
        from pymongo import UpdateOne
        bulk_operations = []
        for item in return_dict['items']:
            bulk_operations.append(
                UpdateOne(
                    {"_id": ObjectId(item['productId'])},
                    {"$inc": {"stock": item['quantity']}}
                )
            )
        
        if bulk_operations:
            await db.products.bulk_write(bulk_operations)
        
        # Insert return record
        result = await db.returns.insert_one(return_dict)
        return_dict['_id'] = str(result.inserted_id)
        
        return return_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/returns")
async def get_all_returns():
    """Get all returns"""
    returns = await db.returns.find().sort("timestamp", -1).limit(100).to_list(100)
    return [object_id_to_str(r) for r in returns]

@api_router.get("/returns/by-sale/{sale_id}")
async def get_returns_by_sale(sale_id: str):
    """Get all returns for a specific sale"""
    returns = await db.returns.find({"originalSaleId": sale_id}).to_list(100)
    return [object_id_to_str(r) for r in returns]

@api_router.post("/exchanges")
async def create_exchange(
    original_sale_id: str,
    return_items: List[ReturnItem],
    new_sale: Sale
):
    """Create an exchange - return items and create new sale"""
    try:
        # Verify original sale exists
        original_sale = await db.sales.find_one({"_id": ObjectId(original_sale_id)})
        if not original_sale:
            raise HTTPException(status_code=404, detail="Original sale not found")
        
        # Calculate return total
        return_total = sum(item.price * item.quantity for item in return_items)
        
        # Create the return record first
        return_dict = {
            "originalSaleId": original_sale_id,
            "items": [item.dict() for item in return_items],
            "returnTotal": return_total,
            "reason": "Exchange",
            "type": "exchange",
            "timestamp": datetime.utcnow(),
            "date": datetime.utcnow().strftime('%Y-%m-%d')
        }
        
        # Update inventory - increase stock for returned items
        from pymongo import UpdateOne
        return_bulk_ops = [
            UpdateOne(
                {"_id": ObjectId(item.productId)},
                {"$inc": {"stock": item.quantity}}
            )
            for item in return_items
        ]
        
        if return_bulk_ops:
            await db.products.bulk_write(return_bulk_ops)
        
        # Create the new sale
        new_sale_dict = new_sale.dict()
        new_sale_dict['timestamp'] = datetime.utcnow()
        new_sale_dict['date'] = datetime.utcnow().strftime('%Y-%m-%d')
        
        # Update inventory - decrease stock for new sale items
        sale_bulk_ops = [
            UpdateOne(
                {"_id": ObjectId(item['productId'])},
                {"$inc": {"stock": -item['quantity']}}
            )
            for item in new_sale_dict['items']
        ]
        
        if sale_bulk_ops:
            await db.products.bulk_write(sale_bulk_ops)
        
        # Insert new sale
        sale_result = await db.sales.insert_one(new_sale_dict)
        new_sale_dict['_id'] = str(sale_result.inserted_id)
        
        # Link return to new sale
        return_dict['exchangeSaleId'] = new_sale_dict['_id']
        
        # Insert return record
        return_result = await db.returns.insert_one(return_dict)
        return_dict['_id'] = str(return_result.inserted_id)
        
        # Calculate price difference
        price_difference = new_sale.total - return_total
        
        return {
            "return": return_dict,
            "newSale": new_sale_dict,
            "returnTotal": return_total,
            "newSaleTotal": new_sale.total,
            "priceDifference": price_difference,  # Positive = customer pays, Negative = refund
            "message": "Exchange completed successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Static file endpoint for app icon
@api_router.get("/download/app-icon")
async def download_app_icon():
    """Download the 512x512 app icon"""
    icon_path = ROOT_DIR / "app_icon_512x512.png"
    if not icon_path.exists():
        raise HTTPException(status_code=404, detail="App icon not found")
    return FileResponse(
        path=str(icon_path),
        filename="salemate_app_icon_512x512.png",
        media_type="image/png"
    )

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
