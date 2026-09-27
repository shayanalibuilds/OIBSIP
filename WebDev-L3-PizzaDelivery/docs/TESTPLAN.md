# Test plan — manual demo click path

## Prerequisites

- Server running on `http://localhost:8800` (in-memory or Mongo)
- Client running on `http://localhost:5173`
- Admin credentials: `admin@ovenly.dev / Admin1234` (default in dev with no `ADMIN_PASSWORD`)
- Razorpay test keys: optional. If absent, the checkout page shows "Pay (dev mock)".

## Click path

1. **Register**
   - Open http://localhost:5173/register
   - Fill name, email, password (8+ chars, 1+ digit)
   - Submit → redirected to `/verify?email=...`
   - Try invalid password first (e.g. "short") → visible validation error, submit blocked.

2. **Verify email**
   - Check the server console for an Ethereal preview URL (logged on every email send in dev).
   - Open the URL, copy the token from the link's `?token=` query param.
   - Paste it on `/verify` and submit → redirected to `/login`.
   - Alternative: use the dev mock flow — manually call `POST /api/auth/verify-email` with
     the token, or just log in as admin and skip this for the demo.

3. **Login**
   - Open http://localhost:5173/login
   - Enter the email + password from step 1.
   - Submit → redirected to `/menu`.
   - Refresh the page → still logged in (access token persisted in localStorage, refresh
     on 401 works).

4. **Build pizza**
   - Click "Build" in the nav.
   - Step 1: pick a base → click Next.
   - Step 2: pick a sauce → click Next.
   - Step 3: pick a cheese → click Next.
   - Step 4: pick 0-8 vegetables → click Next.
   - Summary: verify the total, adjust quantity if desired.
   - Click "Proceed to checkout".

5. **Checkout**
   - `/checkout` opens with the order summary.
   - The server creates the order on page load (visible: server-confirmed total, status badge).
   - If Razorpay keys are configured: click "Pay ₹X.XX" → Razorpay modal opens → use a
     test card (e.g. `4111 1111 1111 1111`, any future expiry, any CVV) → on success,
     redirected to `/orders`.
   - If Razorpay keys are missing (dev mode): click "Pay (dev mock)" → server marks the
     order paid, decrements stock, redirects to `/orders`.

6. **See order**
   - `/orders` shows the new order with status "Order received".
   - Status timeline visible: Order received (done) → In kitchen → Out for delivery → Delivered.

7. **Admin login**
   - Open http://localhost:5173/admin/login
   - Use `admin@ovenly.dev / Admin1234`.
   - Submit → redirected to `/admin` dashboard.

8. **Edit stock**
   - Click "Inventory" in the dashboard (or nav, when admin).
   - Find an item, change stock / low-stock threshold / price / active.
   - Click "Save" → row updates, low-stock badge appears if applicable.

9. **Move order to in_kitchen**
   - Click "Orders" in the dashboard.
   - Find the order from step 5 in the "Active" section.
   - Click "Move to in kitchen".
   - The order's status badge changes; statusHistory is appended.

10. **Customer status updates (realtime)**
    - Open `/orders` in a second tab (logged in as the same customer, or use the same session).
    - Trigger a status change from the admin tab.
    - Within a second, the customer's order card should update **without a manual refresh**,
      courtesy of Socket.IO.

11. **Full lifecycle**
    - From admin: move the order through `in_kitchen → out_for_delivery → delivered`.
    - Customer's order card updates at each step.
    - Final state: "Delivered" badge, no action buttons on admin row.

## Keyboard accessibility check

On every form (register, login, verify, forgot, reset, admin login, builder steps):
- Tab through fields in logical order.
- Enter submits the form.
- Focus rings are visible (orange outline).
- Invalid fields show a red border + error text below.

## Mobile width check (~375px)

- Nav wraps cleanly, links remain reachable.
- Catalog grid collapses to 1-2 columns.
- Builder step indicator wraps.
- Admin inventory table scrolls horizontally.
- No horizontal page overflow, no overlapping elements.

## API smoke test

Run from project root:

```bash
bash scripts/api-smoke.sh
```

Hits every endpoint with curl, covers success and the obvious failures (400, 401, 409, 404).
Expect `PASS: 27 FAIL: 0` against a freshly-booted in-memory server.

## Server tests

```bash
cd server
npm test
```

Expect `14 passed` across `auth.test.ts` and `orders.pricing.test.ts`:

- auth validation: rejects short password, rejects no-number password, accepts valid,
  rejects duplicate email, rejects login before verify, same error for unknown user vs
  bad password, login works after verify.
- orders pricing: per-pizza price = sum of ingredients, total = unit × quantity,
  rejects quantity 0, rejects unknown base, rejects inactive ingredient, rejects
  wrong-category ingredient, rejects duplicate ingredient id.
