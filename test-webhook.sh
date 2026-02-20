#!/bin/bash

# Telegram Webhook Test Script
# This script helps verify your webhook configuration

echo "🔍 Telegram Webhook Verification Script"
echo "========================================"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

TELEGRAM_TOKEN="${TELEGRAM_TOKEN}"
APP_URL="${APP_URL}"
TELEGRAM_WEBHOOK_SECRET_TOKEN="${TELEGRAM_WEBHOOK_SECRET_TOKEN}"

if [ -z "$TELEGRAM_TOKEN" ]; then
    echo "❌ ERROR: TELEGRAM_TOKEN not found in environment"
    exit 1
fi

if [ -z "$APP_URL" ]; then
    echo "❌ ERROR: APP_URL not found in environment"
    exit 1
fi

echo "📋 Configuration:"
echo "   Bot Token: ${TELEGRAM_TOKEN:0:20}..."
echo "   App URL: $APP_URL"
echo "   Secret Token: ${TELEGRAM_WEBHOOK_SECRET_TOKEN:0:20}..."
echo ""

# Step 1: Get current webhook info
echo "1️⃣  Checking current webhook configuration..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo")
echo "$WEBHOOK_INFO" | jq '.'
echo ""

CURRENT_URL=$(echo "$WEBHOOK_INFO" | jq -r '.result.url')
PENDING_UPDATES=$(echo "$WEBHOOK_INFO" | jq -r '.result.pending_update_count')
LAST_ERROR=$(echo "$WEBHOOK_INFO" | jq -r '.result.last_error_message')

echo "   Current URL: ${CURRENT_URL:-"(not set)"}"
echo "   Pending Updates: ${PENDING_UPDATES:-0}"
if [ "$LAST_ERROR" != "null" ] && [ -n "$LAST_ERROR" ]; then
    echo "   ⚠️  Last Error: $LAST_ERROR"
fi
echo ""

# Step 2: Test webhook endpoint
echo "2️⃣  Testing webhook endpoint..."
TEST_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$APP_URL/api/telegram/webhook" \
  -H "Content-Type: application/json" \
  -H "x-telegram-bot-api-secret-token: $TELEGRAM_WEBHOOK_SECRET_TOKEN" \
  -d '{"message":{"chat":{"id":123456},"text":"test"}}')

HTTP_CODE=$(echo "$TEST_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$TEST_RESPONSE" | sed '$d')

echo "   HTTP Status: $HTTP_CODE"
echo "   Response: $RESPONSE_BODY"

if [ "$HTTP_CODE" == "200" ]; then
    echo "   ✅ Webhook endpoint is responding correctly"
elif [ "$HTTP_CODE" == "401" ]; then
    echo "   ❌ ERROR: 401 Unauthorized - Secret token mismatch!"
    echo ""
    echo "   🔧 Fix: Update your Vercel environment variables WITHOUT quotes:"
    echo "      TELEGRAM_WEBHOOK_SECRET_TOKEN=$TELEGRAM_WEBHOOK_SECRET_TOKEN"
else
    echo "   ⚠️  Unexpected status code: $HTTP_CODE"
fi
echo ""

# Step 3: Verify environment variables format
echo "3️⃣  Checking environment variable format..."
if [[ "$TELEGRAM_WEBHOOK_SECRET_TOKEN" == \"*\" ]]; then
    echo "   ❌ ERROR: TELEGRAM_WEBHOOK_SECRET_TOKEN has quotes!"
    echo "   Remove quotes from Vercel environment variables"
else
    echo "   ✅ Secret token format looks correct"
fi
echo ""

# Step 4: Summary and next steps
echo "📝 Summary:"
echo "==========="
EXPECTED_URL="$APP_URL/api/telegram/webhook"

if [ "$CURRENT_URL" == "$EXPECTED_URL" ]; then
    echo "✅ Webhook URL is configured correctly"
else
    echo "⚠️  Webhook URL mismatch:"
    echo "   Expected: $EXPECTED_URL"
    echo "   Current:  ${CURRENT_URL:-"(not set)"}"
    echo ""
    echo "   To fix: Visit your app homepage or run:"
    echo "   curl -X POST $APP_URL/api/telegram/setup-webhook \\"
    echo "     -H \"Authorization: Bearer \$WEBHOOK_SETUP_SECRET\""
fi

if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Webhook endpoint is accessible and authenticated"
else
    echo "❌ Webhook endpoint authentication failed"
fi

if [ "$PENDING_UPDATES" -gt 0 ]; then
    echo "⚠️  There are $PENDING_UPDATES pending updates"
    echo "   These may be failed delivery attempts"
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Fix any errors shown above"
echo "2. Update Vercel environment variables (remove quotes)"
echo "3. Redeploy your application"
echo "4. Visit your app homepage to trigger automatic webhook setup"
echo "5. Send a test message to your bot on Telegram"
echo ""
