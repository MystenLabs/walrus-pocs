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
        // 1. Convert Sui address to bytes
        const suiAddressBytes = fromHex(suiAddress.replace(/^0x/, ''));

        // 2. Parse the encrypted object
        const encryptedBytes = Buffer.from(encryptedObjectBase64, "base64");
        const encryptedObject = EncryptedObject.parse(new Uint8Array(encryptedBytes));

        // 3. Fetch the PrivateData object on-chain by blobId
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

        // Extract nonce from the object
        const fields = (privateDataObject.data.content as any).fields;
        const nonceBytes = new Uint8Array(fields.nonce);

        // 4. Compute the key ID (same logic as encryption)
        const keyIdBytes = new Uint8Array([
            ...suiAddressBytes,
            ...nonceBytes
        ]);
        const sealId = Buffer.from(keyIdBytes).toString('hex');

        // 5. Build PTB that calls seal_approve
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

        // 6. Decrypt using Seal
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
