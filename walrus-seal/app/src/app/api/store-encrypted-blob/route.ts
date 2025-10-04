import { NextRequest, NextResponse } from "next/server";
import { fromHex } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { SEAL_CONFIG } from "@/utils/sealUtils";

// Global error handlers
if (typeof process !== 'undefined') {
    process.on('uncaughtException', (err) => {
        console.error('Uncaught exception:', err);
    });

    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled rejection:', reason);
    });
}

// Singleton instances
let suiClientInstance: SuiClient | null = null;
let signerInstance: Ed25519Keypair | null = null;

function getSuiClient(): SuiClient {
    if (!suiClientInstance) {
        suiClientInstance = new SuiClient({ 
            url: getFullnodeUrl(SEAL_CONFIG.network) 
        });
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
        const { encryptedObject, nonce, suiAddress, signature, personalMessageBase64 } = await req.json();

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

        if (typeof suiAddress !== "string" || !suiAddress) {
            return NextResponse.json(
                { ok: false, error: "Missing suiAddress" },
                { status: 400 }
            );
        }

        if (typeof signature !== "string" || !signature) {
            return NextResponse.json(
                { ok: false, error: "Missing signature" },
                { status: 400 }
            );
        }

        if (typeof personalMessageBase64 !== "string" || !personalMessageBase64) {
            return NextResponse.json(
                { ok: false, error: "Missing personalMessageBase64" },
                { status: 400 }
            );
        }

        // Validate Sui signature
        try {
            // Decode the personal message from base64 (Seal's personal message is binary)
            const messageBytes = Buffer.from(personalMessageBase64, 'base64');

            const publicKey = await verifyPersonalMessageSignature(
                messageBytes,
                signature
            );
            
            // Verify the signature matches the claimed address
            if (publicKey.toSuiAddress() !== suiAddress) {
                throw new Error("Signature does not match the provided Sui address");
            }

        } catch (sigError: any) {
            console.error('❌ Signature validation error:', sigError);
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

        let walrusData;
        try {
            const walrusRes = await fetch(`${walrusPublisher}/v1/blobs`, {
                method: "PUT",
                body: Buffer.from(bytes),
                headers: {
                    "Content-Type": "application/octet-stream",
                },
            });

            if (!walrusRes.ok) {
                const errorText = await walrusRes.text();
                throw new Error(`Walrus API error: ${walrusRes.status} - ${errorText}`);
            }

            walrusData = await walrusRes.json();
        } catch (walrusError: any) {
            console.error("Walrus storage error:", walrusError);
            return NextResponse.json(
                { ok: false, error: `Failed to store blob: ${walrusError.message}` },
                { status: 500 }
            );
        }

        // Generate the key ID for PrivateData pattern: [suiAddress bytes][nonce bytes]
        const suiAddressBytes = fromHex(suiAddress.replace(/^0x/, ''));
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

        tx.moveCall({
            target: `${process.env.NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID}::seal_data::store_and_transfer`,
            arguments: [
                tx.pure.address(suiAddress),
                tx.pure.vector('u8', nonceBytes), // nonce as vector<u8>
                tx.pure.string(blobId),
            ],
        });

        const client = getSuiClient();
        const signer = getSigner();

        let resp;
        try {
            resp = await client.signAndExecuteTransaction({
                transaction: tx,
                signer,
                options: {
                    showEffects: true,
                }
            });
        } catch (txErr: any) {

            const errorMessage = txErr?.message || String(txErr);
            console.error('Transaction error:', errorMessage);

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
            nonce,
        });
    } catch (err: any) {
        console.error("API error:", err?.message || err);
        return NextResponse.json(
            { ok: false, error: err?.message || "Unknown error" },
            { status: 500 }
        );
    }
}
