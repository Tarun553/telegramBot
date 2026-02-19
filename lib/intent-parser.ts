import { GoogleGenAI } from "@google/genai";

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

const VALID_INTENTS = [
    "create_sale",
    "create_credit",
    "create_payment",
    "get_today_sales",
    "get_person_credit",
    "get_week_summary",
    "get_total_sales_by_date",
];

export async function parseIntent(message: string): Promise<IntentData> {
    // Get today's date in ISO format for the prompt
    const today = new Date().toISOString().split("T")[0];

    const prompt = `
You are an AI accounting assistant for Indian shopkeepers.

Understand Hindi, Hinglish, or English message and return ONLY valid JSON.

Possible intents:
- create_sale (for sales transactions)
- create_credit (for giving credit/udhar to someone)
- create_payment (for receiving payment from someone who had udhar)
- get_today_sales (query today's total sales)
- get_person_credit (query how much someone owes)
- get_week_summary (query weekly summary)
- get_total_sales_by_date (query sales for a specific date)

Rules:
1. Always return strict JSON with no additional text
2. Use "${today}" as today's date if not provided
3. Map transaction types correctly:
   - "udhar", "credit given" → create_credit
   - "payment received", "diya", "diye" → create_payment
   - "biki", "sale", "becha" → create_sale
4. Extract person name for credit/payment queries
5. For queries like "kitna hai", "kaisa", "summary" → use appropriate READ intent

Response must be valid JSON. Example responses:

{"intent": "create_sale", "item": "maggie", "qty": 12, "price": 20, "total": 240, "date": "${today}"}
{"intent": "get_person_credit", "person": "Ramesh"}
{"intent": "get_today_sales"}
{"intent": "get_week_summary"}

Now parse this message:
"${message}"
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const text = response.text?.trim() ?? "";

        // Clean up the response - sometimes Gemini adds markdown code blocks
        const cleanedText = text.replace(/```json|```/g, "").trim();

        const parsed = JSON.parse(cleanedText);

        // Validate intent
        if (!VALID_INTENTS.includes(parsed.intent)) {
            throw new Error(`Invalid intent: ${parsed.intent}`);
        }

        return parsed as IntentData;
    } catch (error) {
        console.error("Intent parsing error:", error);
        throw new Error("Could not understand the message. Please try again.");
    }
}
