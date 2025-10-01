import "dotenv/config"
import fetch from "node-fetch";

async function read(blobId: string) {
    const url = `${process.env.AGGREGATOR}/v1/blobs/${blobId}`
    const response = await fetch(url)
    return await response.text()
}

const args = process.argv.slice(2)
read(args[0]).then(console.log).catch(console.error)