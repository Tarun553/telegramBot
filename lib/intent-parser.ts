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
    description: "Extract bookkeeping intent and data from shopkeeper messages",
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

export async function parseIntent(message: string): Promise<IntentData> {
    const today = new Date().toISOString().split("T")[0];

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are an AI accounting assistant for Indian shopkeepers. 
Understand Hindi, Hinglish, or English messages and extract the intent.
Today's date is ${today}.
Message: "${message}"`,
            config: {
                tools: [{
                    functionDeclarations: [bookkeepingFunctionDeclaration]
                }],
            },
        });

        if (response.functionCalls && response.functionCalls.length > 0) {
            const call = response.functionCalls[0];
            const args: any = call.args;

            // Map total to amount if needed for compatibility
            if (args.total) {
                args.amount = args.total;
            }

            return args as IntentData;
        }

        // Fallback if no function call was generated
        console.warn("No function call generated, attempting legacy parse if text is JSON");
        const text = response.text?.trim() ?? "";
        const cleanedText = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanedText);

    } catch (error) {
        console.error("Intent parsing error:", error);
        throw new Error("Could not understand the message. Please try again.");
    }
}
