import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const WEBHOOK_SETUP_SECRET = process.env.WEBHOOK_SETUP_SECRET;
const TELEGRAM_WEBHOOK_SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;

function getBaseUrl(req: NextRequest): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const host = configured || req.headers.get("host") || "";

  if (!host) {
    throw new Error("Missing host configuration. Set APP_URL in environment variables.");
  }

  if (host.startsWith("http://") || host.startsWith("https://")) {
    return host;
  }

  return `https://${host}`;
}

function getWebhookUrl(req: NextRequest): string {
  const explicitUrl = process.env.TELEGRAM_WEBHOOK_URL;
  if (explicitUrl) {
    return explicitUrl;
  }

  const baseUrl = getBaseUrl(req).replace(/\/$/, "");
  return `${baseUrl}/api/telegram/webhook`;
}

function isAuthorized(req: NextRequest): boolean {
  if (!WEBHOOK_SETUP_SECRET) {
    return false;
  }

  const headerSecret = req.headers.get("x-webhook-setup-secret");
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  return headerSecret === WEBHOOK_SETUP_SECRET || bearerToken === WEBHOOK_SETUP_SECRET;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!TELEGRAM_TOKEN) {
      return NextResponse.json({ ok: false, error: "Missing TELEGRAM_TOKEN" }, { status: 500 });
    }

    const webhookUrl = getWebhookUrl(req);
    const payload: Record<string, string> = { url: webhookUrl };

    if (TELEGRAM_WEBHOOK_SECRET_TOKEN) {
      payload.secret_token = TELEGRAM_WEBHOOK_SECRET_TOKEN;
    }

    const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const result = await telegramResponse.json();

    if (!telegramResponse.ok || !result?.ok) {
      return NextResponse.json(
        { ok: false, error: "Telegram setWebhook failed", details: result },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      webhookUrl,
      telegram: result,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}