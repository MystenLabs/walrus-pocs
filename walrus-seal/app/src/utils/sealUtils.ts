import { SessionKey } from "@mysten/seal";

/**
 * Configuration constants for Seal
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
 * Get personal message from SessionKey as a string
 * Handles both string and Uint8Array return types
 * @param sessionKey - SessionKey instance
 * @returns Personal message as string
 */
export function getPersonalMessageAsString(sessionKey: SessionKey): string {
    const personalMessage = sessionKey.getPersonalMessage();
    return typeof personalMessage === 'string' 
        ? personalMessage 
        : new TextDecoder().decode(personalMessage as Uint8Array);
}
