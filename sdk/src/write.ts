import {getFundedKeypair} from './utils/funded-keypair';
import {getClient} from "./utils/client";

async function write(text: string) {
    const signer = await getFundedKeypair()
    const blob = new TextEncoder().encode(text)

    const {blobId} = await getClient().walrus.writeBlob({
        blob,
        deletable: true,
        epochs: 3,
        signer,
    });

    return `
    Your content has been uploaded on Walrus!
    The blob id is: ${blobId}
    You can view it here: ${process.env.AGGREGATOR}/v1/blobs/${blobId}
    `
}

const args = process.argv.slice(2)
write(args[0]).then(console.log).catch(console.error)