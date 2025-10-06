# Walrus Tusky Example

This codebase showcases how you can utilize the [Tusky SDK](https://docs.tusky.io/typescript-sdk/getting-started).

## Local setup

This example is using typescript to test out the Walrus endpoints.
Install the node version mentioned in [.nvmrc](../.nvmrc)

1. Install the dependencies:

```bash
pnpm i
```

2. Get your Tusky API key from [here](https://app.tusky.io/account/api-keys)
3. Set the `TUSKY_API=<TUSKY_API>` in the [.env](.env) file

## Test the commands

1. Create a vault

`encrypted = true | false`

```bash
pnpm create_vault "new_vault" <encrypted>
```

2. Write simple text

```bash
pnpm write <VAULT_NAME> <TEXT_ID> <TEXT>
```

3. Read simple text

```bash
pnpm read <VAULT_NAME> <TEXT_ID>
```

4. Upload a file

```bash
pnpm upload <VAULT_NAME> <FILE_PATH>
```

5. Download a file

```bash
pnpm download <VAULT_NAME> <FILE_NAME> <OUTPUT_PATH>
```

6. Delete a file

```bash
pnpm delete <VAULT_NAME> <FILE_NAME>
```
