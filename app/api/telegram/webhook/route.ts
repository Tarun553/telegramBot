import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseIntent } from "@/lib/intent-parser";
import { saveTransaction, getTodaySales, getPersonCredit, getWeekSummary, getSalesByDate } from "@/lib/transcations";
import axios from "axios";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("Telegram Webhook Body:", JSON.stringify(body, null, 2));

        const message = body.message;
        if (!message || !message.text) {
            return NextResponse.json({ ok: true });
        }

        const chatId = message.chat.id.toString();
        const text = message.text;

        // 1. Find or deep-link user
        let user = await prisma.user.findUnique({
            where: { telegramId: chatId },
        });

        if (!user) {
            // Check for deep link /start <userId>
            if (text.startsWith("/start ")) {
                const clerkUserId = text.split(" ")[1];
                try {
                    user = await prisma.user.update({
                        where: { clerkId: clerkUserId },
                        data: { telegramId: chatId },
                    });
                    await sendTelegramMessage(chatId, "Welcome! Your Telegram account is now linked to your shop dashboard. You can start recording transactions now.");
                } catch (e) {
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

        // 2. Parse Intent
        const intentData = await parseIntent(text);
        console.log("Parsed Intent:", intentData);

        // 3. Process Intent
        let responseText = "";

        switch (intentData.intent) {
            case "create_sale":
            case "create_credit":
            case "create_payment":
                const tx = await saveTransaction(user.id, intentData);
                responseText = `Theek hai! ✅ ${intentData.intent.replace("create_", "")} record ho gayi hai.\n\nItem: ${tx.item || "General"}\nAmount: ₹${tx.amount}`;
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

            default:
                responseText = "Samajh nahi aaya. Kripya dhang se batayein.";
        }

        await sendTelegramMessage(chatId, responseText);
        return NextResponse.json({ ok: true });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
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
