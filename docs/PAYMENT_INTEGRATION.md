# Razorpay Payment Gateway Integration Documentation

## 1. Architecture Overview

The EdTech platform implements a robust, tamper-proof payment integration using the official **Razorpay Node.js SDK**, **Next.js App Router API Routes**, and **Supabase PostgreSQL**.

```
[ Student Browser ]
       │  1. Click "Proceed to Payment"
       ▼
[ POST /api/payments/create-order ]
       │  2. Authoritative Server-Side Pricing & Duplicate Check
       │  3. Razorpay SDK orders.create()
       ▼
[ Razorpay Checkout Modal ]
       │  4. Card / UPI / Netbanking Payment Completed
       ▼
[ POST /api/payments/verify ]
       │  5. HMAC SHA256 Signature Verification
       │  6. Idempotent Transaction Ingestion
       │  7. Grant Entitlement (channel_subscriptions active)
       │  8. Commission Ledger Allocation (80% Teacher, 20% Platform)
       ▼
[ Student Dashboard & Watch Lesson Unlocked ]
```

In addition, an asynchronous webhook listener (`POST /api/webhooks/razorpay`) processes `payment.captured`, `order.paid`, `payment.failed`, and `refund.processed` events with cryptographic signature verification and event deduplication.

---

## 2. Environment Variables

Store your credentials in `.env` (server-side only, ignored by Git):

```env
# Razorpay Credentials (from https://dashboard.razorpay.com/app/keys)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=yyyyyyyyyyyyyyyyyyyyyyyy
RAZORPAY_WEBHOOK_SECRET=zzzzzzzzzzzzzzzzzzzzzzzz

# Frontend Public Key ID (Required for Razorpay Checkout JS modal)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
```

> **Security Rule**: `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are strictly server-side and never exposed to the client bundle.

---

## 3. Database Schema (`supabase/payment_schema.sql`)

The payment subsystem introduces 5 dedicated tables in PostgreSQL:

| Table | Purpose |
|---|---|
| `payment_orders` | Internal order records mapped to `razorpay_order_id` with paise amounts |
| `payment_transactions` | Verified captured payment receipts and payment method metadata |
| `teacher_earnings` | Attribution ledger tracking gross sales, 20% platform fee, and 80% teacher net share |
| `refund_records` | Tracks processed refunds and payment reversals |
| `payment_webhook_events` | Idempotency log guaranteeing each webhook event is processed exactly once |

### How to apply the migration:
1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Paste the contents of [`supabase/payment_schema.sql`](file:///c:/Users/user/Documents/Edutech/edutech/supabase/payment_schema.sql).
3. Click **Run**.

---

## 4. API Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/payments/create-order` | Authenticated Student | Creates Razorpay order with server-validated pricing |
| `POST` | `/api/payments/verify` | Authenticated Student | Verifies HMAC SHA256 signature and unlocks course |
| `POST` | `/api/webhooks/razorpay` | Razorpay Gateway | Asynchronous webhook receiver with raw-body signature check |
| `GET` | `/api/student/payments` | Authenticated Student | Returns student's personal payment history and invoices |
| `GET` | `/api/admin/payments/analytics` | Super Admin | Database-backed revenue metrics and transaction ledger |
| `GET` | `/api/teacher/earnings` | Authenticated Teacher | Summary of paid enrollments, gross sales, and net earnings |

---

## 5. Razorpay Dashboard Webhook Configuration

To receive real-time webhook events:
1. Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Navigate to **Settings** -> **Webhooks** -> **Add New Webhook**.
3. **Webhook URL**: `https://your-domain.com/api/webhooks/razorpay` (or your Ngrok tunnel URL during local testing).
4. **Secret**: Enter a secure random string and set it as `RAZORPAY_WEBHOOK_SECRET` in your `.env`.
5. **Active Events**: Check:
   - `payment.captured`
   - `order.paid`
   - `payment.failed`
   - `refund.processed`
6. Click **Save**.

---

## 6. Testing & Verification

Run the automated test suite anytime:

```bash
node tests/test_payment_lifecycle.js
```

This verifies:
- HMAC SHA256 payment signature verification
- Tampered signature rejection
- Webhook raw-body signature verification
- Server-side price manipulation prevention
- Free course direct bypass
- Repeat purchase 409 Conflict protection
- 80/20 teacher commission math
