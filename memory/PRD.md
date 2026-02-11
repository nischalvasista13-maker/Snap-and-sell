# SaleMate - Product Requirements Document

## Original Problem Statement
A retail point-of-sale (POS) application for managing sales, stock, returns/exchanges with multi-tenant support. Each business operates in complete isolation with their own products, sales, and settings.

## Tech Stack
- **Backend**: Python FastAPI + MongoDB
- **Frontend**: React Native (Expo)
- **Authentication**: JWT-based with multi-tenant isolation
- **Image Processing**: ImageHash + NumPy for perceptual hashing

## Core Features Implemented

### Multi-Tenant Authentication (Feb 2026)
- [x] Signup creates User + Business records
- [x] Signin returns userId, businessId, JWT token
- [x] All API endpoints filtered by businessId
- [x] Session clearing on logout

### Image Matching for Products (NEW - Feb 2026)
- [x] Backend endpoint `/api/products/match-image`
- [x] Perceptual hash (pHash) comparison
- [x] Color histogram similarity
- [x] Weighted scoring (60% hash, 40% color)
- [x] 0.7 similarity threshold for matches
- [x] Returns top 5 similar products
- [x] Frontend shows "Analyzing image..." during matching
- [x] Shows similar products carousel when no exact match

### Sales Management
- [x] Create sales with items and quantities
- [x] Sales summary (Net = Gross - Returns)
- [x] Search by product name or Sale ID
- [x] Payment mode totals adjusted on returns
- [x] Credit sales require phone number

### Return/Exchange System
- [x] Return flow with refund calculations
- [x] Exchange flow with price difference
- [x] Discount-aware pricing
- [x] Discoverability hint in empty state

### Legal & Compliance
- [x] Privacy Policy screen
- [x] Data Deletion request screen
- [x] Legal section in Settings

### App Assets
- [x] 512x512 app icon

## Key API Endpoints

### Image Matching
```
POST /api/products/match-image
Body: { imageData: "base64 or data URL" }
Response: {
  matches: [{ productId, productName, similarity, images }],
  hasMatch: boolean,
  message: string
}
```

### Authentication
- `POST /api/auth/signup` - Creates user + business
- `POST /api/auth/signin` - Returns token, userId, businessId

### All Protected Endpoints
- `GET/POST /api/products` - Business-scoped
- `GET/POST /api/sales` - Business-scoped
- `GET/POST /api/returns` - Business-scoped

## Database Schema
- **products**: Now includes `imageHash` and `colorHistogram` fields
- **users**: `{_id, username, password, businessId}`
- **businesses**: `{_id, name, createdAt}`
- **settings**: `{_id, businessId, shopName, ownerName}`

## Image Matching Algorithm
1. Compute perceptual hash (pHash) of captured image
2. Compute color histogram (8 bins per RGB channel)
3. For each product in business:
   - Compare pHash (Hamming distance → similarity)
   - Compare color histogram (cosine similarity)
   - Weighted average: 60% hash + 40% color
4. Sort by similarity, return top 5
5. Match if similarity ≥ 0.7

## Testing
- Backend: All endpoints working
- Multi-tenant isolation verified
- Image matching endpoint functional

## Completed Tasks (Feb 2026)
- Multi-tenant architecture
- Signup/Signin flow refactoring  
- All APIs filtered by businessId
- Legal screens
- **Image matching for product suggestions**

## Backlog / Future Tasks
- (P2) Screenshot saving to workspace
- (P3) Terms of Service screen
- (P3) Improve image matching with deep learning models
