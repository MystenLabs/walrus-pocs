"use client";

import { useMemo } from "react";
import { SessionKey, SealClient } from "@mysten/seal";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import { SuiClient, getFullnodeUrl, SuiObjectResponse } from "@mysten/sui/client";
import { SEAL_CONFIG, computeSealKeyId } from "@/utils/sealUtils";

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
 * Build a transaction that calls seal_approve for access control
 */
function buildApprovalTransaction(
    keyId: string,
    privateDataObjectId: string
): Transaction {
    const tx = new Transaction();
    tx.moveCall({
        target: `${SEAL_CONFIG.packageId}::seal_data::seal_approve`,
        arguments: [
            tx.pure.vector("u8", fromHex(keyId)),
            tx.object(privateDataObjectId),
        ]
    });
    return tx;
}

export function useSealDecrypt() {
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
        const keyId = computeSealKeyId(creatorAddress, nonceBytes);

        // Build approval transaction to prove ownership
        const approvalTx = buildApprovalTransaction(keyId, privateDataObject.data.objectId);
        const txBytes = await approvalTx.build({ 
            client: suiClient, 
            onlyTransactionKind: true 
        });

        // Decrypt using Seal with approval proof
        const decryptedBytes = await sealClient.decrypt({
            data: encryptedBytes,
            sessionKey,
            txBytes,
        });

        // Convert decrypted bytes back to UTF-8 string
        return new TextDecoder().decode(decryptedBytes);
    }

    return { decryptData, suiClient };
}
