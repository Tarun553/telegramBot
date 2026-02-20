# Telegram Webhook Setup Guide

## Overview

Your Telegram bot is configured to automatically set up its webhook when users visit your application. No manual curl commands needed!

## How It Works

### Automatic Setup (Primary Method)

1. **User visits homepage** (`app/page.tsx`)
2. **`ensureTelegramWebhook()` runs** server-side
3. **Function checks** current webhook via Telegram API
4. **If needed**, automatically sets webhook with secret token
5. **Result cached** for 10 minutes to avoid excessive API calls

### Files Involved

- `lib/ensure-telegram-webhook.ts` - Main webhook setup logic
- `app/page.tsx` - Calls webhook setup on page load
- `app/api/telegram/webhook/route.ts` - Handles incoming Telegram messages
- `app/api/telegram/setup-webhook/route.ts` - Manual setup endpoint (backup)

## Root Cause of 401 Error

The 401 unauthorized error was caused by **environment variable formatting**:

### ❌ Wrong (with quotes in Vercel):
```
TELEGRAM_WEBHOOK_SECRET_TOKEN="23e9addf461e9353eeb7c6ba63b41c5d05b826d61cbb2a7bccf56f0a876f6ac7"
```

### ✅ Correct (without quotes in Vercel):
```
TELEGRAM_WEBHOOK_SECRET_TOKEN=23e9addf461e9353eeb7c6ba63b41c5d05b826d61cbb2a7bccf56f0a876f6ac7
```

When you add quotes in Vercel's environment variables UI, they become part of the value, causing the secret token comparison to fail.

## Required Environment Variables

Make sure these are set in **Vercel** (without quotes):

```env
# Required
TELEGRAM_TOKEN=8557324266:AAEvG5JOAgjrnxvv9W4mIakyqZcBIMF_bq4
TELEGRAM_WEBHOOK_SECRET_TOKEN=23e9addf461e9353eeb7c6ba63b41c5d05b826d61cbb2a7bccf56f0a876f6ac7
APP_URL=https://telegram-bot-eta-livid.vercel.app

# Optional (for manual setup endpoint)
WEBHOOK_SETUP_SECRET=14b2a564dd6e24b260d17af6932a9358235ddd4d1b66b69ead44327957c8c24d

# Database & Other Services
DATABASE_URL=postgresql://neondb_owner:npg_frCBbMNTj5L3@ep-sparkling-moon-ai0aoatt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require
CLERK_SECRET_KEY=sk_test_s5oZVugsF3mNFw6YSk7OmKGxs0a5GFUF9WIliRDGsQ
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_bW9kZWwtYXJhY2huaWQtMzguY2xlcmsuYWNjb3VudHMuZGV2JA
GEMINI_API_KEY=AIzaSyDycO8v8rlh0SdbFef6Txc2nOjJBHx-BAQ
UPSTASH_REDIS_REST_URL=https://absolute-dolphin-22790.upstash.io
UPSTASH_REDIS_REST_TOKEN=AVkGAAIncDEzZDlmZWM0ZmRiMjc0MWFiYWMxNDFkMWFjMmM4MTFjOXAxMjI3OTA
```

## Testing & Verification

### Method 1: Use Test Script (Recommended)

```bash
./test-webhook.sh
```

This script will:
- Check current webhook configuration
- Test webhook endpoint authentication
- Verify environment variable format
- Provide detailed diagnostics

### Method 2: Manual Commands

```bash
# Check current webhook status
curl "https://api.telegram.org/bot8557324266:AAEvG5JOAgjrnxvv9W4mIakyqZcBIMF_bq4/getWebhookInfo"

# Test webhook endpoint
curl -X POST https://telegram-bot-eta-livid.vercel.app/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -H "x-telegram-bot-api-secret-token: 23e9addf461e9353eeb7c6ba63b41c5d05b826d61cbb2a7bccf56f0a876f6ac7" \
  -d '{"message":{"chat":{"id":123456},"text":"test"}}'

# Manual webhook setup (backup method)
curl -X POST https://telegram-bot-eta-livid.vercel.app/api/telegram/setup-webhook \
  -H "Authorization: Bearer 14b2a564dd6e24b260d17af6932a9358235ddd4d1b66b69ead44327957c8c24d"
```

### Method 3: Check Vercel Logs

After deploying, check your Vercel logs for:
```
[Telegram] Checking current webhook configuration...
[Telegram] Current webhook URL: https://telegram-bot-eta-livid.vercel.app/api/telegram/webhook
[Telegram] Desired webhook URL: https://telegram-bot-eta-livid.vercel.app/api/telegram/webhook
[Telegram] Webhook already configured correctly ✅
```

## Troubleshooting

### Issue: 401 Unauthorized Error

**Cause:** Secret token mismatch (usually due to quotes in env vars)

**Solution:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Remove quotes from `TELEGRAM_WEBHOOK_SECRET_TOKEN`
3. Redeploy application
4. Visit homepage to trigger automatic setup

### Issue: Webhook Not Setting Up

**Cause:** Missing environment variables or incorrect APP_URL

**Solution:**
1. Verify all required env vars are set in Vercel
2. Check `APP_URL` matches your deployed URL
3. Check Vercel logs for error messages
4. Run `./test-webhook.sh` for diagnostics

### Issue: Pending Updates

**Cause:** Previous failed delivery attempts

**Solution:**
```bash
# Delete webhook and pending updates
curl "https://api.telegram.org/bot8557324266:AAEvG5JOAgjrnxvv9W4mIakyqZcBIMF_bq4/deleteWebhook?drop_pending_updates=true"

# Visit homepage or use manual setup
curl -X POST https://telegram-bot-eta-livid.vercel.app/api/telegram/setup-webhook \
  -H "Authorization: Bearer 14b2a564dd6e24b260d17af6932a9358235ddd4d1b66b69ead44327957c8c24d"
```

## Deployment Checklist

Before deploying to Vercel:

- [ ] All environment variables set (without quotes)
- [ ] `APP_URL` matches your Vercel deployment URL
- [ ] Secret tokens are configured
- [ ] Database connection string is correct
- [ ] Clerk keys are set

After deployment:

- [ ] Visit your homepage to trigger webhook setup
- [ ] Check Vercel logs for webhook confirmation
- [ ] Run `./test-webhook.sh` locally
- [ ] Send test message to bot on Telegram
- [ ] Verify bot responds correctly

## Security Notes

1. **Secret Token:** Always use a strong random secret token for `TELEGRAM_WEBHOOK_SECRET_TOKEN`
2. **Webhook Setup Secret:** Keep `WEBHOOK_SETUP_SECRET` private - it's used for manual setup endpoint
3. **Environment Variables:** Never commit `.env` file to git
4. **Logs:** Monitor Vercel logs for unauthorized access attempts

## Additional Resources

- [Telegram Bot API - Webhooks](https://core.telegram.org/bots/api#setwebhook)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

## Support

If you encounter issues:
1. Run `./test-webhook.sh` and save the output
2. Check Vercel deployment logs
3. Verify all environment variables are set correctly
4. Ensure no quotes in Vercel env vars

---

Last Updated: 2026-02-20
