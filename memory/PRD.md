# SaleMate - Product Requirements Document

## Original Problem Statement
A retail point-of-sale (POS) application for managing sales, stock, returns/exchanges with multi-tenant support. Each business operates in complete isolation with their own products, sales, and settings.

## Tech Stack
- **Backend**: Python FastAPI + MongoDB
- **Frontend**: React Native (Expo)
- **Authentication**: JWT-based with multi-tenant isolation
- **Communication**: REST API via `EXPO_PUBLIC_API_URL`

## Core Features Implemented

### Multi-Tenant Authentication (NEW - Feb 2026)
- [x] Signup creates User + Business records
- [x] Signin returns userId, businessId, JWT token
- [x] All API endpoints filtered by businessId
- [x] Session clearing on logout (AsyncStorage multiRemove)
- [x] JWT contains user_id and business_id claims

### Sales Management
- [x] Create sales with items and quantities
- [x] Sales summary with date range filtering (Net = Gross - Returns)
- [x] Empty state for no data
- [x] Search by product name or Sale ID
- [x] Tappable sale cards for details
- [x] Payment mode totals adjusted on returns

### Discounts & Payments
- [x] Flat and percentage discount support
- [x] UPI payment with QR code
- [x] Cash and credit payment modes
- [x] Discount calculations stored per item (`finalPaidPrice`)
- [x] **Credit sales require phone number** (frontend + backend validation)

### Return/Exchange System
- [x] Return flow with refund calculations
- [x] Exchange flow with price difference handling
- [x] Correct discount-aware pricing
- [x] Return/exchange discoverability hint in empty state

### Stock Management
- [x] Add stock with camera capture
- [x] Gallery image upload option
- [x] Product/size management

### Communication
- [x] WhatsApp bill sharing via `wa.me` deep link (production-safe)
- [x] Customer WhatsApp number capture at checkout
- [x] Phone number cleaned and country code added automatically

### Legal & Compliance
- [x] Privacy Policy screen
- [x] Data Deletion request screen
- [x] Legal links on signin/signup screens
- [x] Legal section in Settings

### App Assets
- [x] 512x512 app icon created (`/app/assets/app_icon_512x512.png`)

## Key API Changes

### Authentication
- `POST /api/auth/signup` - Creates user + business, returns message (no auto-login)
- `POST /api/auth/signin` - Returns `{access_token, userId, businessId, username}`

### All Protected Endpoints
All endpoints now require Bearer token and filter by `businessId`:
- `GET/POST /api/products` - Business-scoped products
- `GET/POST /api/sales` - Business-scoped sales
- `GET/POST /api/returns` - Business-scoped returns
- `GET/PUT /api/settings` - Business-scoped settings

### Sales Summary
- `GET /api/sales/summary` now returns:
  - `grossSales`, `totalReturns`, `netSales`
  - Payment breakdown with returns adjustment

## Key Files
- `/app/backend/server.py` - API endpoints with multi-tenant logic
- `/app/frontend/app/utils/api.ts` - Axios instance with auth interceptor
- `/app/frontend/app/signin.tsx` - Stores userId, businessId
- `/app/frontend/app/signup.tsx` - Business name field
- `/app/frontend/app/privacy-policy.tsx` - Privacy Policy
- `/app/frontend/app/data-deletion.tsx` - Data Deletion

## Database Schema
- **users**: `{_id, username, password, businessId, createdAt}`
- **businesses**: `{_id, name, createdAt, updatedAt}`
- **settings**: `{_id, businessId, shopName, ownerName, upiId, setupCompleted}`
- **products**: `{_id, businessId, name, price, stock, ...}`
- **sales**: `{_id, businessId, items, total, paymentMethod, ...}`
- **returns**: `{_id, businessId, originalSaleId, originalPaymentMethod, ...}`

## Testing
- Backend: 16/16 tests passed (pytest)
- Multi-tenant isolation verified
- Credit phone validation verified
- Auth protection verified

## Completed Tasks (Feb 2026)
- Multi-tenant architecture implementation
- Signup/Signin flow refactoring
- All APIs filtered by businessId
- Credit phone number mandatory
- Legal screens (Privacy Policy, Data Deletion)
- Return/exchange discoverability
- WhatsApp deep link production-safe
- App icon creation

## Backlog / Future Tasks
- (P2) Screenshot saving to user-accessible directory
- (P3) Basic image similarity matching for product suggestions
- (P3) Terms of Service screen
