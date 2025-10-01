import "dotenv/config"
import fetch from "node-fetch";

async function upload(text: string) {
    const url = `${process.env.PUBLISHER}/v1/blobs`

    const response = await fetch(url, {
        method: "PUT",
        body: text,
    })
    const data: any = await response.json()
    const blobId = data["newlyCreated"]["blobObject"]["blobId"]
    return `
    Your content has been uploaded on Walrus!
    The blob id is: ${blobId}
    You can view it here: ${process.env.AGGREGATOR}/v1/blobs/${blobId}
    `
}

const args = process.argv.slice(2)
upload(args[0]).then(console.log).catch(console.error)