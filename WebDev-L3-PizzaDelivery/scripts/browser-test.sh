#!/usr/bin/env bash
# Full browser test suite v4. Uses refs for clicks, eval for text checks.
set -u

BASE_URL="http://localhost:5173"
API_URL="http://localhost:8800"
mkdir -p /tmp/screens

pass=0
fail=0
declare -a failures

log_pass() { echo "PASS: $1"; pass=$((pass+1)); }
log_fail() { echo "FAIL: $1 — $2"; failures+=("$1: $2"); fail=$((fail+1)); }

open_page() {
  agent-browser open "$1" 2>&1 | tail -1
  sleep 2
  agent-browser wait --load networkidle 2>&1 | tail -1
  sleep 1
}

get_url() { agent-browser get url 2>&1 | tail -1; }

# Check if text exists on page (case-insensitive) via eval
has_text() {
  local result=$(agent-browser eval "document.body.innerText.toLowerCase().includes('$1'.toLowerCase())" 2>&1 | tail -1)
  if echo "$result" | grep -q "true"; then return 0; else return 1; fi
}

# Check if ANY of the pipe-separated patterns exists on page
has_any_text() {
  local patterns="$1"
  local p
  IFS='|' read -ra arr <<< "$patterns"
  for p in "${arr[@]}"; do
    p=$(echo "$p" | xargs)  # trim
    if has_text "$p"; then return 0; fi
  done
  return 1
}

# Get a ref from snapshot by pattern
get_ref() { echo "$1" | grep "$2" | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=//'; }

# Get all card button refs (buttons with ₹ in text = ingredient cards)
get_card_refs() { echo "$1" | grep 'button ".*₹' | grep -oE 'ref=e[0-9]+' | sed 's/ref=//'; }

UNIQUE=$(date +%s)
CUSTOMER_EMAIL="cust${UNIQUE}@test.com"
CUSTOMER_PWD="password1"
EMPTY_EMAIL="empty${UNIQUE}@test.com"

echo "Customer: $CUSTOMER_EMAIL"
echo ""

# Warm up the browser with a blank page first
agent-browser open about:blank 2>&1 | tail -1
sleep 2

echo "========================================"
echo "PHASE 1: NON-AUTH PERSPECTIVE"
echo "========================================"

echo "--- 1.1 Home ---"
open_page "$BASE_URL/"
sleep 3
# Retry once if about:blank
URL=$(get_url)
if echo "$URL" | grep -q "about:blank"; then
  echo "    Retry: browser not ready, reopening..."
  open_page "$BASE_URL/"
  sleep 3
  URL=$(get_url)
fi
if echo "$URL" | grep -q "localhost:5173"; then log_pass "Home loads"; else log_fail "Home" "URL=$URL"; fi
if has_text "build the pizza"; then log_pass "Hero text"; else log_fail "Hero" "missing"; fi
OUT=$(agent-browser snapshot -i -c 2>&1)
if echo "$OUT" | grep -q "Menu" && echo "$OUT" | grep -q "Build" && echo "$OUT" | grep -q "Orders" && echo "$OUT" | grep -q "Account"; then
  log_pass "Nav has 4 links"
else
  log_fail "Nav" "missing"
fi
agent-browser screenshot /tmp/screens/01-home.png --full 2>&1 | tail -1

echo "--- 1.2 Menu ---"
open_page "$BASE_URL/menu"
if has_text "bases" && has_text "sauces" && has_text "cheeses" && has_text "vegetables"; then
  log_pass "4 categories"
else
  log_fail "Menu cats" "missing"
fi
if has_text "classic hand tossed"; then log_pass "Seeded items"; else log_fail "Menu items" "missing"; fi
ITEM_COUNT=$(agent-browser eval "document.querySelectorAll('article.card').length" 2>&1 | tail -1)
echo "    Cards: $ITEM_COUNT"
agent-browser screenshot /tmp/screens/02-menu.png --full 2>&1 | tail -1

echo "--- 1.3 Login ---"
open_page "$BASE_URL/login"
if has_text "sign in"; then log_pass "Login renders"; else log_fail "Login" "no heading"; fi
if has_text "create an account"; then log_pass "Register link"; else log_fail "Register link" "missing"; fi
if has_text "forgot password"; then log_pass "Forgot link"; else log_fail "Forgot link" "missing"; fi
agent-browser screenshot /tmp/screens/03-login.png --full 2>&1 | tail -1

echo "--- 1.4 Register ---"
open_page "$BASE_URL/register"
if has_text "create your account"; then log_pass "Register renders"; else log_fail "Register" "no heading"; fi
agent-browser screenshot /tmp/screens/04-register.png --full 2>&1 | tail -1

echo "--- 1.5 Verify ---"
open_page "$BASE_URL/verify"
if has_text "verify your email"; then log_pass "Verify renders"; else log_fail "Verify" "no heading"; fi

echo "--- 1.6 Forgot ---"
open_page "$BASE_URL/forgot"
if has_text "forgot password"; then log_pass "Forgot renders"; else log_fail "Forgot" "no heading"; fi

echo "--- 1.7 Reset ---"
open_page "$BASE_URL/reset"
if has_text "reset password"; then log_pass "Reset renders"; else log_fail "Reset" "no heading"; fi

echo "--- 1.8 Admin login ---"
open_page "$BASE_URL/admin/login"
if has_text "admin sign in"; then log_pass "Admin login renders"; else log_fail "Admin login" "no heading"; fi
if has_text "customer sign in"; then log_pass "Customer link"; else log_fail "Customer link" "missing"; fi
agent-browser screenshot /tmp/screens/05-admin-login.png --full 2>&1 | tail -1

echo ""
echo "========================================"
echo "PHASE 2: AUTHORIZATION (non-auth blocked)"
echo "========================================"

echo "--- 2.1 /build ---"
open_page "$BASE_URL/build"; URL=$(get_url); if echo "$URL" | grep -q "/login"; then log_pass "-> /login"; else log_fail "/build" "URL=$URL"; fi
echo "--- 2.2 /checkout ---"
open_page "$BASE_URL/checkout"; URL=$(get_url); if echo "$URL" | grep -q "/login"; then log_pass "-> /login"; else log_fail "/checkout" "URL=$URL"; fi
echo "--- 2.3 /orders ---"
open_page "$BASE_URL/orders"; URL=$(get_url); if echo "$URL" | grep -q "/login"; then log_pass "-> /login"; else log_fail "/orders" "URL=$URL"; fi
echo "--- 2.4 /admin ---"
open_page "$BASE_URL/admin"; URL=$(get_url); if echo "$URL" | grep -q "/admin/login"; then log_pass "-> /admin/login"; else log_fail "/admin" "URL=$URL"; fi
echo "--- 2.5 /admin/inventory ---"
open_page "$BASE_URL/admin/inventory"; URL=$(get_url); if echo "$URL" | grep -q "/admin/login"; then log_pass "-> /admin/login"; else log_fail "/admin/inv" "URL=$URL"; fi
echo "--- 2.6 /admin/orders ---"
open_page "$BASE_URL/admin/orders"; URL=$(get_url); if echo "$URL" | grep -q "/admin/login"; then log_pass "-> /admin/login"; else log_fail "/admin/orders" "URL=$URL"; fi

echo ""
echo "========================================"
echo "PHASE 3: AUTH PERSPECTIVE (customer)"
echo "========================================"

echo "--- 3.1 Register ---"
open_page "$BASE_URL/register"
SNAP=$(agent-browser snapshot -i 2>&1)
NAME_REF=$(get_ref "$SNAP" 'textbox "Name"')
EMAIL_REF=$(get_ref "$SNAP" 'textbox "Email"')
PWD_REF=$(get_ref "$SNAP" 'textbox "Password"')
BTN_REF=$(get_ref "$SNAP" 'button "Create account"')
agent-browser fill "@$NAME_REF" "Test Customer" 2>&1 | tail -1
agent-browser fill "@$EMAIL_REF" "$CUSTOMER_EMAIL" 2>&1 | tail -1
agent-browser fill "@$PWD_REF" "$CUSTOMER_PWD" 2>&1 | tail -1
agent-browser click "@$BTN_REF" 2>&1 | tail -1
# Ethereal email creation takes ~5s, so wait up to 15s for redirect to /verify
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  sleep 1
  URL=$(get_url)
  if echo "$URL" | grep -q "/verify"; then break; fi
done
if echo "$URL" | grep -q "/verify"; then log_pass "Register -> /verify"; else log_fail "Register" "URL=$URL"; fi
agent-browser screenshot /tmp/screens/06-register.png --full 2>&1 | tail -1

echo "--- 3.2 Login before verify (403) ---"
open_page "$BASE_URL/login"
SNAP=$(agent-browser snapshot -i 2>&1)
EMAIL_REF=$(get_ref "$SNAP" 'textbox "Email"')
PWD_REF=$(get_ref "$SNAP" 'textbox "Password"')
BTN_REF=$(get_ref "$SNAP" 'button "Sign in"')
agent-browser fill "@$EMAIL_REF" "$CUSTOMER_EMAIL" 2>&1 | tail -1
agent-browser fill "@$PWD_REF" "$CUSTOMER_PWD" 2>&1 | tail -1
agent-browser click "@$BTN_REF" 2>&1 | tail -1
sleep 3
if has_text "verify your email"; then log_pass "Blocked before verify"; else log_fail "Login before verify" "no error"; fi
agent-browser screenshot /tmp/screens/07-before-verify.png --full 2>&1 | tail -1

echo "--- 3.3 Verify via API ---"
sleep 1
TOKEN=$(grep "Email body" /tmp/server.log | grep "$CUSTOMER_EMAIL" | grep -oE "token=[a-f0-9]+" | head -1 | sed 's/token=//')
if [ -n "$TOKEN" ]; then
  RESP=$(curl -s -X POST $API_URL/api/auth/verify-email -H 'Content-Type: application/json' -d "{\"email\":\"$CUSTOMER_EMAIL\",\"token\":\"$TOKEN\"}")
  if echo "$RESP" | grep -q "Email verified"; then log_pass "Email verified"; else log_fail "Verify" "$RESP"; fi
else
  log_fail "Token" "not found in log"
fi

echo "--- 3.4 Login ---"
open_page "$BASE_URL/login"
SNAP=$(agent-browser snapshot -i 2>&1)
EMAIL_REF=$(get_ref "$SNAP" 'textbox "Email"')
PWD_REF=$(get_ref "$SNAP" 'textbox "Password"')
BTN_REF=$(get_ref "$SNAP" 'button "Sign in"')
agent-browser fill "@$EMAIL_REF" "$CUSTOMER_EMAIL" 2>&1 | tail -1
agent-browser fill "@$PWD_REF" "$CUSTOMER_PWD" 2>&1 | tail -1
agent-browser click "@$BTN_REF" 2>&1 | tail -1
sleep 3
URL=$(get_url)
if echo "$URL" | grep -q "/menu"; then log_pass "Login -> /menu"; else log_fail "Login" "URL=$URL"; fi
agent-browser screenshot /tmp/screens/08-after-login.png --full 2>&1 | tail -1

echo "--- 3.5 Nav after login ---"
if has_text "sign out"; then log_pass "Sign out visible"; else log_fail "Sign out" "missing"; fi
if has_text "$CUSTOMER_EMAIL"; then log_pass "Email visible"; else log_fail "Email" "missing"; fi

echo "--- 3.6 Build pizza ---"
open_page "$BASE_URL/build"
if has_text "pick your base"; then log_pass "Step 1 (base)"; else log_fail "Step 1" "missing"; fi
agent-browser screenshot /tmp/screens/09-builder-1.png --full 2>&1 | tail -1

# Pick first card (button with ₹)
SNAP=$(agent-browser snapshot -i 2>&1)
CARD_REF=$(echo "$SNAP" | grep 'button ".*₹' | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=//')
agent-browser click "@$CARD_REF" 2>&1 | tail -1
sleep 1
SNAP=$(agent-browser snapshot -i 2>&1)
NEXT_REF=$(get_ref "$SNAP" 'button "Next"')
agent-browser click "@$NEXT_REF" 2>&1 | tail -1
sleep 2
if has_text "pick your sauce"; then log_pass "Step 2 (sauce)"; else log_fail "Step 2" "missing"; fi

SNAP=$(agent-browser snapshot -i 2>&1)
CARD_REF=$(echo "$SNAP" | grep 'button ".*₹' | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=//')
agent-browser click "@$CARD_REF" 2>&1 | tail -1
sleep 1
SNAP=$(agent-browser snapshot -i 2>&1)
NEXT_REF=$(get_ref "$SNAP" 'button "Next"')
agent-browser click "@$NEXT_REF" 2>&1 | tail -1
sleep 2
if has_text "pick your cheese"; then log_pass "Step 3 (cheese)"; else log_fail "Step 3" "missing"; fi

SNAP=$(agent-browser snapshot -i 2>&1)
CARD_REF=$(echo "$SNAP" | grep 'button ".*₹' | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=//')
agent-browser click "@$CARD_REF" 2>&1 | tail -1
sleep 1
SNAP=$(agent-browser snapshot -i 2>&1)
NEXT_REF=$(get_ref "$SNAP" 'button "Next"')
agent-browser click "@$NEXT_REF" 2>&1 | tail -1
sleep 2
if has_text "pick your vegetables"; then log_pass "Step 4 (veg)"; else log_fail "Step 4" "missing"; fi
agent-browser screenshot /tmp/screens/10-builder-4.png --full 2>&1 | tail -1

# Pick 2 veg
SNAP=$(agent-browser snapshot -i 2>&1)
CARD_REFS=$(echo "$SNAP" | grep 'button ".*₹' | grep -oE 'ref=e[0-9]+' | head -2 | sed 's/ref=//')
FIRST=$(echo "$CARD_REFS" | head -1)
SECOND=$(echo "$CARD_REFS" | tail -1)
agent-browser click "@$FIRST" 2>&1 | tail -1
sleep 1
agent-browser click "@$SECOND" 2>&1 | tail -1
sleep 1
SNAP=$(agent-browser snapshot -i 2>&1)
NEXT_REF=$(get_ref "$SNAP" 'button "Next"')
agent-browser click "@$NEXT_REF" 2>&1 | tail -1
sleep 2
if has_text "summary"; then log_pass "Summary renders"; else log_fail "Summary" "missing"; fi
if has_text "proceed to checkout"; then log_pass "Checkout btn"; else log_fail "Checkout btn" "missing"; fi
TOTAL=$(agent-browser eval "var t=document.querySelector('.font-bold.text-lg');t?t.textContent:'none'" 2>&1 | tail -1)
echo "    Total: $TOTAL"
agent-browser screenshot /tmp/screens/11-summary.png --full 2>&1 | tail -1

echo "--- 3.7 Checkout ---"
SNAP=$(agent-browser snapshot -i 2>&1)
CO_REF=$(get_ref "$SNAP" 'button "Proceed to checkout"')
agent-browser click "@$CO_REF" 2>&1 | tail -1
sleep 4
agent-browser wait --load networkidle 2>&1 | tail -1
sleep 2
URL=$(get_url)
if echo "$URL" | grep -q "/checkout"; then log_pass "Checkout loads"; else log_fail "Checkout" "URL=$URL"; fi
if has_text "order details"; then log_pass "Order details"; else log_fail "Order details" "missing"; fi
if has_text "pay (dev mock)"; then log_pass "Dev mock btn"; else log_fail "Dev mock" "missing"; fi
# Wait for server-confirmed total (order creation may take a moment)
for i in 1 2 3 4 5 6 7 8 9 10; do
  if has_text "server-confirmed"; then break; fi
  sleep 1
done
if has_text "server-confirmed"; then log_pass "Server total"; else log_fail "Server total" "missing"; fi
agent-browser screenshot /tmp/screens/12-checkout.png --full 2>&1 | tail -1

echo "--- 3.8 Pay ---"
# Wait for the Pay button to be enabled (order must be created first)
for i in 1 2 3 4 5 6 7 8 9 10; do
  SNAP=$(agent-browser snapshot -i 2>&1)
  PAY_REF=$(echo "$SNAP" | grep 'button "Pay (dev mock' | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=//')
  if [ -n "$PAY_REF" ]; then
    # Check if button is disabled
    DISABLED=$(echo "$SNAP" | grep 'button "Pay (dev mock' | grep -c 'disabled')
    if [ "$DISABLED" -eq 0 ]; then break; fi
  fi
  sleep 1
done
if [ -n "$PAY_REF" ]; then
  agent-browser click "@$PAY_REF" 2>&1 | tail -1
  sleep 4
else
  echo "    Pay button not found, trying eval..."
  agent-browser eval "var b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('dev mock')&&!b.disabled);b&&b.click()" 2>&1 | tail -1
  sleep 4
fi
URL=$(get_url)
if echo "$URL" | grep -q "/orders"; then log_pass "Pay -> /orders"; else log_fail "Pay" "URL=$URL"; fi

echo "--- 3.9 Orders ---"
if has_text "your orders"; then log_pass "Orders renders"; else log_fail "Orders" "no heading"; fi
if has_text "received"; then log_pass "Status visible"; else log_fail "Status" "missing"; fi
if has_text "paid"; then log_pass "Paid badge"; else log_fail "Paid" "missing"; fi
ORDER_COUNT=$(agent-browser eval "document.querySelectorAll('article.card').length" 2>&1 | tail -1)
echo "    Orders: $ORDER_COUNT"
agent-browser screenshot /tmp/screens/13-orders.png --full 2>&1 | tail -1

echo "--- 3.10 Refresh ---"
agent-browser reload 2>&1 | tail -1
sleep 3
agent-browser wait --load networkidle 2>&1 | tail -1
sleep 1
if has_text "sign out"; then log_pass "Session persists"; else log_fail "Session" "no signout"; fi

echo "--- 3.11 Customer blocked from admin ---"
open_page "$BASE_URL/admin"
sleep 2
URL=$(get_url)
if echo "$URL" | grep -qE "/admin/login|/$"; then log_pass "Blocked from /admin"; else log_fail "Admin block" "URL=$URL"; fi

echo "--- 3.12 Customer blocked from admin API ---"
CUST_TOKEN=$(agent-browser eval "localStorage.getItem('ovenly.accessToken')" 2>&1 | tail -1 | tr -d '"')
ADMIN_API=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $CUST_TOKEN" $API_URL/api/admin/inventory)
if [ "$ADMIN_API" = "403" ] || [ "$ADMIN_API" = "401" ]; then log_pass "Admin API blocked ($ADMIN_API)"; else log_fail "Admin API" "got $ADMIN_API"; fi

echo ""
echo "========================================"
echo "PHASE 4: ADMIN PERSPECTIVE"
echo "========================================"

echo "--- 4.1 Logout ---"
SNAP=$(agent-browser snapshot -i 2>&1)
SO_REF=$(get_ref "$SNAP" 'button "Sign out"')
agent-browser click "@$SO_REF" 2>&1 | tail -1
sleep 3

echo "--- 4.2 Admin login ---"
open_page "$BASE_URL/admin/login"
SNAP=$(agent-browser snapshot -i 2>&1)
EMAIL_REF=$(get_ref "$SNAP" 'textbox "Email"')
PWD_REF=$(get_ref "$SNAP" 'textbox "Password"')
BTN_REF=$(get_ref "$SNAP" 'button "Sign in"')
agent-browser fill "@$EMAIL_REF" "admin@ovenly.dev" 2>&1 | tail -1
agent-browser fill "@$PWD_REF" "Admin1234" 2>&1 | tail -1
agent-browser click "@$BTN_REF" 2>&1 | tail -1
sleep 3
URL=$(get_url)
if echo "$URL" | grep -q "/admin"; then log_pass "Admin login -> /admin"; else log_fail "Admin login" "URL=$URL"; fi
agent-browser screenshot /tmp/screens/14-admin-dash.png --full 2>&1 | tail -1

echo "--- 4.3 Dashboard ---"
if has_text "admin dashboard"; then log_pass "Dashboard renders"; else log_fail "Dashboard" "no heading"; fi
if has_text "inventory" && has_text "orders"; then log_pass "Has cards"; else log_fail "Cards" "missing"; fi
SNAP=$(agent-browser snapshot -i -c 2>&1)
if echo "$SNAP" | grep -q "Admin"; then log_pass "Nav has Admin"; else log_fail "Nav Admin" "missing"; fi

echo "--- 4.4 Inventory ---"
open_page "$BASE_URL/admin/inventory"
sleep 2
URL=$(get_url); if echo "$URL" | grep -q "/admin/inventory"; then log_pass "Inventory loads"; else log_fail "Inventory" "URL=$URL"; fi
if has_text "classic hand tossed"; then log_pass "Items visible"; else log_fail "Items" "missing"; fi
ROW_COUNT=$(agent-browser eval "document.querySelectorAll('table tr').length" 2>&1 | tail -1)
echo "    Rows: $ROW_COUNT"
if [ "$ROW_COUNT" -ge 20 ]; then log_pass "All items"; else log_fail "Rows" "$ROW_COUNT"; fi
agent-browser screenshot /tmp/screens/15-inventory.png --full 2>&1 | tail -1

echo "--- 4.5 Edit stock ---"
SNAP=$(agent-browser snapshot -i 2>&1)
STOCK_REF=$(echo "$SNAP" | grep 'spinbutton "Stock for' | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=//')
SAVE_REF=$(echo "$SNAP" | grep 'button "Save"' | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=//')
if [ -n "$STOCK_REF" ] && [ -n "$SAVE_REF" ]; then
  agent-browser fill "@$STOCK_REF" "55" 2>&1 | tail -1
  sleep 1
  agent-browser click "@$SAVE_REF" 2>&1 | tail -1
  sleep 3
  # Verify via API that stock changed
  ADMIN_TOKEN=$(agent-browser eval "localStorage.getItem('ovenly.accessToken')" 2>&1 | tail -1 | tr -d '"')
  NEW_STOCK=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" $API_URL/api/admin/inventory | python3 -c "import json,sys; d=json.load(sys.stdin); print(next(i['stock'] for i in d['items'] if i['name']=='Cheese Burst'))" 2>/dev/null)
  echo "    Cheese Burst stock now: $NEW_STOCK (expected 55)"
  if [ "$NEW_STOCK" = "55" ]; then log_pass "Stock edit saved"; else log_fail "Stock edit" "got $NEW_STOCK"; fi
else
  log_fail "Edit refs" "stock=$STOCK_REF save=$SAVE_REF"
fi

echo "--- 4.6 Orders board ---"
open_page "$BASE_URL/admin/orders"
sleep 3
URL=$(get_url); if echo "$URL" | grep -q "/admin/orders"; then log_pass "Board loads"; else log_fail "Board" "URL=$URL"; fi
if has_text "orders board"; then log_pass "Board renders"; else log_fail "Board" "no heading"; fi
ORDER_COUNT=$(agent-browser eval "document.querySelectorAll('article.card').length" 2>&1 | tail -1)
echo "    Orders: $ORDER_COUNT"
if [ "$ORDER_COUNT" -ge 1 ]; then log_pass "Orders visible"; else log_fail "Orders" "0 cards"; fi
agent-browser screenshot /tmp/screens/16-admin-orders.png --full 2>&1 | tail -1

echo "--- 4.7 Move to in_kitchen ---"
SNAP=$(agent-browser snapshot -i 2>&1)
MOVE_REF=$(get_ref "$SNAP" 'button "Move to in kitchen"')
if [ -n "$MOVE_REF" ]; then
  agent-browser click "@$MOVE_REF" 2>&1 | tail -1
  sleep 3
  if has_text "in_kitchen"; then log_pass "Moved to in_kitchen"; else log_fail "in_kitchen" "no badge"; fi
else
  log_fail "Move btn" "not found"
fi
agent-browser screenshot /tmp/screens/17-in-kitchen.png --full 2>&1 | tail -1

echo "--- 4.8 Move to out for delivery ---"
SNAP=$(agent-browser snapshot -i 2>&1)
MOVE_REF=$(get_ref "$SNAP" 'button "Move to out for delivery"')
if [ -n "$MOVE_REF" ]; then
  agent-browser click "@$MOVE_REF" 2>&1 | tail -1
  sleep 3
  if has_text "out_for_delivery"; then log_pass "Moved to out_for_delivery"; else log_fail "out_for_delivery" "no badge"; fi
else
  log_fail "Move btn" "not found"
fi

echo "--- 4.9 Deliver ---"
SNAP=$(agent-browser snapshot -i 2>&1)
MOVE_REF=$(get_ref "$SNAP" 'button "Move to delivered"')
if [ -n "$MOVE_REF" ]; then
  agent-browser click "@$MOVE_REF" 2>&1 | tail -1
  sleep 3
  if has_text "delivered"; then log_pass "Delivered"; else log_fail "Delivered" "no badge"; fi
else
  log_fail "Deliver btn" "not found"
fi

echo "--- 4.10 Admin accesses customer routes ---"
open_page "$BASE_URL/menu"
sleep 2
URL=$(get_url); if echo "$URL" | grep -q "/menu"; then log_pass "Admin can /menu"; else log_fail "Admin /menu" "URL=$URL"; fi

echo ""
echo "========================================"
echo "PHASE 5: UI / UX"
echo "========================================"

echo "--- 5.1 Mobile (375px) ---"
agent-browser set viewport 375 812 2>&1 | tail -1
sleep 1
open_page "$BASE_URL/"
agent-browser screenshot /tmp/screens/18-mobile-home.png --full 2>&1 | tail -1
if has_text "ovenly"; then log_pass "Mobile home"; else log_fail "Mobile home" "no content"; fi
OVERFLOW=$(agent-browser eval "document.documentElement.scrollWidth > document.documentElement.clientWidth + 5 ? 'OVERFLOW' : 'OK'" 2>&1 | tail -1)
if echo "$OVERFLOW" | grep -q "OK"; then log_pass "No overflow (home)"; else log_fail "Overflow" "detected"; fi

open_page "$BASE_URL/menu"
agent-browser screenshot /tmp/screens/19-mobile-menu.png --full 2>&1 | tail -1
OVERFLOW=$(agent-browser eval "document.documentElement.scrollWidth > document.documentElement.clientWidth + 5 ? 'OVERFLOW' : 'OK'" 2>&1 | tail -1)
if echo "$OVERFLOW" | grep -q "OK"; then log_pass "No overflow (menu)"; else log_fail "Overflow menu" "detected"; fi

open_page "$BASE_URL/admin/inventory"
sleep 2
agent-browser screenshot /tmp/screens/20-mobile-inv.png --full 2>&1 | tail -1
if has_text "classic hand tossed"; then log_pass "Mobile inventory"; else log_fail "Mobile inv" "no content"; fi

echo "--- 5.2 Form validation ---"
agent-browser set viewport 1280 800 2>&1 | tail -1
open_page "$BASE_URL/register"
SNAP=$(agent-browser snapshot -i 2>&1)
NAME_REF=$(get_ref "$SNAP" 'textbox "Name"')
EMAIL_REF=$(get_ref "$SNAP" 'textbox "Email"')
PWD_REF=$(get_ref "$SNAP" 'textbox "Password"')
BTN_REF=$(get_ref "$SNAP" 'button "Create account"')
agent-browser fill "@$NAME_REF" "Bad" 2>&1 | tail -1
agent-browser fill "@$EMAIL_REF" "bad@test.com" 2>&1 | tail -1
agent-browser fill "@$PWD_REF" "short" 2>&1 | tail -1
agent-browser click "@$BTN_REF" 2>&1 | tail -1
sleep 1
if has_any_text "8 characters|at least|must contain"; then log_pass "Validation error"; else log_fail "Validation" "no error"; fi
URL=$(get_url)
if echo "$URL" | grep -q "/register"; then log_pass "Form blocked"; else log_fail "Form" "navigated"; fi
agent-browser screenshot /tmp/screens/21-validation.png --full 2>&1 | tail -1

echo "--- 5.3 Empty state ---"
SNAP=$(agent-browser snapshot -i 2>&1)
SO_REF=$(get_ref "$SNAP" 'button "Sign out"')
if [ -n "$SO_REF" ]; then agent-browser click "@$SO_REF" 2>&1 | tail -1; fi
sleep 3
open_page "$BASE_URL/register"
SNAP=$(agent-browser snapshot -i 2>&1)
NAME_REF=$(get_ref "$SNAP" 'textbox "Name"')
EMAIL_REF=$(get_ref "$SNAP" 'textbox "Email"')
PWD_REF=$(get_ref "$SNAP" 'textbox "Password"')
BTN_REF=$(get_ref "$SNAP" 'button "Create account"')
agent-browser fill "@$NAME_REF" "Empty User" 2>&1 | tail -1
agent-browser fill "@$EMAIL_REF" "$EMPTY_EMAIL" 2>&1 | tail -1
agent-browser fill "@$PWD_REF" "password1" 2>&1 | tail -1
agent-browser click "@$BTN_REF" 2>&1 | tail -1
# Wait up to 15s for the verify token to appear in server log
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  sleep 1
  TOKEN=$(grep "Email body" /tmp/server.log | grep "$EMPTY_EMAIL" | grep -oE "token=[a-f0-9]+" | head -1 | sed 's/token=//')
  if [ -n "$TOKEN" ]; then break; fi
done
if [ -n "$TOKEN" ]; then
  curl -s -X POST $API_URL/api/auth/verify-email -H 'Content-Type: application/json' -d "{\"email\":\"$EMPTY_EMAIL\",\"token\":\"$TOKEN\"}" > /dev/null
fi
open_page "$BASE_URL/login"
SNAP=$(agent-browser snapshot -i 2>&1)
EMAIL_REF=$(get_ref "$SNAP" 'textbox "Email"')
PWD_REF=$(get_ref "$SNAP" 'textbox "Password"')
BTN_REF=$(get_ref "$SNAP" 'button "Sign in"')
agent-browser fill "@$EMAIL_REF" "$EMPTY_EMAIL" 2>&1 | tail -1
agent-browser fill "@$PWD_REF" "password1" 2>&1 | tail -1
agent-browser click "@$BTN_REF" 2>&1 | tail -1
sleep 3
open_page "$BASE_URL/orders"
sleep 2
URL=$(get_url)
if echo "$URL" | grep -q "/login"; then
  log_fail "Empty state" "login failed, redirected to /login"
elif has_text "no orders yet"; then log_pass "Empty state"; else log_fail "Empty state" "no message"; fi
agent-browser screenshot /tmp/screens/22-empty.png --full 2>&1 | tail -1

echo "--- 5.4 Console errors ---"
agent-browser console --clear 2>&1 > /dev/null
sleep 1
open_page "$BASE_URL/"
open_page "$BASE_URL/menu"
open_page "$BASE_URL/build"
CONSOLE_OUT=$(agent-browser console 2>&1)
REAL_ERRORS=$(echo "$CONSOLE_OUT" | grep -iE "error|exception|failed|uncaught" | grep -viE "vite|hmr|devtools|react-router|future flag|startTransition|connecting|connected")
if [ -z "$REAL_ERRORS" ]; then log_pass "No console errors"; else log_fail "Console" "$(echo "$REAL_ERRORS" | head -3)"; fi

echo "--- 5.5 Page errors ---"
ERR_OUT=$(agent-browser errors 2>&1)
if [ -z "$ERR_OUT" ]; then log_pass "No page errors"; else log_fail "Page errors" "$ERR_OUT"; fi

echo "--- 5.6 Keyboard nav ---"
open_page "$BASE_URL/login"
# Tab through all focusable elements until we reach an input
INPUT_FOCUSED="false"
for i in 1 2 3 4 5 6 7 8 9 10; do
  agent-browser press Tab 2>&1 | tail -1
  sleep 0.5
  INPUT_FOCUSED=$(agent-browser eval "document.activeElement && document.activeElement.tagName === 'INPUT'" 2>&1 | tail -1)
  if echo "$INPUT_FOCUSED" | grep -q "true"; then break; fi
done
FOCUSED=$(agent-browser eval "document.activeElement ? document.activeElement.tagName + ':' + (document.activeElement.name||'') : 'none'" 2>&1 | tail -1)
echo "    Focused: $FOCUSED"
if echo "$INPUT_FOCUSED" | grep -q "true"; then log_pass "Tab reaches input"; else log_fail "Keyboard" "focused $FOCUSED"; fi

echo "--- 5.7 Focus visibility ---"
HAS_OUTLINE=$(agent-browser eval "var el=document.activeElement;var s=getComputedStyle(el);(s.outlineStyle!=='none'&&s.outlineWidth!=='0px')?'VISIBLE':'NONE'" 2>&1 | tail -1)
if echo "$HAS_OUTLINE" | grep -q "VISIBLE"; then log_pass "Focus visible"; else log_fail "Focus" "no outline"; fi

echo ""
echo "========================================"
echo "SUMMARY"
echo "========================================"
echo "PASS: $pass"
echo "FAIL: $fail"
if [ $fail -gt 0 ]; then
  echo ""
  echo "Failures:"
  for f in "${failures[@]}"; do echo "  - $f"; done
fi
echo "========================================"
exit $fail