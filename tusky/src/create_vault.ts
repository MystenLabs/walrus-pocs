import {getTusky} from "./utils/tuskyClient";

async function create_vault(name: string, encrypted: boolean = false) {
    const tusky = await getTusky()
    const vault = await tusky.vault.create(name, { encrypted })
    return `
    Your new vault ${vault.name} has been created.
    View your vault here: https://app.tusky.io/vaults/${vault.id}/assets
    `
}

const args = process.argv.slice(2)
create_vault(args[0], args[1] === "true").then(console.log).catch(console.error)