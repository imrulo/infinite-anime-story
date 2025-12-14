
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY;

    return NextResponse.json({
        status: "ok",
        env: {
            hasGeminiKey: !!apiKey,
            keyLength: apiKey ? apiKey.length : 0,
            keyPrefix: apiKey ? apiKey.substring(0, 4) + "****" : "none",
            nodeEnv: process.env.NODE_ENV,
        },
        timestamp: new Date().toISOString()
    });
}
