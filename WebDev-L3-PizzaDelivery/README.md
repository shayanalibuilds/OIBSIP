# Ovenly

Ovenly is a pizza ordering platform with a customer app and a separate admin app.
Customers build a custom pizza (base, sauce, cheese, vegetables), pay through Razorpay
in TEST mode, and watch the order move from received → in kitchen → out for delivery →
delivered in real time. Admins manage inventory and the live order board from a separate
console.

## Stack

- **Server**: Node.js, Express, TypeScript, Mongoose, Zod, bcrypt (cost 12), JWT access + refresh,
  Helmet, CORS, rate-limit, Socket.IO, Razorpay SDK, Nodemailer, node-cron
- **Client**: React, TypeScript, Vite, React Router, TanStack Query, Socket.IO client
- **Tests**: Vitest (auth validation, price calculation, unknown ingredient rejection)
- **Lint + Prettier**: ESLint + Prettier on both server and client
- **No Docker**. MongoDB via connection string only.

## Folder map

```
WebDev-L3-PizzaDelivery/
  README.md
  .gitignore
  docs/
    ARCHITECTURE.md
    DOMAIN.md
    API_CONTRACT.md
    TESTPLAN.md
    screenshots/        # placeholders — replace before demo
  scripts/
    api-smoke.sh        # curl-based smoke test for every API route
  server/
    package.json
    tsconfig.json
    vitest.config.ts
    .env.example
    src/
      index.ts          # boots HTTP + Socket.IO + cron
      app.ts            # express app, middleware, route mounting
      config/           # env (zod), db (mongo + in-memory fallback)
      shared/
        db/             # in-memory store + types
        middleware/     # errorHandler, validate, requireAuth, requireAdmin
        utils/          # AppError, logger, events (bus)
        types/
      modules/
        auth/           # routes, controller, service, validation, tokens, email
        users/          # user model + types
        catalog/        # routes, controller, service, seed, devseed
        inventory/      # inventory item model
        orders/         # model, routes, controller, service
        payments/       # routes, controller, service (Razorpay + dev mock)
        admin/          # routes, controller, service, cron
    tests/              # setup, auth.test, orders.pricing.test
  client/
    package.json
    tsconfig.json
    vite.config.ts
    index.html
    .env.example
    src/
      main.tsx
      app/              # App, router, providers
      shared/
        ui/             # Button, Alert, Field, States, Layout (navbar/footer)
        lib/            # api.ts (typed client + token store), socket.ts
        hooks/          # useAuth
      features/
        auth/           # login, register, verify, forgot, reset
        menu/           # home, menu
        pizza-builder/  # 4-step builder
        checkout/       # Razorpay or dev mock
        orders/         # customer order list with live status
        admin/          # admin login, dashboard, inventory, orders board
      styles/           # design tokens + base CSS
```

## Prerequisites

- Node.js 18+ (developed on Node 24)
- Either:
  - A local MongoDB on the default port, OR
  - A MongoDB Atlas connection string, OR
  - Nothing — the server boots with an in-memory adapter when `MONGODB_URI` is unset.

## Install

```bash
# from WebDev-L3-PizzaDelivery/
cd server && cp .env.example .env && npm install
cd ../client && cp .env.example .env && npm install
```

## Configure

Edit `server/.env`:

- `MONGODB_URI` — leave blank to use the in-memory dev adapter. Local:
  `mongodb://127.0.0.1:27017/ovenly`. Atlas: `mongodb+srv://<user>:<pass>@<cluster>/ovenly`.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — strong random strings.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` — bootstrap admin (never created via public register).
  In development, if `ADMIN_PASSWORD` is blank, the in-memory adapter defaults to `admin@ovenly.dev / Admin1234`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — Ethereal or Mailtrap test credentials.
  If unset, Nodemailer creates an Ethereal test account on the fly and logs the preview URL.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` — Razorpay TEST-mode keys.
  When unset, the server exposes `POST /api/payments/dev/mock-success` (development only) that
  mirrors the verify flow without a real charge.

Edit `client/.env`:

- `VITE_API_URL` — server URL, defaults to `http://localhost:5000`.
- `VITE_RAZORPAY_KEY_ID` — Razorpay TEST-mode public key. When unset, the checkout page shows
  a "Pay (dev mock)" button that calls the dev mock endpoint. Disabled in production builds.

## Seed

```bash
cd server
npm run seed
```

Seeds:

- 5 bases, 5 sauces, 4 cheeses, 8 vegetables (22 catalog items total)
- one admin from `ADMIN_*` env

When the server boots in in-memory mode it auto-seeds the same catalog and admin on startup,
so `npm run seed` is only needed when running against Mongo.

## Run

```bash
# terminal 1 - server
cd server
npm run dev          # http://localhost:5000

# terminal 2 - client
cd client
npm run dev          # http://localhost:5173
```

Open http://localhost:5173.

## Razorpay test-mode note

All payments use Razorpay TEST mode. No real money ever moves. When keys are absent, the
checkout page falls back to a "Pay (dev mock)" button that exercises the same server-side
verify path (mark paid, decrement stock, emit `order:status`) without contacting Razorpay.

## Scripts

| Script          | Where  | What                                          |
| --------------- | ------ | --------------------------------------------- |
| `npm run dev`   | server | tsx watch `src/index.ts`                       |
| `npm run build` | server | tsc to `dist/`                                 |
| `npm run seed`  | server | seed catalog + admin                           |
| `npm test`      | server | Vitest run                                     |
| `npm run lint`  | server | ESLint                                         |
| `npm run dev`   | client | Vite dev server                                |
| `npm run build` | client | tsc + Vite production build                    |
| `npm run lint`  | client | ESLint                                         |

## Testing the full flow

See `docs/TESTPLAN.md` for the exact click path. See `docs/API_CONTRACT.md` for every route.
See `scripts/api-smoke.sh` for a curl-based smoke test that hits every endpoint.

Submitted for Web Development Level 3.
