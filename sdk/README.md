# Walrus SDK Example

This codebase showcases how you can utilize the [Walrus SDK](https://docs.wal.app/usage/sdks.html).
More examples here: https://github.com/MystenLabs/ts-sdks/tree/main/packages/walrus/examples

## Local setup

This example is using typescript to test out the Walrus endpoints.
Install the node version mentioned in [.nvmrc](../.nvmrc)

Install the dependencies:

```bash
pnpm i
```

## Test the commands

1. Write simple text

```bash
pnpm write "This is some text"
```

2. Read simple text

Visit: https://aggregator.walrus-testnet.walrus.space/v1/blobs/<BLOB_ID>

OR

```bash
pnpm read <BLOB_ID>
```

3. Upload a file

```bash
pnpm upload <FILE_PATH>
```

4. Download a file

Visit: https://aggregator.walrus-testnet.walrus.space/v1/blobs/<BLOB_ID>

OR

```bash
pnpm download <BLOB_ID> <OUTPUT_PATH>
```

5. See file details

```bash
pnpm details <BLOB_ID>
```

6. Delete a file

```bash
pnpm delete <BLOB_ID>
```
