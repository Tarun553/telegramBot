import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface IntentData {
    intent: string;
    item?: string;
    qty?: number;
    price?: number;
    total?: number;
    amount?: number;
    person?: string;
    date?: string;
}

function normalizeText(input: string) {
    return input
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function extractAmount(text: string): number | undefined {
    const match = text.match(/(?:₹|rs\.?|rupees?|inr)?\s*(\d+(?:\.\d+)?)/i);
    if (!match) return undefined;
    const amount = Number(match[1]);
    return Number.isFinite(amount) ? amount : undefined;
}

function extractPerson(text: string): string | undefined {
    const patterns = [
        /([a-zA-Z\u0900-\u097F]+)\s+ne\b/i,
        /([a-zA-Z\u0900-\u097F]+)\s+ko\b/i,
        /([a-zA-Z\u0900-\u097F]+)\s+ka\s+udhar/i,
        /from\s+([a-zA-Z\u0900-\u097F]+)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match?.[1]) {
            return match[1].trim();
        }
    }

    return undefined;
}

export function parseIntentFastPath(message: string): IntentData | null {
    const text = normalizeText(message);
    if (!text) return null;

    if (
        /^(hi|hey|hello|hii|helo|namaste|namaskar|yo|sup|good morning|good evening)\b/.test(text) ||
        /\b(kya kar sakte ho|what can you do|help|madad|kaise madad|who are you|tum kaun ho)\b/.test(text)
    ) {
        return { intent: "small_talk" };
    }

    if (/\b(today|aaj)\b.*\b(sale|sales|bikri|becha|bechi)\b/.test(text)) {
        return { intent: "get_today_sales" };
    }

    if (/\b(week|weekly|hafta|hafte)\b.*\b(summary|report|hisab|aankde)\b/.test(text)) {
        return { intent: "get_week_summary" };
    }

    const person = extractPerson(message);
    const amount = extractAmount(text);

    if (/\b(sara|saara|poora|pura|full)\b.*\b(udhar|credit)\b.*\b(wapas|vapas|de diya|diya|payment)\b/.test(text)) {
        return {
            intent: "create_payment",
            person,
        };
    }

    if (/\b(udhar|credit)\b.*\b(kitna|kita|balance|baki|baaki)\b/.test(text) || /\bka\s+udhar\b/.test(text)) {
        if (person) {
            return {
                intent: "get_person_credit",
                person,
            };
        }
    }

    if (/\b(wapas|vapas|payment|jama|returned|return)\b/.test(text)) {
        if (amount && amount > 0) {
            return {
                intent: "create_payment",
                person,
                amount,
                total: amount,
            };
        }

        if (person && /\b(udhar|credit)\b/.test(text)) {
            return {
                intent: "create_payment",
                person,
            };
        }
    }

    if (/\b(udhar|credit)\b/.test(text) && amount && amount > 0) {
        return {
            intent: "create_credit",
            person,
            amount,
            total: amount,
        };
    }

    if (/\b(sold|sale|bika|becha|bechi|sold)\b/.test(text) && amount && amount > 0) {
        return {
            intent: "create_sale",
            amount,
            total: amount,
        };
    }

    return null;
}

const bookkeepingFunctionDeclaration = {
    name: "record_bookkeeping_intent",
    description: "Extract bookkeeping intent and data from shopkeeper messages or voice notes",
    parameters: {
        type: Type.OBJECT,
        properties: {
            intent: {
                type: Type.STRING,
                description: "The action to perform",
                enum: [
                    "create_sale",
                    "create_credit",
                    "create_payment",
                    "get_today_sales",
                    "get_person_credit",
                    "get_week_summary",
                    "get_total_sales_by_date"
                ],
            },
            item: {
                type: Type.STRING,
                description: "Name of the item sold (for sales)",
            },
            qty: {
                type: Type.NUMBER,
                description: "Quantity of the item",
            },
            price: {
                type: Type.NUMBER,
                description: "Price per unit",
            },
            total: {
                type: Type.NUMBER,
                description: "Total amount for the transaction (sale, credit, or payment)",
            },
            person: {
                type: Type.STRING,
                description: "Name of the person for credit or payment",
            },
            date: {
                type: Type.STRING,
                description: "Date of the transaction (YYYY-MM-DD)",
            }
        },
        required: ["intent"],
    },
};

export async function parseIntent(message: string, audio?: { data: string; mimeType: string }): Promise<IntentData> {
    const today = new Date().toISOString().split("T")[0];

    const contents: (string | { inlineData: { data: string; mimeType: string } })[] = [
        `You are an AI accounting assistant for Indian shopkeepers. 
Understand Hindi, Hinglish, or English messages (text or voice) and extract the intent.
Today's date is ${today}.`
    ];

    if (message) {
        contents.push(`User Message: "${message}"`);
    }

    if (audio) {
        contents.push({
            inlineData: {
                data: audio.data,
                mimeType: audio.mimeType
            }
        });
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: contents,
            config: {
                tools: [{
                    functionDeclarations: [bookkeepingFunctionDeclaration]
                }],
            },
        });

        if (response.functionCalls && response.functionCalls.length > 0) {
            const call = response.functionCalls[0];
            const args = call.args as Record<string, unknown>;

            // Map total to amount if needed for compatibility
            if (args.total) {
                args.amount = args.total as number;
            } else if (args.amount) {
                args.total = args.amount as number;
            }

            return args as unknown as IntentData;
        }

        // Fallback or if no function call was generated
        const text = response.text?.trim() ?? "";
        if (text) {
            try {
                const cleanedText = text.replace(/```json|```/g, "").trim();
                return JSON.parse(cleanedText) as IntentData;
            } catch {
                console.warn("Gemini returned text instead of function call:", text);
                return { intent: "unknown" };
            }
        }
        return { intent: "unknown" };

    } catch (error) {
        console.error("Intent parsing error:", error);
        return { intent: "unknown" };
    }
}
