// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {getClient} from "./utils/client";
import {getFundedKeypair} from "./utils/funded-keypair";
import {blobIdFromInt} from "@mysten/walrus";

async function getBlobObjectId(blobId: string, owner: string) {
    const objects = await getClient().getOwnedObjects({
        owner,
        filter: { StructType: "0xd84704c17fc870b8764832c535aa6b11f21a95cd6f5bb38a9b07d2cf42220c66::blob::Blob" },
    });

    for (const o of objects.data) {
        const blob = await getClient().getObject({
            id: o.data?.objectId!,
            options: { showContent: true },
        });

        const d = blob.data?.content as any
        if (blobIdFromInt(d.fields.blob_id) === blobId) {
            return blob.data?.objectId
        }
    }
    return null
}

async function del(blobId: string) {
    const keypair = await getFundedKeypair()
    const blobObjectId = await getBlobObjectId(blobId, keypair.toSuiAddress())

    if (!blobObjectId) {
        throw new Error(`Unable to find blob object id for blob id: ${blobId}`)
    }

    await getClient().walrus.executeDeleteBlobTransaction({
        signer: keypair,
        blobObjectId
    })

    return `Deleted blob: ${blobId}`
}

const args = process.argv.slice(2)
del(args[0]).then(console.log).catch(console.error)