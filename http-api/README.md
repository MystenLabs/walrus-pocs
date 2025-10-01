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

1. Upload a file

```bash
pnpm upload ../data/walrus.jpeg
```

2. View a Walrus file

Visit: https://aggregator.walrus-testnet.walrus.space/v1/blobs/<BLOB_ID>

OR

```bash
pnpm read <BLOB_ID>
```