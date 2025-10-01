import "dotenv/config"
import fs from "fs";
import fetch from "node-fetch";

async function download(blobId: string, outputPath: string) {
    const url = `${process.env.AGGREGATOR}/v1/blobs/${blobId}`
    const response = await fetch(url)
    const buf = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(outputPath, buf)
    console.log(`${blobId} was downloaded at ${outputPath}`);
}

const args = process.argv.slice(2)
download(args[0], args[1]).then(console.log).catch(console.error)