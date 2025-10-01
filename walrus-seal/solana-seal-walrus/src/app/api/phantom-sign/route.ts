import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { address, signature, rawSignature, message } = await req.json();

        if (!address || !signature || !rawSignature || !message) {
            return NextResponse.json(
                { ok: false, error: "Missing fields" },
                { status: 400 }
            );
        }

        // NOTE: At this stage we just accept. If you later want verification,
        // do it here before storing.
        // Example (optional): verify with tweetnacl using base58 decode, etc.

        // Persist, queue, or log:
        console.log("phantom-sign", {
            address,
            signature,
            rawSignature,
            message,
            ts: new Date().toISOString(),
        });

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json(
            { ok: false, error: err?.message || "Unknown error" },
            { status: 500 }
        );
    }
}
