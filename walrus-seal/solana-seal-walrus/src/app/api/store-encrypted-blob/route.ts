import { NextRequest, NextResponse } from "next/server";
import { fromHex } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

const NET = process.env.NEXT_PUBLIC_SUI_NETWORK as 'mainnet' | 'testnet' | 'devnet' | 'localnet' || "testnet";

// Global error handlers
if (typeof process !== 'undefined') {
    process.on('uncaughtException', (err) => {
        console.error('💥 UNCAUGHT EXCEPTION:', err);
        console.error('Stack:', err.stack);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('💥 UNHANDLED REJECTION at:', promise);
        console.error('Reason:', reason);
    });
}

// Singleton instances
let suiClientInstance: SuiClient | null = null;
let signerInstance: Ed25519Keypair | null = null;

function getSuiClient(): SuiClient {
    if (!suiClientInstance) {
        suiClientInstance = new SuiClient({ url: getFullnodeUrl(NET) });
    }
    return suiClientInstance;
}

function getSigner(): Ed25519Keypair {
    if (!signerInstance) {
        if (!process.env.BACKEND_SUI_KEY) {
            throw new Error("BACKEND_SUI_KEY environment variable is not set");
        }
        signerInstance = Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(process.env.BACKEND_SUI_KEY).secretKey);
    }
    return signerInstance;
}

export async function POST(req: NextRequest) {
    try {
        const { encryptedObject, nonce, solanaAddress, signature } = await req.json();

        // Validate required fields
        if (typeof encryptedObject !== "string" || !encryptedObject) {
            return NextResponse.json(
                { ok: false, error: "Missing encryptedObject (base64)" },
                { status: 400 }
            );
        }

        if (typeof nonce !== "string" || !nonce) {
            return NextResponse.json(
                { ok: false, error: "Missing nonce" },
                { status: 400 }
            );
        }

        if (typeof solanaAddress !== "string" || !solanaAddress) {
            return NextResponse.json(
                { ok: false, error: "Missing solanaAddress" },
                { status: 400 }
            );
        }

        if (typeof signature !== "string" || !signature) {
            return NextResponse.json(
                { ok: false, error: "Missing signature" },
                { status: 400 }
            );
        }

        // Validate Solana signature
        try {
            // Create the message that should have been signed
            const message = `Encrypt data with nonce: ${nonce}`;
            const messageBytes = new TextEncoder().encode(message);

            const bs58 = await import('bs58');
            const signatureBytes = bs58.default.decode(signature);

            // Verify signature
            const nacl = await import('tweetnacl');
            const publicKeyBytes = bs58.default.decode(solanaAddress);

            console.log('Message:', message);
            console.log('Message bytes length:', messageBytes.length);
            console.log('Signature bytes length:', signatureBytes.length);
            console.log('Public key bytes length:', publicKeyBytes.length);

            const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
            console.log('Verification result:', isValid);

            if (!isValid) {
                throw new Error("Invalid signature - verification failed");
            }

        } catch (sigError: any) {
            return NextResponse.json(
                { ok: false, error: `Signature validation failed: ${sigError.message}` },
                { status: 400 }
            );
        }

        // Minimal sanity check
        let bytes: Uint8Array;
        try {
            bytes = new Uint8Array(Buffer.from(encryptedObject, "base64"));
        } catch {
            return NextResponse.json(
                { ok: false, error: "encryptedObject is not valid base64" },
                { status: 400 }
            );
        }

        // Store the encrypted blob using Walrus HTTP API
        const walrusPublisher = process.env.WALRUS_PUBLISHER || "https://publisher.walrus-testnet.walrus.space";

        console.log('Storing blob to Walrus...');
        let walrusData;
        try {
            const walrusRes = await fetch(`${walrusPublisher}/v1/blobs`, {
                method: "PUT",
                body: Buffer.from(bytes),
                headers: {
                    "Content-Type": "application/octet-stream",
                },
            });

            console.log('Walrus response status:', walrusRes.status);

            if (!walrusRes.ok) {
                const errorText = await walrusRes.text();
                console.error('Walrus error:', errorText);
                throw new Error(`Walrus API error: ${walrusRes.status} ${walrusRes.statusText}`);
            }

            walrusData = await walrusRes.json();
            console.log('Walrus data:', walrusData);
        } catch (walrusError: any) {
            console.error("Walrus API error:", walrusError);
            return NextResponse.json(
                { ok: false, error: `Failed to store blob: ${walrusError.message}` },
                { status: 500 }
            );
        }

        // Generate the key ID for PrivateData pattern: [suiAddress bytes][nonce bytes]
        // Convert Solana address to Sui address (same logic as frontend)
        const bs58 = await import('bs58');
        const { blake2b } = await import('@noble/hashes/blake2.js');

        const ed25519PublicKey = bs58.default.decode(solanaAddress);
        let suiBytes = new Uint8Array(ed25519PublicKey.length + 1);
        suiBytes.set([0x0]);
        suiBytes.set(ed25519PublicKey, 1);
        const suiAddressBytes = blake2b(suiBytes, { dkLen: 32 });

        // Convert Sui address bytes to hex string with 0x prefix
        const suiAddress = '0x' + Buffer.from(suiAddressBytes).toString('hex');
        console.log('Sui address:', suiAddress);

        // Convert nonce from hex string back to bytes
        const nonceBytes = fromHex(nonce);

        const keyIdBytes = new Uint8Array([
            ...suiAddressBytes,
            ...nonceBytes
        ]);
        const keyId = Buffer.from(keyIdBytes).toString('hex');
        const blobId: string = walrusData.newlyCreated?.blobObject.blobId || walrusData.alreadyCertified?.blobId;
        const blobObjectId: string | undefined = walrusData.newlyCreated?.blobObject?.id;

        if (!blobId) {
            throw new Error('No blob ID returned from Walrus');
        }

        console.log('Building Sui transaction...');
        console.log('Blob ID:', blobId);
        console.log('Package ID:', process.env.NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID);

        const tx = new Transaction();

        const buf = Buffer.from(blobId, "base64");

        // Ensure it fits into 256 bits (32 bytes)
        if (buf.length > 32) {
            throw new Error("Value exceeds 256-bit unsigned integer range");
        }
        console.log('buffer length ok:');

        const priv_data = tx.moveCall({
            target: `${process.env.NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID}::seal_data::store`,
            arguments: [
                tx.pure.vector('u8', nonceBytes), // nonce as vector<u8>
                tx.pure.u256(`0x` + Buffer.from(blobId, 'base64').toString('hex')),
            ],
        });
        console.log('move-call 0 ok.');

        tx.transferObjects([priv_data], suiAddress);

        console.log('move-call 1 ok.');
        // tx.setGasBudget(500000000);
        const client = getSuiClient();
        const signer = getSigner();

        let resp;
        try {
            console.log('Executing transaction...');
            resp = await client.signAndExecuteTransaction({
                transaction: tx,
                signer,
                options: {
                    showEffects: true,
                }
            });

            console.log('Transaction sent:', resp.digest);

        } catch (txErr: any) {
            console.error('❌ Transaction error caught');
            console.error('Type:', typeof txErr);
            console.error('Constructor:', txErr?.constructor?.name);

            // Safely extract error information
            const errorMessage = txErr?.message || String(txErr);
            const errorCode = txErr?.code;
            const errorName = txErr?.name;

            console.error('Name:', errorName);
            console.error('Code:', errorCode);
            console.error('Message:', errorMessage);

            // Try to stringify safely
            try {
                console.error('JSON:', JSON.stringify(txErr, null, 2));
            } catch {
                console.error('Could not stringify error');
            }

            throw new Error(`Transaction execution failed: ${errorMessage}`);
        }
        if (resp.effects?.status.status !== "success") {
            throw new Error(`Transaction failed: ${resp.effects?.status.error}`);
        }

        console.log('Returning response...');

        return NextResponse.json({
            ok: true,
            size: bytes.byteLength,
            blobId,
            blobObjectId,
            keyId,
            suiAddress,
            txDigest: resp.digest,
            solanaAddress,
            nonce,
        });
    } catch (err: any) {
        console.error("❌ TOP LEVEL ERROR:");
        console.error("Error:", err);
        console.error("Message:", err?.message);
        console.error("Stack:", err?.stack);
        return NextResponse.json(
            { ok: false, error: err?.message || "Unknown error" },
            { status: 500 }
        );
    }
}
