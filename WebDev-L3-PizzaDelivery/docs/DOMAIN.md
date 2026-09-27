# Domain model

## Roles

- **customer** — created via public `POST /api/auth/register`. Cannot hit admin routes.
- **admin** — seeded from `ADMIN_*` env at boot or via `npm run seed`. Cannot be created
  through public register.

## Catalog

Each catalog item is a single ingredient:

| Field              | Type      | Notes                                          |
| ------------------ | --------- | ---------------------------------------------- |
| `name`             | string    | display name                                   |
| `slug`             | string    | lowercase, URL-safe                            |
| `category`         | enum      | `base` \| `sauce` \| `cheese` \| `vegetable`   |
| `priceMinor`       | integer   | price in minor currency units (e.g. paise)     |
| `stock`            | integer   | current count                                  |
| `lowStockThreshold`| integer   | default 20; cron emails admin when stock ≤ it  |
| `isActive`         | boolean   | inactive items hidden from catalog + rejected  |
| `lastNotifiedAt`   | Date/null | low-stock email cooldown (max once per 6 hours)|

Seed catalog:

- **5 bases**: Classic Hand Tossed, Thin Crust, Cheese Burst, Whole Wheat, Sicilian Thick
- **5 sauces**: Classic Tomato, Spicy Arrabbiata, Pesto, White Garlic, BBQ
- **4 cheeses**: Mozzarella, Cheddar, Parmesan, Feta
- **8 vegetables**: Onion, Capsicum, Mushroom, Olive, Sweet Corn, Jalapeno, Tomato, Spinach

## Custom pizza

A custom pizza is exactly:

- **1 base**
- **1 sauce**
- **1 cheese**
- **0-8 vegetables** (deduped; unknown ids rejected)

The per-pizza price is the sum of the chosen ingredients' `priceMinor`. The order total is
`unit price × quantity`. The client never sends a price — the server always recomputes.

## Order

| Field             | Type      | Notes                                                              |
| ----------------- | --------- | ------------------------------------------------------------------ |
| `userId`          | string    | customer who placed it                                             |
| `base/sauce/cheese` | snapshot | `{ id, name, category, priceMinor }` — frozen at order time       |
| `vegetables`      | array     | same snapshot shape                                                |
| `quantity`        | integer   | 1-20                                                               |
| `priceMinor`      | integer   | server-calculated total                                            |
| `status`          | enum      | `received` → `in_kitchen` → `out_for_delivery` → `delivered`       |
|                   |           | `cancelled` allowed from `received` or `in_kitchen`                |
| `paymentStatus`   | enum      | `unpaid` → `paid` (only after signature verify)                    |
| `razorpayOrderId` | string?   | set when Razorpay order is created                                 |
| `razorpayPaymentId`| string?  | set after successful verify                                        |
| `statusHistory`   | array     | `{ status, at, note? }` appended on every status change            |

### Status transitions

```
received ─► in_kitchen ─► out_for_delivery ─► delivered
   │           │
   └───────────┴──► cancelled
```

Invalid transitions are rejected with `400 BAD_REQUEST`.

## Payment

- Razorpay TEST mode only.
- Server creates the Razorpay order with `amount = priceMinor`, `currency = INR`,
  `receipt = orderId`.
- Client opens the Razorpay checkout modal.
- Razorpay returns `razorpay_payment_id` + `razorpay_signature`.
- Server recomputes the signature as `HMAC-SHA256(razorpayOrderId|razorpayPaymentId, key_secret)`.
- Only on signature match: `markOrderPaid` → decrement stock, set `paymentStatus = paid`,
  emit `order:status` (status stays `received` until admin moves it).
- If stock would go below 0 during decrement, all decrements are rolled back and the
  verify endpoint returns `409 CONFLICT`.

### Dev mock

When `NODE_ENV=development` AND Razorpay keys are absent, `POST /api/payments/dev/mock-success`
is enabled. It calls `markOrderPaid` directly with a synthetic payment id. Disabled whenever
Razorpay is configured or in production.

## Realtime

- Socket.IO transport.
- Customer room: `user:<userId>`
- Admin room: `admin`
- Event: `order:status { orderId, status, userId }`
- Source of truth: server-side `bus` (Node EventEmitter). The Socket.IO layer subscribes
  to `bus` and forwards to the right rooms. Modules never import Socket.IO directly.

## Email

Nodemailer with three flows:

1. **Verify email** — on register, sends a link with a 24-hour token.
2. **Reset password** — on forgot-password (if the email exists), sends a link with a 1-hour
   token. Always returns the same response to avoid enumeration.
3. **Low-stock alert** — cron scans every 15 minutes (configurable via `LOW_STOCK_CRON`).
   For each item at or below its `lowStockThreshold`, emails `ADMIN_EMAIL` at most once per
   6 hours per item (tracked via `lastNotifiedAt`).

If `SMTP_HOST` is not set, Nodemailer creates an Ethereal test account on the fly and the
server logs the preview URL.
