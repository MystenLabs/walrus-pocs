import {getFileId, getTusky} from "./utils/tuskyClient"

async function download(vaultName: string, fileName: string, outputPath: string) {
    const tusky = await getTusky()
    const fileId = await getFileId(fileName, vaultName)

    if (!fileId) {
        throw new Error(`Unable to find file: ${fileName} in vault: ${vaultName}`)
    }

    await tusky.file.download(fileId, { path: outputPath });
    console.log(`File "${fileName}" from vault "${vaultName}" was downloaded at ${outputPath}`);
}

const args = process.argv.slice(2)
download(args[0], args[1], args[2]).then(console.log).catch(console.error)