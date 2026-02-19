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
            model: "gemini-2.5-flash",
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
                return JSON.parse(cleanedText);
            } catch {
                console.warn("Gemini returned text instead of function call:", text);
            }
        }
        throw new Error("Could not understand the message.");

    } catch (error) {
        console.error("Intent parsing error:", error);
        throw new Error("Could not understand the message. Please try again.");
    }
}
