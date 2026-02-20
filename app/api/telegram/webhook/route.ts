import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { parseIntent, parseIntentFastPath } from "@/lib/intent-parser";
import { saveTransaction, getTodaySales, getPersonCredit, getWeekSummary, getSalesByDate } from "@/lib/transcations";
import axios from "axios";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_WEBHOOK_SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const HELP_MESSAGE = `Namaste! Main aapka AI accounting assistant hoon. Main aapke shop ke hisab-kitab me madad kar sakta hoon.

Aap mujhe aise messages bhej sakte hain:
• Bikri: "2kg chawal 100 me beche" ya "Aaj 500 ki sale hui"
• Udhaar: "Rahul ne 200 ka udhaar liya"
• Payment: "Amit ne 500 jama kiye"
• Hisaab: "Aaj ki total sale kitni hai?" ya "Rahul ka kitna udhaar baki hai?"

Main aapki kaise madad karu?`;

export async function POST(req: NextRequest) {
    try {
        // Debug logging for secret token validation
        const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
        console.log("[Webhook] Secret token check:", {
            hasEnvSecret: !!TELEGRAM_WEBHOOK_SECRET_TOKEN,
            hasHeaderSecret: !!secretHeader,
            secretsMatch: secretHeader === TELEGRAM_WEBHOOK_SECRET_TOKEN,
            envSecretLength: TELEGRAM_WEBHOOK_SECRET_TOKEN?.length,
            headerSecretLength: secretHeader?.length
        });

        if (TELEGRAM_WEBHOOK_SECRET_TOKEN) {
            if (secretHeader !== TELEGRAM_WEBHOOK_SECRET_TOKEN) {
                console.log("[Webhook] Unauthorized: Secret token mismatch");
                return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
            }
        }

        const body = await req.json();
        console.log("Telegram Webhook Body:", JSON.stringify(body, null, 2));

        const message = body.message;
        if (!message) return NextResponse.json({ ok: true });

        const chatId = message.chat.id.toString();
        const text = message.text || message.caption || "";
        let audioData: { data: string; mimeType: string } | undefined;

        // Handle Voice/Audio
        const voice = message.voice || message.audio;
        if (voice) {
            try {
                // 1. Get file path from Telegram
                const fileResponse = await axios.get(`${TELEGRAM_API}/getFile?file_id=${voice.file_id}`);
                const filePath = fileResponse.data.result.file_path;

                // 2. Download file
                const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
                const audioResponse = await axios.get(downloadUrl, { responseType: 'arraybuffer' });

                // 3. Convert to base64
                audioData = {
                    data: Buffer.from(audioResponse.data).toString('base64'),
                    mimeType: voice.mime_type || 'audio/ogg'
                };
            } catch (error) {
                console.error("Error downloading voice message:", error);
                await sendTelegramMessage(chatId, "Maafi chahta hoon, voice message download nahi ho paya. Kripya fir se try karein.");
                return NextResponse.json({ ok: true });
            }
        }

        if (!text && !audioData) {
            return NextResponse.json({ ok: true });
        }

        // 1. Find or deep-link user
        let user: { id: string, telegramId: string | null, clerkId: string } | null = null;

        // Try Redis first
        if (redis) {
            try {
                const cachedUser = await redis.get(`user:tg:${chatId}`);
                if (cachedUser) {
                    user = typeof cachedUser === "string" ? JSON.parse(cachedUser) : cachedUser;
                }
            } catch (redisError) {
                console.error("[Redis] Get error:", (redisError as Error).message);
            }
        }

        if (!user) {
            user = await prisma.user.findUnique({
                where: { telegramId: chatId },
            });
            if (user && redis) {
                try {
                    await redis.set(`user:tg:${chatId}`, JSON.stringify(user), { ex: 3600 });
                } catch (redisSetError) {
                    console.error("[Redis] Set error:", (redisSetError as Error).message);
                }
            }
        }

        if (!user) {
            // Check for deep link /start <userId>
            if (text.startsWith("/start ")) {
                const clerkUserId = text.split(" ")[1];
                try {
                    user = await prisma.user.update({
                        where: { clerkId: clerkUserId },
                        data: { telegramId: chatId },
                    });
                    if (redis) {
                        try {
                            await redis.set(`user:tg:${chatId}`, JSON.stringify(user), { ex: 3600 });
                        } catch (redisSetError) {
                            console.error("[Redis] Link set error:", (redisSetError as Error).message);
                        }
                    }
                    await sendTelegramMessage(chatId, "Welcome! Your Telegram account is now linked. You can start recording transactions now via text or voice.");
                } catch {
                    await sendTelegramMessage(chatId, "Sorry, I couldn't find your account. Please click the link from your dashboard again.");
                }

                return NextResponse.json({ ok: true });
            }

            await sendTelegramMessage(
                chatId,
                "Hello! Please link your account first from your dashboard to use this bot.\n\nType /start <your_id> if you have it."
            );
            return NextResponse.json({ ok: true });
        }

        if (text.startsWith("/start")) {
            await sendTelegramMessage(
                chatId,
                "Aapka account linked hai ✅\nAap sale, udhar, payment ya reports text/voice mein bhej sakte hain."
            );
            return NextResponse.json({ ok: true });
        }

        // 2. Parse Intent (Fast-path for text, Gemini fallback)
        const fastPathIntent = !audioData ? parseIntentFastPath(text) : null;
        const intentData = fastPathIntent ?? await parseIntent(text, audioData);
        console.log("Parsed Intent:", intentData);

        // 3. Process Intent
        let responseText = "";

        switch (intentData.intent) {
            case "create_sale":
            case "create_credit":
            case "create_payment":
                if (intentData.intent === "create_sale") {
                    const amount = intentData.total ?? intentData.amount;
                    if (typeof amount !== "number" && typeof intentData.qty === "number" && typeof intentData.price === "number") {
                        const computedTotal = intentData.qty * intentData.price;
                        intentData.total = computedTotal;
                        intentData.amount = computedTotal;
                    }
                }

                if (intentData.intent === "create_payment") {
                    const amount = intentData.total ?? intentData.amount;
                    if (typeof amount !== "number") {
                        if (!intentData.person) {
                            responseText = "Payment record karne ke liye naam ya amount batayein. Jaise: Kunal ne 500 wapas diye.";
                            break;
                        }

                        const pendingCredit = await getPersonCredit(user.id, intentData.person);
                        if (pendingCredit <= 0) {
                            responseText = `${intentData.person} ka koi baki udhar nahi hai.`;
                            break;
                        }

                        intentData.total = pendingCredit;
                        intentData.amount = pendingCredit;
                    }
                }

                try {
                    const tx = await saveTransaction(user.id, intentData);
                    responseText = `Theek hai! ✅ ${intentData.intent.replace("create_", "")} record ho gayi hai.\n\nItem: ${tx.item || "General"}\nAmount: ₹${tx.amount}`;
                } catch (txError) {
                    console.error("Transaction save error:", txError);
                    responseText = "Details thodi unclear hain. Kripya amount ke saath firse bhejein. Example: Kunal ne 500 wapas diye.";
                }
                break;

            case "get_today_sales":
                const totalSales = await getTodaySales(user.id);
                responseText = `Aaj ki total sale ₹${totalSales} hui hai. 📈`;
                break;

            case "get_person_credit":
                if (!intentData.person) {
                    responseText = "Kripya person ka naam batayein.";
                } else {
                    const balance = await getPersonCredit(user.id, intentData.person);
                    if (balance > 0) {
                        responseText = `${intentData.person} ka ₹${balance} udhar hai.`;
                    } else if (balance < 0) {
                        responseText = `${intentData.person} ke ₹${Math.abs(balance)} aapke paas jama hain.`;
                    } else {
                        responseText = `${intentData.person} ka koi udhar nahi hai.`;
                    }
                }
                break;

            case "get_week_summary":
                const weekSummary = await getWeekSummary(user.id);
                responseText = `📊 Is hafte ke aankde:\n\n🏷️ Total Sale: ₹${weekSummary.totalSales}\n📝 Transaction: ${weekSummary.transactionCount}\n💳 Total Udhar: ₹${weekSummary.totalCredit}`;
                break;

            case "get_total_sales_by_date":
                const date = intentData.date || "today";
                const salesByDate = await getSalesByDate(user.id, date);
                responseText = `${date} ki sale ₹${salesByDate} hui hai.`;
                break;

            case "small_talk":
                responseText = HELP_MESSAGE;
                break;

            default:
                responseText = HELP_MESSAGE;
        }

        await sendTelegramMessage(chatId, responseText);
        return NextResponse.json({ ok: true });

    } catch (error) {
        const err = error as Error;
        console.error("Webhook Error:", err);
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}



async function sendTelegramMessage(chatId: string, text: string) {
    try {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: text,
        });
    } catch (err) {
        console.error("Error sending message to Telegram:", err);
    }
}
