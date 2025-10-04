import fs from "fs";

import {getFundedKeypair} from './utils/funded-keypair';
import {getClient} from "./utils/client";

const client = getClient()

async function upload(filePath: string) {
    const keypair = await getFundedKeypair();

    const file = new Uint8Array(fs.readFileSync(filePath))

    const {blobId} = await client.walrus.writeBlob({
        blob: file,
        deletable: true,
        epochs: 3,
        signer: keypair,
    });

    return `
    Your file has been uploaded on Walrus!
    The blob id is: ${blobId}
    You can view it here: ${process.env.AGGREGATOR}/v1/blobs/${blobId}
    `
}

const args = process.argv.slice(2)
upload(args[0]).then(console.log).catch(console.error)