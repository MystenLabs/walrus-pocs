import { SessionKey } from "@mysten/seal";
import { fromHex } from "@mysten/sui/utils";

/**
 * Seal configuration - pulled from environment variables
 */
export const SEAL_CONFIG = {
    network: (process.env.NEXT_PUBLIC_SUI_NETWORK as 'mainnet' | 'testnet' | 'devnet' | 'localnet') || "testnet",
    packageId: process.env.NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID!,
    threshold: Number(process.env.NEXT_PUBLIC_SEAL_THRESHOLD || 1),
    serverObjectIds: [
        "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
        "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8",
    ],
};

/**
 * Compute Seal key ID from address and nonce
 * Key ID format: [address bytes][nonce bytes]
 * 
 * @param suiAddress - Sui address (with or without 0x prefix)
 * @param nonce - Random nonce bytes
 * @returns Key ID as hex string
 */
export function computeSealKeyId(suiAddress: string, nonce: Uint8Array): string {
    const addressBytes = fromHex(suiAddress.replace(/^0x/, ''));
    const keyIdBytes = new Uint8Array([...addressBytes, ...nonce]);
    return Buffer.from(keyIdBytes).toString('hex');
}

/**
 * Extract personal message from SessionKey as a string
 * Handles both string and Uint8Array return types from getPersonalMessage()
 * 
 * @param sessionKey - SessionKey instance
 * @returns Personal message as string
 */
export function getPersonalMessageAsString(sessionKey: SessionKey): string {
    const personalMessage = sessionKey.getPersonalMessage();
    return typeof personalMessage === 'string' 
        ? personalMessage 
        : new TextDecoder().decode(personalMessage as Uint8Array);
}
