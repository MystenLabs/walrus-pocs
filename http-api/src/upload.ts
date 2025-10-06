import 'dotenv/config'
import fs from 'fs'
import fetch from 'node-fetch'
import { parseArgs } from './helper'

async function upload(filePath: string, epochs?: number) {
	let url = `${process.env.PUBLISHER}/v1/blobs`

	if (epochs !== undefined) {
		url = `${url}?epochs=${epochs}`
	}

	const fileStream = fs.createReadStream(filePath)
	const response = await fetch(url, {
		method: 'PUT',
		body: fileStream as any,
		headers: {
			'Content-Type': 'application/octet-stream',
		},
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Upload failed with status ${response.status}: ${errorText}`)
	}

	const data: any = await response.json()
	const blobId = data['newlyCreated']['blobObject']['blobId']
	return `
    Your file has been uploaded on Walrus!
    The blob id is: ${blobId}
    Walrus Scan: https://walruscan.com/testnet/blob/${blobId}
    You can view it here: ${process.env.AGGREGATOR}/v1/blobs/${blobId}
    `
}

const rawArgs = process.argv.slice(2)
const { content, epochs } = parseArgs(rawArgs)

upload(content, epochs).then(console.log).catch(console.error)
