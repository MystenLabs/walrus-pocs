import { NextRequest, NextResponse } from "next/server";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { SessionKey } from "@mysten/seal";
import { bcs } from "@mysten/bcs";
import { blake2b } from "@noble/hashes/blake2.js";
import nacl from "tweetnacl";
import { SEAL_CONFIG } from "@/utils/sealUtils";

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

/**
 * Test endpoint: Create a Seal session using nacl signing (non-Sui wallet simulation)
 * 
 * This demonstrates how to sign Seal personal messages using raw nacl 
 * instead of Sui wallet's signPersonalMessage API.
 */
export async function POST(req: NextRequest) {
    try {
        console.log('\n🧪 Testing nacl-based Seal session creation...\n');

        const suiClient = getSuiClient();
        const signer = getSigner();
        
        // Get the backend's address and keypair
        const address = signer.getPublicKey().toSuiAddress();
        
        // Get the raw secret key bytes (not the Bech32 string)
        // Ed25519 secret keys are 32 bytes, but nacl expects 64 bytes (seed + pubkey)
        const secretKeyBech32 = signer.getSecretKey();
        const { secretKey } = decodeSuiPrivateKey(secretKeyBech32);
        const publicKeyBytes = signer.getPublicKey().toRawBytes();
        
        console.log('📍 Backend address:', address);
        console.log('🔑 Secret key bytes length:', secretKey.length);
        console.log('🔑 Public key bytes length:', publicKeyBytes.length);

        // 1. Create a SessionKey
        console.log('\n1️⃣ Creating SessionKey...');
        const sessionKey = await SessionKey.create({
            address,
            packageId: SEAL_CONFIG.packageId,
            ttlMin: 30,
            suiClient,
        });
        console.log('✅ SessionKey created');

        // 2. Get the personal message to sign
        const personalMessage = sessionKey.getPersonalMessage();
        console.log('\n2️⃣ Personal message to sign:');
        console.log('   Length:', personalMessage.length);
        console.log('   Preview:', new TextDecoder().decode(personalMessage.slice(0, 50)) + '...');

        // 3. Implement Sui's personal message signing format using nacl
        console.log('\n3️⃣ Signing with nacl (following Sui format)...');
        
        // Step 3a: BCS encode the message
        const bcsEncoded = bcs.vector(bcs.u8()).serialize(personalMessage).toBytes();
        console.log('   📦 BCS encoded length:', bcsEncoded.length);
        
        // Step 3b: Prepend intent scope for PersonalMessage
        const intentBytes = new Uint8Array([0x03, 0x00, 0x00]);
        const messageToSign = new Uint8Array([...intentBytes, ...bcsEncoded]);
        console.log('   🎯 Message with intent length:', messageToSign.length);
        
        // Step 3c: Hash with Blake2b
        const digest = blake2b(messageToSign, { dkLen: 32 });
        console.log('   🔐 Blake2b digest length:', digest.length);
        console.log('   🔐 Digest (hex):', Buffer.from(digest).toString('hex').slice(0, 32) + '...');
        
        // Step 3d: Sign with nacl
        // nacl expects 64-byte secret key (32-byte seed + 32-byte pubkey)
        // We have the 32-byte seed from decodeSuiPrivateKey, so generate the full keypair
        const naclKeypair = nacl.sign.keyPair.fromSeed(secretKey);
        console.log('   🔑 nacl keypair generated');
        console.log('   🔑 nacl secret key length:', naclKeypair.secretKey.length);
        console.log('   🔑 nacl public key matches Sui:', 
            Buffer.from(naclKeypair.publicKey).equals(Buffer.from(publicKeyBytes)));
        
        const signature = nacl.sign.detached(digest, naclKeypair.secretKey);
        console.log('   ✍️  nacl signature length:', signature.length);
        
        // Step 3e: Format as Sui signature: [scheme][signature][pubkey]
        const suiSignature = new Uint8Array([
            0x00, // Ed25519 scheme
            ...signature, // 64 bytes
            ...publicKeyBytes // 32 bytes
        ]);
        console.log('   📝 Sui signature total length:', suiSignature.length);
        console.log('   📝 Format: [scheme(1)][sig(64)][pubkey(32)] = 97 bytes');
        
        const signatureBase64 = Buffer.from(suiSignature).toString('base64');
        console.log('   📝 Base64 signature:', signatureBase64.slice(0, 40) + '...');

        // 4. Set the signature on the SessionKey
        console.log('\n4️⃣ Setting signature on SessionKey...');
        await sessionKey.setPersonalMessageSignature(signatureBase64);
        console.log('✅ Signature set successfully!');

        console.log('\n🎉 nacl-based session creation SUCCESSFUL!\n');

        return NextResponse.json({
            ok: true,
            message: "nacl-based session creation successful",
            address,
            personalMessage: Buffer.from(personalMessage).toString('base64'),
            signature: signatureBase64,
            details: {
                messageLength: personalMessage.length,
                bcsEncodedLength: bcsEncoded.length,
                digestLength: digest.length,
                signatureLength: signature.length,
                suiSignatureLength: suiSignature.length,
            }
        });

    } catch (err: any) {
        console.error('\n❌ nacl session test FAILED:', err?.message || err);
        console.error('Stack:', err?.stack);
        return NextResponse.json(
            { 
                ok: false, 
                error: err?.message || "Unknown error",
                stack: err?.stack 
            },
            { status: 500 }
        );
    }
}

