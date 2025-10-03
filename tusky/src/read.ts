import {getFileId, getTusky} from "./utils/tuskyClient"

async function download(vaultName: string, id: string) {
    const tusky = await getTusky()
    const fileId = await getFileId(`${id}.txt`, vaultName)

    if (!fileId) {
        throw new Error(`Unable to find content with id: ${id} in vault: ${vaultName}`)
    }

    const arrayBuffer = await tusky.file.arrayBuffer(fileId);
    return new TextDecoder("utf-8").decode(arrayBuffer)
}

const args = process.argv.slice(2)
download(args[0], args[1]).then(console.log).catch(console.error)