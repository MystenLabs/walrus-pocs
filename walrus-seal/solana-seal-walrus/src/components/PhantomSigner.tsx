"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserSDK, AddressType, NetworkId } from "@phantom/browser-sdk";

export default function PhantomSigner() {
    const sdkRef = useRef<BrowserSDK | null>(null);
    const [connected, setConnected] = useState(false);
    const [address, setAddress] = useState<string>();
    const [message, setMessage] = useState("");
    const [out, setOut] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        // Init on client only
        sdkRef.current = new BrowserSDK({
            providerType: "injected",
            addressTypes: [AddressType.solana],
        });
    }, []);

    const connect = async () => {
        try {
            setBusy(true);
            const sdk = sdkRef.current;
            if (!sdk) throw new Error("SDK not ready");
            const { addresses } = await sdk.connect();
            const addr = addresses.find(a => a.addressType === AddressType.solana)?.address;

            setConnected(true);
            setAddress(addr);
            setOut(`Connected: ${addr ?? "(unknown)"}`);
        } catch (e: any) {
            setOut(`Connect failed: ${e?.message || String(e)}`);
        } finally {
            setBusy(false);
        }
    };

    const sign = async () => {
        try {
            if (!connected) throw new Error("Not connected");
            const msg = message.trim();
            if (!msg) throw new Error("Message is empty");
            setBusy(true);

            const sdk = sdkRef.current;
            if (!sdk) throw new Error("SDK not ready");

            const { signature, rawSignature } = await sdk.signMessage({
                message: msg,
                networkId: NetworkId.SOLANA_MAINNET,
            });

            setOut(
                [
                    "Signed ✅",
                    `Address: ${address ?? "(unknown)"}`,
                    `signature: ${signature}`,
                    `rawSignature: ${rawSignature}`,
                ].join("\n")
            );

            // Send to backend
            await fetch("/api/phantom-sign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, signature, rawSignature, message: msg }),
            });
        } catch (e: any) {
            setOut(`Sign failed: ${e?.message || String(e)}`);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mx-auto max-w-xl space-y-4 p-6">
            <h1 className="text-2xl font-semibold">Phantom + Solana Sign</h1>

            <div className="flex gap-3">
                <button
                    onClick={connect}
                    disabled={busy || connected}
                    className="rounded-lg border px-4 py-2 disabled:opacity-50"
                >
                    {connected ? "Connected" : "Connect"}
                </button>

                <button
                    onClick={sign}
                    disabled={busy || !connected}
                    className="rounded-lg border px-4 py-2 disabled:opacity-50"
                >
                    Sign
                </button>
            </div>

            <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Message to sign…"
                className="w-full min-h-[120px] rounded-lg border p-3"
            />

            <pre className="whitespace-pre-wrap rounded-lg border bg-gray-50 p-3 text-sm">
                {out || "Status output will appear here…"}
            </pre>
        </div>
    );
}
