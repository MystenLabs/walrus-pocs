"use client";

import { useMemo } from "react";
import { SessionKey } from "@mysten/seal";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import { SuiClient, getFullnodeUrl, SuiObjectResponse } from "@mysten/sui/client";
import { 
    SEAL_CONFIG, 
    createSealClient, 
    decryptData as decryptDataUtil, 
    computeKeyIdFromAddressAndNonce 
} from "@/utils/sealUtils";

interface PrivateDataFields {
    creator: string;
    nonce: number[];
    blob_id: string;
}

/**
 * Find a PrivateData object by blob ID among owned objects
 */
function findPrivateDataObject(
    objects: SuiObjectResponse[],
    targetBlobId: string
): SuiObjectResponse | undefined {
    return objects.find((obj) => {
        const fields = (obj.data?.content as any)?.fields as PrivateDataFields | undefined;
        return fields?.blob_id === targetBlobId;
    });
}

/**
 * Build and serialize a transaction that calls seal_approve for access control
 */
async function buildApprovalTransaction(
    keyId: string,
    privateDataObjectId: string,
    suiClient: SuiClient
): Promise<Uint8Array> {
    const tx = new Transaction();
    tx.moveCall({
        target: `${SEAL_CONFIG.packageId}::seal_data::seal_approve`,
        arguments: [
            tx.pure.vector("u8", fromHex(keyId)),
            tx.object(privateDataObjectId),
        ]
    });
    
    return await tx.build({ 
        client: suiClient, 
        onlyTransactionKind: true 
    });
}

export function useSealDecrypt() {
    const suiClient = useMemo(
        () => new SuiClient({ url: getFullnodeUrl(SEAL_CONFIG.network) }), 
        []
    );
    
    const sealClient = useMemo(
        () => createSealClient(suiClient, SEAL_CONFIG.serverObjectIds),
        [suiClient]
    );

    /**
     * Decrypt data encrypted with Seal
     * 
     * Fetches the PrivateData object from chain, builds an approval transaction,
     * and decrypts the data using the session key.
     * 
     * @param encryptedObjectBase64 - Base64-encoded encrypted object from Walrus
     * @param suiAddress - Current user's Sui address (must own the PrivateData object)
     * @param blobId - Walrus blob ID to identify the PrivateData object
     * @param sessionKey - Active Seal session key
     * @returns Decrypted message as UTF-8 string
     */
    async function decryptData(
        encryptedObjectBase64: string,
        suiAddress: string,
        blobId: string,
        sessionKey: SessionKey
    ): Promise<string> {
        // Parse encrypted bytes from base64
        const encryptedBytes = Buffer.from(encryptedObjectBase64, "base64");

        // Fetch all PrivateData objects owned by this address
        const ownedObjects = await suiClient.getOwnedObjects({
            owner: suiAddress,
            filter: {
                StructType: `${SEAL_CONFIG.packageId}::seal_data::PrivateData`
            },
            options: {
                showContent: true,
            }
        });

        // Find the specific object matching this blob ID
        const privateDataObject = findPrivateDataObject(ownedObjects.data, blobId);

        if (!privateDataObject?.data?.objectId) {
            throw new Error(`No PrivateData object found for blob ID: ${blobId}`);
        }

        // Extract metadata from the on-chain object
        const fields = (privateDataObject.data.content as any).fields as PrivateDataFields;
        const creatorAddress = fields.creator;
        const nonceBytes = new Uint8Array(fields.nonce);

        // Compute the key ID using the CREATOR's address (not the current owner)
        // This is critical: the keyId must match what was used during encryption
        const keyId = computeKeyIdFromAddressAndNonce(creatorAddress, nonceBytes);

        // Build approval transaction to prove ownership
        const txBytes = await buildApprovalTransaction(
            keyId, 
            privateDataObject.data.objectId,
            suiClient
        );

        // Decrypt using reusable utility
        const decryptedBytes = await decryptDataUtil({
            encryptedData: encryptedBytes,
            approvalTxBytes: txBytes,
            sessionKey,
            sealClient,
        });

        // Convert decrypted bytes back to UTF-8 string
        return new TextDecoder().decode(decryptedBytes);
    }

    return { decryptData, suiClient };
}
