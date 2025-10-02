"use client";

import { useMemo } from "react";
import { toHex, fromHex } from "@mysten/sui/utils";
import { blake2b } from "@noble/hashes/blake2.js";
import { 
    SEAL_CONFIG,
    createSuiClient,
    createSealClient,
} from "@/utils/sealUtils";

export function useSealEncrypt() {
    const suiClient = useMemo(() => createSuiClient(), []);
    const sealClient = useMemo(() => createSealClient(suiClient), [suiClient]);

    async function encryptUtf8(message: string, suiAddress: string) {
        const data = new TextEncoder().encode(message);
        
        // Generate random 16-byte nonce
        const nonce = crypto.getRandomValues(new Uint8Array(16));
        
        // Convert Sui address to bytes for key ID computation
        const suiAddressBytes = fromHex(suiAddress.replace(/^0x/, ''));
        
        // Compute key ID: [suiAddressBytes][nonceBytes]
        const keyIdBytes = new Uint8Array([
            ...suiAddressBytes,
            ...nonce
        ]);
        const sealId = Buffer.from(keyIdBytes).toString('hex');
        
        const { encryptedObject } = await sealClient.encrypt({
            data,
            packageId: SEAL_CONFIG.packageId,
            id: sealId,
            threshold: SEAL_CONFIG.threshold,
        });

        // return base64 so you can POST JSON easily
        const b64 = Buffer.from(encryptedObject as unknown as Uint8Array).toString("base64");
        return { 
            encryptedObjectBase64: b64,
            keyId: sealId,
            suiAddress,
            nonce: toHex(nonce)
        };
    }

    return { encryptUtf8 };
}
