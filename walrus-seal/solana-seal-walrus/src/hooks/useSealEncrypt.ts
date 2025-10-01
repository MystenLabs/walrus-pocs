"use client";

import { useMemo } from "react";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import {
    SealClient,
} from "@mysten/seal";
import { toHex, fromHex } from "@mysten/sui/utils";
import bs58 from "bs58";
import { blake2b } from "@noble/hashes/blake2.js";

const NET = process.env.NEXT_PUBLIC_SUI_NETWORK as 'mainnet' | 'testnet' | 'devnet' | 'localnet' || "testnet";
const PACKAGE_ID = process.env.NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID!;
const THRESH = Number(process.env.NEXT_PUBLIC_SEAL_THRESHOLD || 1);

export function useSealEncrypt() {

    const suiClient = new SuiClient({ url: getFullnodeUrl(NET) });

    // Replace this with a list of custom key server object IDs.
    // Replace with the Seal server object ids.
    const serverObjectIds = [
        "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
        "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8",
    ];

    // Seal client using *allowlisted* key servers for the selected network
    const sealClient = useMemo(() => {
        return new SealClient({
            suiClient,
            serverConfigs: serverObjectIds.map((id) => ({ objectId: id, weight: 1 })),
            verifyKeyServers: false,
        });
    }, [suiClient]);

    async function encryptUtf8(message: string, solanaAddress: string) {
        const data = new TextEncoder().encode(message);
        
        // Generate random 16-byte nonce
        const nonce = crypto.getRandomValues(new Uint8Array(16));
        
        // Generate key ID for PrivateData pattern: [suiAddress bytes][nonce bytes]
        // Convert Solana address (Ed25519 public key) to Sui address
        const ed25519PublicKey = bs58.decode(solanaAddress);
        let suiBytes = new Uint8Array(ed25519PublicKey.length + 1);
        suiBytes.set([0x0]);
        suiBytes.set(ed25519PublicKey, 1);
        const suiAddressBytes = blake2b(suiBytes, {dkLen: 32} );
        
        const keyIdBytes = new Uint8Array([
            ...suiAddressBytes,
            ...nonce
        ]);
        const sealId = toHex(keyIdBytes);
        
        const { encryptedObject } = await sealClient.encrypt({
            data,
            packageId: PACKAGE_ID,
            id: sealId,
            threshold: THRESH,
        });

        // return base64 so you can POST JSON easily
        const b64 = Buffer.from(encryptedObject as unknown as Uint8Array).toString("base64");
        return { 
            encryptedObjectBase64: b64,
            keyId: sealId,
            solanaAddress,
            nonce: toHex(nonce)
        };
    }

    return { encryptUtf8 };
}
