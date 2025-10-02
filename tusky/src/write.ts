import {getTusky, getVaultId} from "./utils/tuskyClient"

async function write(vaultName: string, id: string, text: string) {
    const vaultId = await getVaultId(vaultName)

    if (!vaultId) {
        throw new Error(`Unable to find vault: ${vaultName}`)
    }

    const tusky = await getTusky()
    const blob = new Blob([text])
    const uploadId = await tusky.file.upload(vaultId, blob, {
        name: `${id}.txt`,
        mimeType: "text/plain",
    })

    return `
    Your content has been uploaded to Tusky!
    You can view it here: https://app.tusky.io/vaults/${vaultId}/assets/gallery#${uploadId}
    `
}

const args = process.argv.slice(2)
write(args[0], args[1], args[2]).then(console.log).catch(console.error)