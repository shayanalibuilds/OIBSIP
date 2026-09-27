#!/usr/bin/env bash
# Smoke-tests every API route. Run from project root.
set -uo pipefail
BASE=http://localhost:8800/api

pass=0
fail=0
declare -a failures

check() {
  local name="$1"; local expected="$2"; local got="$3"
  if [[ "$got" == "$expected" ]]; then
    echo "OK   $name -> $got"
    pass=$((pass+1))
  else
    echo "FAIL $name -> got $got, want $expected"
    failures+=("$name")
    fail=$((fail+1))
  fi
}

status_of() {
  local body
  body=$(curl -s -o /dev/null -w '%{http_code}' "$@" 2>/dev/null)
  echo "$body"
}

echo "== Health =="
check "GET /health" 200 "$(status_of $BASE/health)"

echo "== Auth: register (bad password) =="
check "POST /auth/register (short pwd)" 400 "$(status_of -X POST $BASE/auth/register -H 'Content-Type: application/json' -d '{"name":"Test","email":"bad@example.com","password":"x"}')"

echo "== Auth: register (valid) =="
REG_BODY=$(curl -s -X POST $BASE/auth/register -H 'Content-Type: application/json' -d '{"name":"Test User","email":"test@example.com","password":"password1"}')
echo "    register body: $REG_BODY"
check "POST /auth/register (valid)" 201 "$(status_of -X POST $BASE/auth/register -H 'Content-Type: application/json' -d '{"name":"Test User 2","email":"test2@example.com","password":"password1"}')"

echo "== Auth: duplicate email =="
check "POST /auth/register (duplicate)" 409 "$(status_of -X POST $BASE/auth/register -H 'Content-Type: application/json' -d '{"name":"Test User","email":"test2@example.com","password":"password1"}')"

echo "== Auth: login before verify =="
check "POST /auth/login (unverified)" 403 "$(status_of -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"test@example.com","password":"password1"}')"

echo "== Auth: verify email (bad token) =="
check "POST /auth/verify-email (bad token)" 400 "$(status_of -X POST $BASE/auth/verify-email -H 'Content-Type: application/json' -d '{"email":"test@example.com","token":"deadbeef"}')"

echo "== Auth: login admin =="
ADMIN_LOGIN=$(curl -s -X POST $BASE/admin/login -H 'Content-Type: application/json' -d '{"email":"admin@ovenly.dev","password":"Admin1234"}')
echo "    admin login body: $ADMIN_LOGIN"
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | python3 -c "import json,sys; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || echo "")
if [[ -n "$ADMIN_TOKEN" ]]; then
  check "POST /admin/login (admin)" 200 "$(status_of -X POST $BASE/admin/login -H 'Content-Type: application/json' -d '{"email":"admin@ovenly.dev","password":"Admin1234"}')"
else
  echo "FAIL admin login did not return token"
  fail=$((fail+1))
fi

echo "== /api/me without auth =="
check "GET /me (no auth)" 401 "$(status_of $BASE/me)"

echo "== /api/me with auth =="
check "GET /me (admin)" 200 "$(status_of -H "Authorization: Bearer $ADMIN_TOKEN" $BASE/me)"

echo "== Catalog =="
CATALOG_BODY=$(curl -s $BASE/catalog)
echo "    catalog count: $(echo "$CATALOG_BODY" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["items"]))' 2>/dev/null || echo '?')"
check "GET /catalog" 200 "$(status_of $BASE/catalog)"

echo "== Orders without auth =="
check "POST /orders (no auth)" 401 "$(status_of -X POST $BASE/orders -H 'Content-Type: application/json' -d '{}')"

echo "== Admin inventory without auth =="
check "GET /admin/inventory (no auth)" 401 "$(status_of $BASE/admin/inventory)"

echo "== Admin inventory as admin =="
INV_BODY=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" $BASE/admin/inventory)
INV_COUNT=$(echo "$INV_BODY" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["items"]))' 2>/dev/null || echo '?')
echo "    inventory count: $INV_COUNT"
check "GET /admin/inventory (admin)" 200 "$(status_of -H "Authorization: Bearer $ADMIN_TOKEN" $BASE/admin/inventory)"

echo "== Admin orders without auth =="
check "GET /admin/orders (no auth)" 401 "$(status_of $BASE/admin/orders)"

echo "== Admin orders as admin =="
check "GET /admin/orders (admin)" 200 "$(status_of -H "Authorization: Bearer $ADMIN_TOKEN" $BASE/admin/orders)"

echo "== Build a real order =="
CATALOG_JSON=$(curl -s $BASE/catalog)
BASE_ID=$(echo "$CATALOG_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin)["items"]; print(next(i["id"] for i in d if i["category"]=="base"))' 2>/dev/null || echo "")
SAUCE_ID=$(echo "$CATALOG_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin)["items"]; print(next(i["id"] for i in d if i["category"]=="sauce"))' 2>/dev/null || echo "")
CHEESE_ID=$(echo "$CATALOG_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin)["items"]; print(next(i["id"] for i in d if i["category"]=="cheese"))' 2>/dev/null || echo "")
VEG_ID=$(echo "$CATALOG_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin)["items"]; print(next(i["id"] for i in d if i["category"]=="vegetable"))' 2>/dev/null || echo "")
echo "    base=$BASE_ID sauce=$SAUCE_ID cheese=$CHEESE_ID veg=$VEG_ID"

ORDER_BODY=$(curl -s -X POST $BASE/orders -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d "{\"baseId\":\"$BASE_ID\",\"sauceId\":\"$SAUCE_ID\",\"cheeseId\":\"$CHEESE_ID\",\"vegetableIds\":[\"$VEG_ID\"],\"quantity\":2}")
echo "    order body: $ORDER_BODY"
ORDER_ID=$(echo "$ORDER_BODY" | python3 -c "import json,sys; print(json.load(sys.stdin)['order']['id'])" 2>/dev/null || echo "")
if [[ -n "$ORDER_ID" ]]; then
  pass=$((pass+1))
  echo "OK   POST /orders (valid) -> 201"
else
  fail=$((fail+1))
  echo "FAIL POST /orders (valid)"
fi

echo "== Orders: list mine =="
check "GET /orders (admin)" 200 "$(status_of -H "Authorization: Bearer $ADMIN_TOKEN" $BASE/orders)"

echo "== Orders: get one =="
if [[ -n "$ORDER_ID" ]]; then
  check "GET /orders/:id" 200 "$(status_of -H "Authorization: Bearer $ADMIN_TOKEN" $BASE/orders/$ORDER_ID)"
fi

echo "== Orders: bad id =="
check "GET /orders/:bad-id" 404 "$(status_of -H "Authorization: Bearer $ADMIN_TOKEN" $BASE/orders/$(python3 -c 'print("0"*24)'))"

echo "== Payments: dev mock =="
if [[ -n "$ORDER_ID" ]]; then
  MOCK_BODY=$(curl -s -X POST $BASE/payments/dev/mock-success -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d "{\"orderId\":\"$ORDER_ID\"}")
  echo "    mock body: $MOCK_BODY"
  if echo "$MOCK_BODY" | grep -q '"status":"paid"'; then
    pass=$((pass+1))
    echo "OK   POST /payments/dev/mock-success -> paid"
  else
    fail=$((fail+1))
    echo "FAIL POST /payments/dev/mock-success"
  fi
fi

echo "== Payments: Razorpay create-order (no keys, should fail cleanly) =="
if [[ -n "$BASE_ID" ]]; then
  NEW_ORDER=$(curl -s -X POST $BASE/orders -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d "{\"baseId\":\"$BASE_ID\",\"sauceId\":\"$SAUCE_ID\",\"cheeseId\":\"$CHEESE_ID\",\"vegetableIds\":[],\"quantity\":1}")
  NEW_ORDER_ID=$(echo "$NEW_ORDER" | python3 -c "import json,sys; print(json.load(sys.stdin)['order']['id'])" 2>/dev/null || echo "")
  if [[ -n "$NEW_ORDER_ID" ]]; then
    RZP_STATUS=$(status_of -X POST $BASE/payments/razorpay/order -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d "{\"orderId\":\"$NEW_ORDER_ID\"}")
    echo "    razorpay create-order status: $RZP_STATUS (expected non-2xx since no keys)"
    if [[ "$RZP_STATUS" =~ ^(400|500|503)$ ]]; then
      pass=$((pass+1))
      echo "OK   POST /payments/razorpay/order (clean reject) -> $RZP_STATUS"
    else
      fail=$((fail+1))
      echo "FAIL POST /payments/razorpay/order -> $RZP_STATUS"
    fi
  fi
fi

echo "== Admin: change order status =="
if [[ -n "$BASE_ID" ]]; then
  ORD2=$(curl -s -X POST $BASE/orders -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d "{\"baseId\":\"$BASE_ID\",\"sauceId\":\"$SAUCE_ID\",\"cheeseId\":\"$CHEESE_ID\",\"vegetableIds\":[],\"quantity\":1}")
  ORD2_ID=$(echo "$ORD2" | python3 -c "import json,sys; print(json.load(sys.stdin)['order']['id'])" 2>/dev/null || echo "")
  if [[ -n "$ORD2_ID" ]]; then
    curl -s -X POST $BASE/payments/dev/mock-success -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d "{\"orderId\":\"$ORD2_ID\"}" > /dev/null
    CHANGE_BODY=$(curl -s -X PATCH $BASE/admin/orders/$ORD2_ID/status -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"status":"in_kitchen"}')
    echo "    change status body: $CHANGE_BODY"
    check "PATCH /admin/orders/:id/status" 200 "$(status_of -X PATCH $BASE/admin/orders/$ORD2_ID/status -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"status":"out_for_delivery"}')"
    check "PATCH /admin/orders/:id/status (invalid)" 400 "$(status_of -X PATCH $BASE/admin/orders/$ORD2_ID/status -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"status":"received"}')"
  fi
fi

echo "== Admin: patch inventory =="
if [[ -n "$BASE_ID" ]]; then
  check "PATCH /admin/inventory/:id" 200 "$(status_of -X PATCH $BASE/admin/inventory/$BASE_ID -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"stock":99}')"
fi

echo "== Auth: refresh =="
ADMIN_REFRESH=$(echo "$ADMIN_LOGIN" | python3 -c "import json,sys; print(json.load(sys.stdin)['refreshToken'])" 2>/dev/null || echo "")
if [[ -n "$ADMIN_REFRESH" ]]; then
  check "POST /auth/refresh" 200 "$(status_of -X POST $BASE/auth/refresh -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$ADMIN_REFRESH\"}")"
fi

echo "== Auth: forgot password =="
check "POST /auth/forgot-password" 200 "$(status_of -X POST $BASE/auth/forgot-password -H 'Content-Type: application/json' -d '{"email":"nonexistent@example.com"}')"

echo "== Auth: logout (already used refresh) =="
if [[ -n "$ADMIN_REFRESH" ]]; then
  # refresh already rotated the token, so logout will return 200 anyway (idempotent)
  check "POST /auth/logout" 200 "$(status_of -X POST $BASE/auth/logout -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$ADMIN_REFRESH\"}")"
fi

echo ""
echo "=========================================="
echo "PASS: $pass   FAIL: $fail"
if [[ $fail -gt 0 ]]; then
  echo "Failures: ${failures[@]}"
fi
echo "=========================================="