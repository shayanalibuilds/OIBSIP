# API contract

Base URL: `http://localhost:5000` (dev). All routes are prefixed with `/api`.

Auth: `Authorization: Bearer <accessToken>` for protected routes. Access tokens are 15m,
refresh tokens are 7d and rotated on use.

Error shape (always):

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": "..."
  }
}
```

## Public / customer

### `GET /api/health`

Returns `{ status: "ok", ts: "<iso>" }`. Rate-limited (60/min).

### `POST /api/auth/register`

Body: `{ name: string, email: string, password: string }`

- Password: min 8 chars, at least 1 number.
- Duplicate email → `409 CONFLICT` with a generic message (no enumeration).
- Sends a verification email (Ethereal preview URL in response body in dev).

Response `201`:
```json
{
  "user": { "id": "...", "name": "...", "email": "...", "role": "customer", "emailVerified": false },
  "message": "Account created. Check your email for a verification link.",
  "etherealPreviewUrl": "https://ethereal.email/message/..."
}
```

### `POST /api/auth/verify-email`

Body: `{ email: string, token: string }`

Response `200`: `{ user: {...}, message: "Email verified. You can log in." }`

Bad/expired token → `400`.

### `POST /api/auth/login`

Body: `{ email: string, password: string }`

- Same error message for unknown user and bad password.
- Returns `403` if email is not verified (except for admin).

Response `200`:
```json
{
  "user": { "id": "...", "name": "...", "email": "...", "role": "customer", "emailVerified": true },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

### `POST /api/auth/refresh`

Body: `{ refreshToken: string }`

Rotates the refresh token (old one is revoked). Response `200`:
```json
{ "accessToken": "...", "refreshToken": "...", "user": {...} }
```

### `POST /api/auth/logout`

Body: `{ refreshToken: string }`

Revokes the refresh token. Idempotent. Response `200`: `{ ok: true }`.

### `POST /api/auth/forgot-password`

Body: `{ email: string }`

Always returns `200 { message: "If that email exists, a reset link has been sent." }`
to avoid enumeration. If the email exists, a 1-hour reset token is emailed.

### `POST /api/auth/reset-password`

Body: `{ email: string, token: string, password: string }`

Resets the password, revokes all refresh tokens for the user. Response `200`:
`{ message: "Password updated. You can log in." }`

### `GET /api/me`

Auth required. Response `200`:
```json
{ "user": { "id": "...", "name": "...", "email": "...", "role": "customer", "emailVerified": true } }
```

### `GET /api/catalog`

Public. Response `200`:
```json
{
  "items": [
    {
      "id": "...",
      "name": "Classic Hand Tossed",
      "slug": "classic-hand-tossed",
      "category": "base",
      "priceMinor": 300,
      "price": 3.00,
      "stock": 80,
      "lowStockThreshold": 20,
      "isActive": true
    }
  ]
}
```

### `POST /api/orders`

Auth required. Body:
```json
{
  "baseId": "24-hex",
  "sauceId": "24-hex",
  "cheeseId": "24-hex",
  "vegetableIds": ["24-hex", "..."],
  "quantity": 1
}
```

- Rejects unknown / inactive / wrong-category ids.
- Server snapshots names + prices and computes the total.
- Stock check up-front; decrement happens only after payment.

Response `201`:
```json
{
  "order": {
    "id": "...",
    "status": "received",
    "paymentStatus": "unpaid",
    "priceMinor": 1460,
    "price": 14.60,
    "quantity": 2,
    "base": { "id": "...", "name": "...", "priceMinor": 420 },
    "sauce": { "id": "...", "name": "...", "priceMinor": 100 },
    "cheese": { "id": "...", "name": "...", "priceMinor": 160 },
    "vegetables": [{ "id": "...", "name": "...", "priceMinor": 50 }],
    "statusHistory": [{ "status": "received", "at": "..." }],
    "razorpayOrderId": null,
    "razorpayPaymentId": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### `GET /api/orders`

Auth required. Returns the caller's own orders (newest first).

### `GET /api/orders/:id`

Auth required. Returns one order. `403` if the caller is not the owner.

### `POST /api/payments/razorpay/order`

Auth required. Body: `{ orderId: "24-hex" }`. Creates a Razorpay order. Response `200`:
```json
{
  "razorpayOrderId": "order_...",
  "amount": 1460,
  "currency": "INR",
  "keyId": "rzp_test_...",
  "orderId": "..."
}
```

### `POST /api/payments/razorpay/verify`

Auth required. Body:
```json
{
  "orderId": "24-hex",
  "razorpayOrderId": "order_...",
  "razorpayPaymentId": "pay_...",
  "razorpaySignature": "..."
}
```

Verifies the HMAC-SHA256 signature. On success: marks the order paid, decrements stock,
emits `order:status`. On failure: `400`, no state change.

Response `200`: `{ orderId: "...", status: "paid" }`

### `POST /api/payments/dev/mock-success`

Auth required. Development only (disabled when `NODE_ENV=production` or when Razorpay keys
are configured). Body: `{ orderId: "24-hex" }`. Calls `markOrderPaid` directly with a
synthetic payment id.

Response `200`: `{ orderId: "...", status: "paid", paymentId: "dev_mock_..." }`

## Admin

All admin routes (except `/login`) require `Authorization: Bearer <admin-access-token>`.

### `POST /api/admin/login`

Body: `{ email, password }`. Returns the same shape as `/api/auth/login` but only succeeds
for users with `role = admin`. Same error message as customer login to avoid enumeration.

### `GET /api/admin/inventory`

Returns all items (including inactive and low-stock).

Response `200`:
```json
{
  "items": [
    {
      "id": "...",
      "name": "...",
      "slug": "...",
      "category": "base",
      "priceMinor": 300,
      "stock": 80,
      "lowStockThreshold": 20,
      "isActive": true,
      "isLow": false,
      "lastNotifiedAt": null,
      "updatedAt": "..."
    }
  ]
}
```

### `PATCH /api/admin/inventory/:id`

Body (any subset): `{ stock?, lowStockThreshold?, priceMinor?, isActive?, name? }`

Response `200`: `{ item: {...} }`

### `GET /api/admin/orders`

Returns all orders (newest first). Optional `?status=<status>` filter.

### `PATCH /api/admin/orders/:id/status`

Body: `{ status: "received"|"in_kitchen"|"out_for_delivery"|"delivered"|"cancelled", note?: string }`

Validates the transition, appends to `statusHistory`, emits `order:status` to the customer
and admin rooms.

Response `200`: `{ order: {...} }`

## Status codes used

- `200` — success
- `201` — created
- `400` — validation error, bad request, invalid status transition
- `401` — missing or invalid token
- `403` — not allowed (e.g. unverified email, non-admin hitting admin route, accessing
  another user's order)
- `404` — not found
- `409` — conflict (duplicate email, insufficient stock)
- `429` — rate limited
- `500` — server error (no stack trace in production)
