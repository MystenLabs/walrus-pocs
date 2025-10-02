"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSealEncrypt } from "@/hooks/useSealEncrypt";
import { useSealDecrypt } from "@/hooks/useSealDecrypt";
import { useSealSession } from "@/hooks/useSealSession";

export default function EncryptPage() {
  const { encryptUtf8 } = useSealEncrypt();
  const { decryptData } = useSealDecrypt();
  const { session, initializeSession, clearSession, isSessionValid } = useSealSession();
  const currentAccount = useCurrentAccount();
  
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [cipherPreview, setCipherPreview] = useState<string>("");
  const [sessionInitialized, setSessionInitialized] = useState(false);
  
  // Sync sessionInitialized state with session (auto-reset on wallet change)
  useEffect(() => {
    if (!session) {
      setSessionInitialized(false);
    }
  }, [session]);
  
  // Decryption state
  const [blobId, setBlobId] = useState("");
  const [decryptBusy, setDecryptBusy] = useState(false);
  const [decryptStatus, setDecryptStatus] = useState<string>("");
  const [decryptedMessage, setDecryptedMessage] = useState<string>("");

  const initSession = async () => {
    try {
      setBusy(true);
      setStatus("Initializing Seal session...");

      // Initialize the Seal session (auto-detects connected wallet and prompts to sign)
      await initializeSession();

      setSessionInitialized(true);
      setStatus(`Seal session initialized ✓`);
    } catch (e: any) {
      console.error('❌ Session initialization error:', e);
      setStatus(`Session init failed: ${e?.message || String(e)}`);
      clearSession();
      setSessionInitialized(false);
    } finally {
      setBusy(false);
    }
  };

  const onEncryptAndSend = async () => {
    try {
      setBusy(true);
      setStatus("");
      if (!message.trim()) throw new Error("Message is empty");
      if (!currentAccount?.address) throw new Error("Please connect your Sui wallet first");
      
      // Check if session is valid
      if (!session || !isSessionValid()) {
        throw new Error("Seal session expired. Please initialize session first.");
      }

      // 1) Encrypt with Sui address (nonce generated inside)
      const { encryptedObjectBase64, keyId, nonce } = await encryptUtf8(message, currentAccount.address);
      setCipherPreview(encryptedObjectBase64.slice(0, 66) + "…"); // just UI sugar

      // 2) Use the session signature (no need to sign again!)
      const signatureBase64 = session.signatureBase64;
      const personalMessageBase64 = Buffer.from(session.personalMessageBytes).toString('base64');

      // 3) Send ciphertext to backend with session signature and personal message
      const res = await fetch("/api/store-encrypted-blob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encryptedObject: encryptedObjectBase64,
          nonce: nonce,
          suiAddress: currentAccount.address,
          signature: signatureBase64,
          personalMessageBase64: personalMessageBase64, // Include the message that was signed (as base64)
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Store failed");

      setStatus(
        `Stored OK!\nKey ID: ${keyId.slice(0, 66)}…\nBlob ID: ${json.blobId || "N/A"}\nTx Digest: ${json.txDigest || "N/A"}\nSize: ${json.size ?? "?"} bytes`
      );
    } catch (e: any) {
      setStatus(`Error: ${e?.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const onDecrypt = async () => {
    try {
      setDecryptBusy(true);
      setDecryptStatus("");
      setDecryptedMessage("");
      
      if (!blobId.trim()) throw new Error("Blob ID is empty");
      if (!currentAccount?.address) throw new Error("Please connect your Sui wallet first");
      
      // Check if session is valid
      if (!session || !isSessionValid()) {
        throw new Error("Seal session expired. Please initialize session first.");
      }

      // 1) Fetch encrypted blob directly from Walrus aggregator
      const walrusAggregator = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR || "https://aggregator.walrus-testnet.walrus.space";
      const walrusRes = await fetch(`${walrusAggregator}/v1/blobs/${blobId.trim()}`);
      
      if (!walrusRes.ok) {
        throw new Error(`Failed to fetch blob from Walrus: ${walrusRes.statusText}`);
      }
      
      const encryptedBytes = await walrusRes.arrayBuffer();
      const encryptedObjectBase64 = Buffer.from(encryptedBytes).toString('base64');

      // 2) Decrypt using the hook with the session's SessionKey
      // The decryptData will fetch the PrivateData object by blobId
      const decrypted = await decryptData(
        encryptedObjectBase64,
        currentAccount.address,
        blobId.trim(),
        session.sessionKey
      );

      setDecryptedMessage(decrypted);
      setDecryptStatus("Decryption successful! (Direct from Walrus)");
    } catch (e: any) {
      setDecryptStatus(`Error: ${e?.message || String(e)}`);
    } finally {
      setDecryptBusy(false);
    }
  };

  const connected = !!currentAccount?.address;
  const canUse = connected && sessionInitialized;

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-xl font-semibold">Seal: Encrypt & Send with Sui</h1>

      {/* Wallet Connection Status */}
      <div className="space-y-2">
        {connected ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Connected: {currentAccount.address}
          </div>
        ) : (
          <div className="text-sm text-amber-600 dark:text-amber-400">
            Please connect your Sui wallet using the button in the header
          </div>
        )}
        
        {connected && !sessionInitialized && (
          <button
            onClick={initSession}
            disabled={busy}
            className="rounded bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed"
          >
            {busy ? "Initializing..." : "Initialize Seal Session"}
          </button>
        )}
        
        {sessionInitialized && (
          <div className="text-sm text-green-600 dark:text-green-400">
            ✓ Seal session active
          </div>
        )}
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
        disabled={busy || !canUse}
        className="rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed"
      >
        {busy ? "Working…" : canUse ? "Encrypt & Send" : "Initialize Session First"}
      </button>

      {cipherPreview ? (
        <pre className="whitespace-pre-wrap rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-3 text-xs text-gray-800 dark:text-gray-200">
          <b>Ciphertext (base64, preview):</b> {cipherPreview}
        </pre>
      ) : null}

      <div className="text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-pre-line">{status}</div>

      {/* Divider */}
      <hr className="my-8 border-gray-300 dark:border-gray-600" />

      {/* Decryption Section */}
      <h2 className="text-xl font-semibold">Decrypt Data</h2>
      
      <input
        type="text"
        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Enter Blob ID (base64)..."
        value={blobId}
        onChange={(e) => setBlobId(e.target.value)}
      />

      <button
        type="button"
        onClick={onDecrypt}
        disabled={decryptBusy || !canUse}
        className="rounded bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed"
      >
        {decryptBusy ? "Decrypting…" : canUse ? "Decrypt" : "Initialize Session First"}
      </button>

      {decryptedMessage ? (
        <div className="rounded border border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20 p-4">
          <div className="font-semibold text-green-800 dark:text-green-300 mb-2">Decrypted Message:</div>
          <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{decryptedMessage}</div>
        </div>
      ) : null}

      <div className="text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-pre-line">{decryptStatus}</div>
    </main>
  );
}
