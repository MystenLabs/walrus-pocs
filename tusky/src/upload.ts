import {getTusky, getVaultId} from "./utils/tuskyClient";

async function upload(vaultName: string, filePath: string) {
    const vaultId = await getVaultId(vaultName)

    if (!vaultId) {
        throw new Error(`Unable to find vault: ${vaultName}`)
    }

    const tusky = await getTusky()
    const uploadId = await tusky.file.upload(vaultId, filePath)

    return `
    Your file has been uploaded to Tusky!
    You can view it here: https://app.tusky.io/vaults/${vaultId}/assets/gallery#${uploadId}
    `
}

const args = process.argv.slice(2)
upload(args[0], args[1]).then(console.log).catch(console.error)