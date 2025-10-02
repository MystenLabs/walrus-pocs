import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { SealClient, SessionKey } from "@mysten/seal";

/**
 * Configuration constants
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
 * Create a SuiClient instance
 * @param network - Network to connect to (defaults to SEAL_CONFIG.network)
 * @returns SuiClient instance
 */
export function createSuiClient(network?: 'mainnet' | 'testnet' | 'localnet'): SuiClient {
    return new SuiClient({ 
        url: getFullnodeUrl(network || SEAL_CONFIG.network) 
    });
}

/**
 * Create a SealClient instance with default server configuration
 * @param suiClient - SuiClient instance
 * @param verifyKeyServers - Whether to verify key servers (default: false)
 * @returns SealClient instance
 */
export function createSealClient(
    suiClient: SuiClient,
    verifyKeyServers: boolean = false
): SealClient {
    return new SealClient({
        suiClient,
        serverConfigs: SEAL_CONFIG.serverObjectIds.map((id) => ({ 
            objectId: id, 
            weight: 1 
        })),
        verifyKeyServers,
    });
}

/**
 * Create a SessionKey and prepare it for use
 * @param suiAddress - Sui address
 * @param suiClient - SuiClient instance
 * @param packageId - Package ID (defaults to SEAL_CONFIG.packageId)
 * @param ttlMin - Time to live in minutes (default: 30)
 * @returns SessionKey instance
 */
export async function createSessionKey(
    suiAddress: string,
    suiClient: SuiClient,
    packageId?: string,
    ttlMin: number = 30
): Promise<SessionKey> {
    return await SessionKey.create({
        address: suiAddress,
        packageId: packageId || SEAL_CONFIG.packageId,
        ttlMin,
        suiClient,
    });
}

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
