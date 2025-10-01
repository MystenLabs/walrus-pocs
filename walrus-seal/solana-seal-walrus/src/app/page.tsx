"use client";

import { useEffect, useRef, useState } from "react";
import { useSealEncrypt } from "@/hooks/useSealEncrypt";
import { BrowserSDK, AddressType, NetworkId } from "@phantom/browser-sdk";

export default function EncryptPage() {
  const { encryptUtf8 } = useSealEncrypt();
  const sdkRef = useRef<BrowserSDK | null>(null);
  
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [cipherPreview, setCipherPreview] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string>();
  useEffect(() => {
    // Init Phantom SDK on client only
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
      setStatus(`Connected: ${addr ?? "(unknown)"}`);
    } catch (e: any) {
      setStatus(`Connect failed: ${e?.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const onEncryptAndSend = async () => {
    try {
      setBusy(true);
      setStatus("");
      if (!message.trim()) throw new Error("Message is empty");
      if (!connected || !address) throw new Error("Please connect your Solana wallet first");

      // 1) Encrypt with Solana address (nonce generated inside)
      const { encryptedObjectBase64, keyId, nonce } = await encryptUtf8(message, address);
      setCipherPreview(encryptedObjectBase64.slice(0, 88) + "…"); // just UI sugar

      // 2) Sign the message with the generated nonce
      const sdk = sdkRef.current;
      if (!sdk) throw new Error("SDK not ready");

      const messageToSign = `Encrypt data with nonce: ${nonce}`;
      const { signature } = await sdk.signMessage({
        message: messageToSign,
        networkId: NetworkId.SOLANA_MAINNET,
      });

      // 3) Send ciphertext to backend with signature
      const res = await fetch("/api/store-encrypted-blob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encryptedObject: encryptedObjectBase64,
          nonce: nonce,
          solanaAddress: address,
          signature: signature, // Use signature directly (Uint8Array will be JSON stringified)
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Store failed");

      setStatus(
        `Stored OK!\nKey ID: ${keyId}\nBlob ID: ${json.blobId || "N/A"}\nTx Digest: ${json.txDigest || "N/A"}\nSize: ${json.size ?? "?"} bytes`
      );
    } catch (e: any) {
      setStatus(`Error: ${e?.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-xl font-semibold">Seal: Encrypt & Send with Solana</h1>

      {/* Wallet Connection */}
      <div className="space-y-2">
        <div className="flex gap-3">
          <button
            onClick={connect}
            disabled={busy || connected}
            className="rounded bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed"
          >
            {connected ? "Connected" : "Connect Wallet"}
          </button>
          {connected && address && (
            <div className="text-sm text-gray-600 dark:text-gray-400 self-center">
              {address.slice(0, 8)}...{address.slice(-8)}
            </div>
          )}
        </div>
      </div>

      <textarea
        className="w-full min-h-[160px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        placeholder="Write your message…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button
        type="button"
        onClick={onEncryptAndSend}
        disabled={busy || !connected}
        className="rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed"
      >
        {busy ? "Working…" : connected ? "Encrypt & Send" : "Connect Wallet First"}
      </button>

      {cipherPreview ? (
        <pre className="whitespace-pre-wrap rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-3 text-xs text-gray-800 dark:text-gray-200">
          <b>Ciphertext (base64, preview):</b> {cipherPreview}
        </pre>
      ) : null}

      <div className="text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-pre-line">{status}</div>
    </main>
  );
}
