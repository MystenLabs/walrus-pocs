"use client";

import { useMemo } from "react";
import { EncryptedObject, SessionKey } from "@mysten/seal";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import { 
    SEAL_CONFIG,
    createSuiClient,
    createSealClient,
} from "@/utils/sealUtils";

export function useSealDecrypt() {
    const suiClient = useMemo(() => createSuiClient(), []);
    const sealClient = useMemo(() => createSealClient(suiClient), [suiClient]);

    async function decryptData(
        encryptedObjectBase64: string,
        suiAddress: string,
        blobId: string,
        sessionKey: SessionKey  // Use the SessionKey from session directly!
    ): Promise<string> {
        // 1. Parse the encrypted object
        const encryptedBytes = Buffer.from(encryptedObjectBase64, "base64");

        // 2. Fetch the PrivateData object on-chain by blobId
        const ownedObjects = await suiClient.getOwnedObjects({
            owner: suiAddress,
            filter: {
                StructType: `${SEAL_CONFIG.packageId}::seal_data::PrivateData`
            },
            options: {
                showContent: true,
            }
        });

        // Find the object with matching blob_id (now stored as String)
        const privateDataObject = ownedObjects.data.find((obj: any) => {
            if (obj.data?.content?.fields?.blob_id) {
                const objBlobId = obj.data.content.fields.blob_id;
                return objBlobId === blobId;
            }
            return false;
        });

        if (!privateDataObject?.data?.objectId) {
            throw new Error(`No PrivateData object found for blob ID ${blobId}`);
        }

        // Extract nonce and creator from the object
        const fields = (privateDataObject.data.content as any).fields;
        const creator = fields.creator;
        const nonceBytes = new Uint8Array(fields.nonce);

        // 4. Compute the key ID using the CREATOR's address (not current user)
        // This is critical: the keyId must match what was used during encryption
        const creatorAddressBytes = fromHex(creator.replace(/^0x/, ''));
        const keyIdBytes = new Uint8Array([
            ...creatorAddressBytes,
            ...nonceBytes
        ]);
        const sealId = Buffer.from(keyIdBytes).toString('hex');

        // 5. Build PTB that calls seal_approve
        console.log("privateDataObject.data.objectId: ", privateDataObject.data.objectId);
        const tx = new Transaction();
        tx.moveCall({
            target: `${SEAL_CONFIG.packageId}::seal_data::seal_approve`,
            arguments: [
                tx.pure.vector("u8", fromHex(sealId)),
                tx.object(privateDataObject.data.objectId),
            ]
        });

        const txBytes = await tx.build({ 
            client: suiClient, 
            onlyTransactionKind: true 
        });

        // 6. Explicitly fetch keys first (for better error messages)
        console.log("Fetching decryption keys for keyId:", sealId);
        try {
            await sealClient.fetchKeys({
                ids: [sealId],
                txBytes,
                sessionKey,
                threshold: SEAL_CONFIG.threshold,
            });
            console.log("✓ Keys fetched successfully");
        } catch (fetchError: any) {
            console.error("❌ Failed to fetch keys:", fetchError);
            throw new Error(`Failed to fetch decryption keys: ${fetchError.message}`);
        }

        // 7. Decrypt using Seal
        console.log("Decrypting with fetched keys...");
        const decryptedBytes = await sealClient.decrypt({
            data: encryptedBytes,
            sessionKey,
            txBytes,
        });

        // 7. Convert back to string
        return new TextDecoder().decode(decryptedBytes);
    }

    return { decryptData, suiClient };
}
