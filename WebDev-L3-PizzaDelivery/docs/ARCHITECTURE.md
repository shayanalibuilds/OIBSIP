# Architecture

## High-level

```
┌───────────────┐         ┌──────────────────────────────────────┐
│  React client │  HTTPS  │  Express API                          │
│  (Vite :5173) │ ──────► │  (Node :5000)                          │
└───────────────┘         │                                       │
        ▲                 │  ┌─────────┐   ┌──────────┐            │
        │                 │  │ Routes  │──►│ Service  │            │
        │  Socket.IO      │  └─────────┘   └────┬─────┘            │
        │  (order:status) │                      │                  │
        └─────────────────┤                      ▼                  │
                          │  ┌──────────────────────────────┐      │
                          │  │ Repository (Mongo or Memory) │      │
                          │  └──────────────┬───────────────┘      │
                          │                 │                      │
                          │                 ▼                      │
                          │  ┌──────────────────────────────┐      │
                          │  │ MongoDB  OR  in-memory store  │      │
                          │  └──────────────────────────────┘      │
                          └──────────────────────────────────────┘
                                       │
                                       │ Nodemailer (Ethereal / SMTP)
                                       ▼
                                 ┌──────────┐
                                 │  Mailbox │
                                 └──────────┘
```

## Modules

Each module in `server/src/modules/<name>/` owns its routes, controller, service, model,
and validation. Shared code lives under `server/src/shared/`.

### auth

- `auth.routes.ts` — rate-limited public endpoints: register, verify-email, login, refresh,
  logout, forgot-password, reset-password.
- `auth.service.ts` — bcrypt (cost 12), JWT access + refresh, hashed refresh tokens, generic
  error messages (no enumeration), email verification + reset tokens with expiry.
- `auth.tokens.ts` — refresh token store (hashed, revocable, per-user revoke-all on reset).
- `auth.email.ts` — Nodemailer transporter. Falls back to an Ethereal test account when SMTP
  env is missing. Builds verify-email and reset-password URLs.

### users

- `user.model.ts` — Mongoose schema + a repository that routes between Mongo and the
  in-memory store. Public user shape exposes only id/name/email/role/emailVerified.

### catalog

- `catalog.service.ts` — `listCatalog`, `resolvePizza` (validates ingredients against the
  catalog and rejects unknown / inactive / wrong-category ids), server-side price calculation.
- `catalog.seed.ts` — `npm run seed` entry point.
- `catalog.devseed.ts` — auto-seeds the in-memory store when the server boots in memory mode.

### inventory

- `inventory.item.model.ts` — Mongoose schema for items (name, slug, category, priceMinor,
  stock, lowStockThreshold, isActive, lastNotifiedAt). Repository includes atomic-ish
  `decrementStock` that throws on insufficient stock.

### orders

- `order.model.ts` — order schema with item snapshots, quantity, server-calculated
  `priceMinor`, status, paymentStatus, `statusHistory` array, razorpay ids.
- `orders.service.ts` — `createOrder` (calls `resolvePizza`, checks stock up-front, snapshots
  names + prices), `markOrderPaid` (decrements stock atomically with rollback on failure),
  `changeStatus` (validates transitions, appends to history, emits `order:status`).

### payments

- `payments.service.ts` — Razorpay `orders.create`, signature verification via HMAC-SHA256,
  dev-only mock that calls `markOrderPaid` for local dev without Razorpay keys.
- Stock decrements ONLY happen after signature verification (or dev mock equivalent).

### admin

- `admin.routes.ts` — admin login (rate-limited), then `requireAuth + requireAdmin` for
  inventory + orders routes.
- `admin.service.ts` — list/patch inventory, list all orders, change order status, low-stock
  scan (6-hour per-item notification cooldown).
- `admin.cron.ts` — node-cron schedule (`LOW_STOCK_CRON`, default `*/15 * * * *`).

## DB fallback strategy

`server/src/config/db.ts` chooses between Mongo and the in-memory store at boot:

1. If `MONGODB_URI` is set and `NODE_ENV !== 'test'`, attempt `mongoose.connect` with a
   3-second server-selection timeout.
2. On success → `mode = 'mongo'`.
3. On failure or missing URI → `mode = 'memory'`, log a warning, continue booting.

Each repository checks `getDbMode()` and routes between the Mongoose model and the in-memory
array. Public function signatures and return shapes are identical, so services and tests do
not branch on the backend.

The in-memory store is reset between tests via `resetMemory()` in `tests/setup.ts`.

## Auth flow

```
register ─► emailVerifyToken (24h)
   │
   ▼
verify-email ─► emailVerified = true
   │
   ▼
login ─► { accessToken (15m), refreshToken (7d, hashed) }
   │
   ▼
GET /api/me  ─► Authorization: Bearer <accessToken>
   │
   ▼  (401 on expiry)
POST /api/auth/refresh ─► { new accessToken, new refreshToken, old refresh revoked }
   │
   ▼
POST /api/auth/logout ─► revoke refresh
```

The client (`shared/lib/api.ts`) intercepts 401, silently refreshes once, retries the
original request. If refresh fails, tokens are cleared and the user is bounced to `/login`.

## Payment flow

```
1. POST /api/orders                       ─► creates order with paymentStatus=unpaid
2. POST /api/payments/razorpay/order      ─► creates Razorpay order, stores razorpayOrderId
3. client opens Razorpay checkout
4. Razorpay returns payment_id + signature
5. POST /api/payments/razorpay/verify     ─► HMAC-SHA256 signature check
   ├─ success ─► markOrderPaid()
   │              ├─ decrement stock (with rollback on insufficient stock)
   │              ├─ paymentStatus = paid
   │              └─ emit order:status (status stays "received")
   └─ fail    ─► 400, do NOT mark paid, do NOT decrement stock
```

Dev mock (`POST /api/payments/dev/mock-success`) skips steps 2-4 and calls `markOrderPaid`
directly. Only enabled when `NODE_ENV=development` AND Razorpay keys are absent.

## Realtime

- Socket.IO server attaches to the same HTTP server.
- Client emits `auth { userId }` or `auth { role: 'admin' }` to join a room.
- Server-side `bus` (EventEmitter) is the source of truth. Modules emit on `bus`; the
  Socket.IO layer subscribes and forwards to the right rooms.
- Event: `order:status { orderId, status, userId }` → customer room `user:<userId>` and
  admin room `admin`.

## Security

- Helmet, CORS for the configured `CLIENT_URL`, JSON body limit 100kb.
- Rate-limit on auth (30/15min), orders (20/min), payments (20/min), health (60/min).
- bcrypt cost 12.
- JWT access short-lived, refresh long-lived and stored hashed. Refresh rotation on use.
- Logout revokes the refresh token.
- Admin seeded from env, never from public register.
- Generic auth error messages (no enumeration).
- No stack traces in production error responses.
- Input validation via Zod at route layer AND in service as defense-in-depth.
- Razorpay signature verification before any stock change.
- `.env` and `.env.*` in `.gitignore` (except `.env.example`).
