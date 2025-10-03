import {getFileId, getTusky} from "./utils/tuskyClient"

async function download(vaultName: string, fileName: string) {
    const tusky = await getTusky()
    const fileId = await getFileId(fileName, vaultName)

    if (!fileId) {
        throw new Error(`Unable to find content with id: ${fileName} in vault: ${vaultName}`)
    }

    await tusky.file.delete(fileId);
    return `Deleted file: ${fileName} from ${vaultName}`
}

const args = process.argv.slice(2)
download(args[0], args[1]).then(console.log).catch(console.error)