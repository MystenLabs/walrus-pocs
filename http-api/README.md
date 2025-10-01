# Walrus HTTP API Example

This codebase showcases how you can utilize the [Walrus HTTP API](https://docs.wal.app/usage/web-api.html).

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

```bash
pnpm download <BLOB_ID> <OUTPUT_PATH>
```
