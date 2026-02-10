# Salemate - Product Requirements Document

## Original Problem Statement
A retail point-of-sale (POS) application for managing sales, stock, returns/exchanges with features including:
- Sales tracking and summary with date parameters
- Return/Exchange functionality
- Search, Discounts, WhatsApp bill sharing
- Gallery image upload for stock
- Mobile app icon creation

## Tech Stack
- **Backend**: Python FastAPI + SQLite
- **Frontend**: React Native (Expo)
- **Communication**: REST API via `EXPO_PUBLIC_API_URL`

## Core Features Implemented

### Sales Management
- [x] Create sales with items and quantities
- [x] Sales summary with date range filtering
- [x] Empty state for no data
- [x] Search by product name or Sale ID
- [x] Tappable sale cards for details

### Discounts & Payments
- [x] Flat and percentage discount support
- [x] UPI payment with QR code
- [x] Cash and credit payment modes
- [x] Discount calculations stored per item (`finalPaidPrice`)

### Return/Exchange System
- [x] Return flow with refund calculations
- [x] Exchange flow with price difference handling
- [x] Correct discount-aware pricing

### Stock Management
- [x] Add stock with camera capture
- [x] Gallery image upload option
- [x] Product/size management

### Communication
- [x] WhatsApp bill sharing via `wa.me` deep link
- [x] Customer WhatsApp number capture at checkout

### App Assets
- [x] 512x512 app icon created (`/app/assets/app_icon_512x512.png`)

## Key Files
- `/app/backend/main.py` - API endpoints
- `/app/backend/models.py` - Data models
- `/app/frontend/screens/` - All UI screens
- `/app/assets/app_icon_512x512.png` - App icon

## Completed Tasks (Dec 2025)
- Sales Summary enhancements
- API connectivity fixes
- Return/Exchange feature
- Discount, WhatsApp, Search features
- UI fixes (UPI QR, scrollable summary)
- Gallery image upload
- **App icon creation (512x512)**

## Backlog / Future Tasks
- P2: Screenshot saving to user-accessible directory (workaround needed)
- No other explicit tasks pending

## Notes
- API URL must use `EXPO_PUBLIC_API_URL` from `.env`
- Returns use `finalPaidPrice` for discount-aware calculations
- Use `npx tsc` for TypeScript validation (eslint gives false positives)
