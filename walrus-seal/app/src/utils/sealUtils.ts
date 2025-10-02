import { SessionKey, SealClient } from "@mysten/seal";
import { SuiClient } from "@mysten/sui/client";
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

// ============================================================================
// Seal Client Creation
// ============================================================================

/**
 * Create a SealClient instance with key server configuration
 * 
 * @param suiClient - Sui client instance
 * @param serverObjectIds - Array of Seal key server object IDs
 * @param verifyKeyServers - Whether to verify key servers (default: false)
 * @returns Configured SealClient instance
 */
export function createSealClient(
    suiClient: SuiClient,
    serverObjectIds: string[],
    verifyKeyServers: boolean = false
): SealClient {
    return new SealClient({
        suiClient,
        serverConfigs: serverObjectIds.map((id) => ({ 
            objectId: id, 
            weight: 1 
        })),
        verifyKeyServers,
    });
}

// ============================================================================
// Session Key Management
// ============================================================================

export interface CreateSessionKeyParams {
    suiAddress: string;
    packageId: string;
    ttlMinutes: number;
    suiClient: SuiClient;
    signMessage: (message: Uint8Array) => Promise<string>;
}

/**
 * Create and initialize a Seal SessionKey with signature
 * 
 * This is a complete flow: create SessionKey → sign personal message → activate session
 * 
 * @param params - Session key creation parameters
 * @param params.suiAddress - User's Sui wallet address
 * @param params.packageId - Package ID of the smart contract with seal_approve function
 * @param params.ttlMinutes - Session time-to-live in minutes
 * @param params.suiClient - Sui client instance
 * @param params.signMessage - Callback to sign the personal message (returns base64 signature)
 * @returns Initialized and signed SessionKey
 */
export async function createAndSignSessionKey(
    params: CreateSessionKeyParams
): Promise<SessionKey> {
    const { suiAddress, packageId, ttlMinutes, suiClient, signMessage } = params;

    // Create SessionKey
    const sessionKey = await SessionKey.create({
        address: suiAddress,
        packageId,
        ttlMin: ttlMinutes,
        suiClient,
    });

    // Get personal message to sign
    const personalMessage = sessionKey.getPersonalMessage();

    // Sign with provided callback
    const signatureBase64 = await signMessage(personalMessage);

    // Activate session with signature
    await sessionKey.setPersonalMessageSignature(signatureBase64);

    return sessionKey;
}

// ============================================================================
// Encryption
// ============================================================================

export interface EncryptDataParams {
    data: Uint8Array;
    keyId: string;
    packageId: string;
    threshold: number;
    sealClient: SealClient;
}

/**
 * Encrypt data using Seal's threshold encryption
 * 
 * @param params - Encryption parameters
 * @param params.data - Raw data bytes to encrypt
 * @param params.keyId - Pre-computed key ID (format depends on your access control policy)
 * @param params.packageId - Package ID of your smart contract
 * @param params.threshold - Minimum number of key servers required for decryption
 * @param params.sealClient - Configured SealClient instance
 * @returns Result from sealClient.encrypt() - contains encryptedObject and key
 */
export async function encryptData(
    params: EncryptDataParams
) {
    const { data, keyId, packageId, threshold, sealClient } = params;

    return await sealClient.encrypt({
        data,
        packageId,
        id: keyId,
        threshold,
    });
}

// ============================================================================
// Decryption
// ============================================================================

export interface DecryptDataParams {
    encryptedData: Uint8Array;
    approvalTxBytes: Uint8Array;
    sessionKey: SessionKey;
    sealClient: SealClient;
}

/**
 * Decrypt data using Seal's threshold decryption
 * 
 * @param params - Decryption parameters
 * @param params.encryptedData - Encrypted data bytes
 * @param params.approvalTxBytes - Serialized transaction bytes that prove ownership (calls seal_approve)
 * @param params.sessionKey - Active SessionKey instance
 * @param params.sealClient - Configured SealClient instance
 * @returns Decrypted plaintext bytes
 */
export async function decryptData(
    params: DecryptDataParams
): Promise<Uint8Array> {
    const { encryptedData, approvalTxBytes, sessionKey, sealClient } = params;

    const decryptedBytes = await sealClient.decrypt({
        data: encryptedData,
        sessionKey,
        txBytes: approvalTxBytes,
    });

    return decryptedBytes;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Compute Seal key ID from address and nonce
 * 
 * Note: This is just ONE example of key ID computation.
 * Your access control policy can use any key ID format.
 * 
 * @param suiAddress - Sui address (with or without 0x prefix)
 * @param nonce - Random nonce bytes
 * @returns Key ID as hex string
 */
export function computeKeyIdFromAddressAndNonce(
    suiAddress: string, 
    nonce: Uint8Array
): string {
    const addressBytes = fromHex(suiAddress.replace(/^0x/, ''));
    const keyIdBytes = new Uint8Array([...addressBytes, ...nonce]);
    return Buffer.from(keyIdBytes).toString('hex');
}
