# SliceHouse — Full-Stack Pizza Delivery Platform

A Level 3 MERN-style pizza ordering and inventory app built with React, Express, MongoDB, Razorpay test mode, Socket.IO and Nodemailer.

## Features
- Customer registration with email verification, JWT login, and password reset links.
- Pizza catalog and four-step custom pizza builder (base, sauce, cheese, vegetables).
- Razorpay Checkout integration (test keys only); COD/demo checkout is available when Razorpay keys are not configured.
- Customer order history and live order status updates through Socket.IO.
- Separate admin login, order management, inventory editing, and configurable low-stock thresholds.
- Inventory is decremented in a MongoDB transaction after payment is verified; low-stock email alerts run on a schedule.
- Security basics: bcrypt password hashes, hashed one-time tokens, Helmet, CORS allowlist, request rate limits, input validation, and role-based authorization.

## Requirements
- Node.js 20+
- MongoDB (local replica set for transactions, or MongoDB Atlas)
- Optional SMTP account for email and Razorpay test keys for checkout.

## Setup

### 1. Backend
```bash
cd server
cp .env.example .env
npm install
npm run seed
npm run dev
```
The API starts at `http://localhost:5000`.

### 2. Frontend
In a second terminal:
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
Open `http://localhost:5173`.

### Environment configuration
Edit `server/.env` and set `MONGO_URI`, a long random `JWT_SECRET`, `CLIENT_URL`, and SMTP credentials. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to Razorpay **test-mode** credentials to enable real test checkout. Never commit `.env` files.

For local MongoDB transactions, start MongoDB as a single-node replica set. Atlas clusters are replica-set enabled. When SMTP is not configured, verification/reset links are logged to the backend console for local development only.

### Admin account
Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `server/.env`, then run `npm run seed`. The script creates (or updates) the seeded admin account and starter catalog/inventory. Admin accounts are not created through public registration. Sign in through the Admin tab in the UI.

### Razorpay test mode
Use Razorpay test keys only. The frontend loads Checkout.js and the backend creates an order, verifies the HMAC signature, then creates the app order and reserves stock. For local demos without keys, the “Demo / Cash on delivery” option creates an unpaid COD order; do not treat this as a payment integration test.

## Scripts
- `server`: `npm run dev`, `npm start`, `npm run seed`, `npm test`
- `client`: `npm run dev`, `npm run build`, `npm run preview`

## API overview
- `POST /api/auth/register`, `/verify-email`, `/login`, `/forgot-password`, `/reset-password`
- `GET /api/pizzas`
- `POST /api/orders/payment-order`, `/verify-payment`, `/cod`
- `GET /api/orders/mine`
- `GET /api/admin/overview`, `/orders`, `/inventory`; `PATCH /api/admin/orders/:id/status`; `PATCH /api/admin/inventory/:id`

## Deployment notes
Deploy the API and frontend separately. Configure all environment variables in the hosting dashboard, use MongoDB Atlas, set the production frontend origin in `CLIENT_URL` and `CORS_ORIGINS`, and configure SMTP + Razorpay live keys only after a separate production security review. Socket.IO needs a hosting platform that supports persistent WebSocket connections. Use HTTPS everywhere.

## Important
This is an educational starter, not a certified production commerce system. Before real-world use, add payment webhook reconciliation, idempotency keys, inventory reservation expiry/compensation, audit logging, stronger abuse controls, delivery address validation, tax/shipping rules, and a formal security review. MongoDB transactions require a replica set.
