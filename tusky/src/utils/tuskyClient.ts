import "dotenv/config"
import { Tusky } from "@tusky-io/ts-sdk"

export async function getTusky() {

    if (!process.env.TUSKY_API) {
        throw new Error(`
            Get your tusky APi ky here: https://app.tusky.io/account/api-keys
            And set the environment variable TUSKY_API or in .env
        `)
    }

    const tusky = new Tusky({ apiKey: process.env.TUSKY_API })
    await tusky.addEncrypter({ password: process.env.ENCRYPTION_KEY })
    return tusky
}

export async function getVaultId(name: string) {
    const tusky = await getTusky()
    const vaults = await tusky.vault.listAll()
    return vaults.find((v) => v.name === name)?.id
}

export async function getFileId(name: string, vault: string) {
    const tusky = await getTusky()
    const vaultId = await getVaultId(vault)
    const files = await tusky.file.listAll({ vaultId })
    return files.find((f) => f.name === name)?.id
}