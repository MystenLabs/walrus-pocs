"use client";

import { useMemo } from "react";
import { toHex } from "@mysten/sui/utils";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { 
    SEAL_CONFIG, 
    createSealClient, 
    encryptData, 
    computeKeyIdFromAddressAndNonce 
} from "@/utils/sealUtils";

const NONCE_SIZE_BYTES = 16;

export interface EncryptionResult {
    encryptedObjectBase64: string;
    keyId: string;
    suiAddress: string;
    nonce: string;
}

export function useSealEncrypt() {
    const suiClient = useMemo(
        () => new SuiClient({ url: getFullnodeUrl(SEAL_CONFIG.network) }), 
        []
    );
    
    const sealClient = useMemo(
        () => createSealClient(suiClient, SEAL_CONFIG.serverObjectIds),
        [suiClient]
    );

    /**
     * Encrypt a UTF-8 string message using Seal
     * 
     * @param message - Plain text message to encrypt
     * @param suiAddress - Sui address of the creator (used for key ID)
     * @returns Encryption result with base64 encrypted data, key ID, and nonce
     */
    async function encryptUtf8(message: string, suiAddress: string): Promise<EncryptionResult> {
        const messageBytes = new TextEncoder().encode(message);
        
        // Generate a random nonce for this encryption
        const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE_BYTES));
        
        // Compute the Seal key ID (address + nonce)
        const keyId = computeKeyIdFromAddressAndNonce(suiAddress, nonce);
        
        // Encrypt using reusable utility
        const result = await encryptData({
            data: messageBytes,
            keyId,
            packageId: SEAL_CONFIG.packageId,
            threshold: SEAL_CONFIG.threshold,
            sealClient,
        });

        // Convert encrypted object to base64 for JSON transport
        // Buffer.from() accepts ArrayBuffer, TypedArray, and other array-like objects
        const encryptedBase64 = Buffer.from(result.encryptedObject as any).toString("base64");
        
        return { 
            encryptedObjectBase64: encryptedBase64,
            keyId,
            suiAddress,
            nonce: toHex(nonce),
        };
    }

    return { encryptUtf8 };
}
