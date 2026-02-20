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

  if (g.__telegramWebhookLastCheckAt && now - g.__telegramWebhookLastCheckAt < MIN_RECHECK_INTERVAL_MS) {
    return;
  }

  if (g.__telegramWebhookSetupPromise) {
    return g.__telegramWebhookSetupPromise;
  }

  g.__telegramWebhookSetupPromise = (async () => {
    try {
      const desiredWebhookUrl = getDesiredWebhookUrl();
      if (!TELEGRAM_TOKEN || !desiredWebhookUrl) {
        return;
      }

      const infoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo`, {
        method: "GET",
        cache: "no-store",
      });

      const infoData = await infoResponse.json();
      const currentUrl = infoData?.result?.url;

      if (currentUrl === desiredWebhookUrl) {
        g.__telegramWebhookLastCheckAt = now;
        return;
      }

      const payload: Record<string, string> = { url: desiredWebhookUrl };
      if (TELEGRAM_WEBHOOK_SECRET_TOKEN) {
        payload.secret_token = TELEGRAM_WEBHOOK_SECRET_TOKEN;
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
        console.error("[Telegram] setWebhook failed", setWebhookData);
      }

      g.__telegramWebhookLastCheckAt = now;
    } catch (error) {
      console.error("[Telegram] ensure webhook failed", error);
    } finally {
      g.__telegramWebhookSetupPromise = undefined;
    }
  })();

  return g.__telegramWebhookSetupPromise;
}