"use client";

import { useMemo } from "react";
import { toHex } from "@mysten/sui/utils";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { SealClient } from "@mysten/seal";
import { SEAL_CONFIG, computeSealKeyId } from "@/utils/sealUtils";

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
    
    const sealClient = useMemo(() => new SealClient({
        suiClient,
        serverConfigs: SEAL_CONFIG.serverObjectIds.map((id) => ({ 
            objectId: id, 
            weight: 1 
        })),
        verifyKeyServers: false,
    }), [suiClient]);

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
        const keyId = computeSealKeyId(suiAddress, nonce);
        
        // Encrypt the message using Seal's threshold encryption
        const { encryptedObject } = await sealClient.encrypt({
            data: messageBytes,
            packageId: SEAL_CONFIG.packageId,
            id: keyId,
            threshold: SEAL_CONFIG.threshold,
        });

        // Convert encrypted object to base64 for JSON transport
        const encryptedBase64 = Buffer.from(encryptedObject as unknown as Uint8Array).toString("base64");
        
        return { 
            encryptedObjectBase64: encryptedBase64,
            keyId,
            suiAddress,
            nonce: toHex(nonce),
        };
    }

    return { encryptUtf8 };
}
