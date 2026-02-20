const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_WEBHOOK_SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;

const MIN_RECHECK_INTERVAL_MS = 10 * 60 * 1000;

type GlobalWithWebhookCache = typeof globalThis & {
  __telegramWebhookLastCheckAt?: number;
  __telegramWebhookSetupPromise?: Promise<void>;
};

function normalizeBaseUrl(input: string): string {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input.replace(/\/$/, "");
  }

  return `https://${input.replace(/\/$/, "")}`;
}

function getDesiredWebhookUrl(): string | null {
  if (TELEGRAM_WEBHOOK_URL) {
    return TELEGRAM_WEBHOOK_URL;
  }

  if (!APP_URL) {
    return null;
  }

  return `${normalizeBaseUrl(APP_URL)}/api/telegram/webhook`;
}

export async function ensureTelegramWebhook(): Promise<void> {
  const g = globalThis as GlobalWithWebhookCache;
  const now = Date.now();

  // Check if we've recently verified the webhook
  if (g.__telegramWebhookLastCheckAt && now - g.__telegramWebhookLastCheckAt < MIN_RECHECK_INTERVAL_MS) {
    console.log("[Telegram] Webhook check skipped - recently verified");
    return;
  }

  // Prevent concurrent setup attempts
  if (g.__telegramWebhookSetupPromise) {
    console.log("[Telegram] Webhook setup already in progress");
    return g.__telegramWebhookSetupPromise;
  }

  g.__telegramWebhookSetupPromise = (async () => {
    try {
      const desiredWebhookUrl = getDesiredWebhookUrl();
      
      if (!TELEGRAM_TOKEN) {
        console.warn("[Telegram] TELEGRAM_TOKEN not configured - webhook setup skipped");
        return;
      }

      if (!desiredWebhookUrl) {
        console.warn("[Telegram] Webhook URL could not be determined - webhook setup skipped");
        return;
      }

      console.log("[Telegram] Checking current webhook configuration...");
      
      const infoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo`, {
        method: "GET",
        cache: "no-store",
      });

      if (!infoResponse.ok) {
        console.error("[Telegram] Failed to get webhook info:", infoResponse.statusText);
        return;
      }

      const infoData = await infoResponse.json();
      const currentUrl = infoData?.result?.url;

      console.log("[Telegram] Current webhook URL:", currentUrl || "(not set)");
      console.log("[Telegram] Desired webhook URL:", desiredWebhookUrl);

      if (currentUrl === desiredWebhookUrl) {
        console.log("[Telegram] Webhook already configured correctly ✅");
        g.__telegramWebhookLastCheckAt = now;
        return;
      }

      console.log("[Telegram] Setting up webhook...");

      const payload: Record<string, string> = { url: desiredWebhookUrl };
      if (TELEGRAM_WEBHOOK_SECRET_TOKEN) {
        payload.secret_token = TELEGRAM_WEBHOOK_SECRET_TOKEN;
        console.log("[Telegram] Including secret token in webhook setup");
      } else {
        console.warn("[Telegram] No secret token configured - webhook will be less secure");
      }

      const setWebhookResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const setWebhookData = await setWebhookResponse.json();
      
      if (!setWebhookResponse.ok || !setWebhookData?.ok) {
        console.error("[Telegram] setWebhook failed:", setWebhookData);
      } else {
        console.log("[Telegram] Webhook setup successful ✅");
        console.log("[Telegram] Response:", setWebhookData);
      }

      g.__telegramWebhookLastCheckAt = now;
    } catch (error) {
      console.error("[Telegram] ensure webhook failed:", error);
    } finally {
      g.__telegramWebhookSetupPromise = undefined;
    }
  })();

  return g.__telegramWebhookSetupPromise;
}