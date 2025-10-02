"use client";

import { useState } from "react";
import Link from "next/link";

export default function TestNaclSealSessionPage() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");

  const testNaclSession = async () => {
    try {
      setBusy(true);
      setStatus("🧪 Testing nacl-based session creation...");

      const res = await fetch("/api/test-nacl-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Test failed");
      }

      setStatus(
        `✅ nacl session test PASSED!\n\n` +
        `Address: ${json.address}\n\n` +
        `Details:\n${JSON.stringify(json.details, null, 2)}\n\n` +
        `Check the server console for detailed step-by-step logs.`
      );
    } catch (e: any) {
      setStatus(`❌ nacl test failed: ${e?.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🧪 Test nacl-based Seal Session</h1>
        <Link 
          href="/"
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to Main
        </Link>
      </div>

      <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            What does this test?
          </h2>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            This test demonstrates how to create a Seal session using <strong>nacl signing</strong> instead 
            of Sui wallet's <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">signPersonalMessage</code>.
          </p>
        </div>

        <div>
          <h3 className="text-md font-semibold text-blue-900 dark:text-blue-100 mb-2">
            How it works:
          </h3>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
            <li>Creates a Seal <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">SessionKey</code> using the backend's Ed25519 keypair</li>
            <li>Extracts the personal message that needs to be signed</li>
            <li><strong>BCS-encodes</strong> the message: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">bcs.vector(bcs.u8()).serialize(message)</code></li>
            <li><strong>Prepends Intent Scope</strong>: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">[0x03, 0x00, 0x00]</code> (PersonalMessage intent)</li>
            <li><strong>Hashes with Blake2b</strong>: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">blake2b(intentBytes + bcsEncoded, &#123; dkLen: 32 &#125;)</code></li>
            <li><strong>Signs with nacl</strong>: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">nacl.sign.detached(digest, secretKey)</code></li>
            <li><strong>Formats as Sui signature</strong>: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">[0x00][64-byte sig][32-byte pubkey]</code></li>
            <li>Sets the signature on the SessionKey and verifies it's accepted by Seal</li>
          </ol>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded p-4">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            <strong>💡 Use Case:</strong> This approach is necessary when integrating Seal with non-Sui wallets 
            like Phantom (Solana), MetaMask (EVM), or any custom signing solution where you need to manually 
            construct Sui-compatible signatures.
          </p>
        </div>
      </div>

      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-6 space-y-4">
        <button
          onClick={testNaclSession}
          disabled={busy}
          className="w-full rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 text-lg font-semibold transition-colors disabled:cursor-not-allowed"
        >
          {busy ? "Running Test..." : "▶ Run nacl Session Test"}
        </button>

        {status && (
          <div className="rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100 font-mono">
              {status}
            </pre>
          </div>
        )}
      </div>

      <div className="border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/20 p-6">
        <h3 className="text-md font-semibold text-purple-900 dark:text-purple-100 mb-3">
          📚 Implementation Reference
        </h3>
        <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
          See <code className="bg-purple-100 dark:bg-purple-800 px-1 rounded">app/src/utils/sealUtils.ts</code> for 
          complete documentation and code examples of the signature format.
        </p>
        <p className="text-sm text-purple-800 dark:text-purple-200">
          Backend implementation: <code className="bg-purple-100 dark:bg-purple-800 px-1 rounded">app/src/app/api/test-nacl-session/route.ts</code>
        </p>
      </div>

      <div className="text-center pt-4">
        <Link 
          href="/"
          className="inline-block text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
        >
          ← Back to Encrypt/Decrypt Demo
        </Link>
      </div>
    </main>
  );
}

