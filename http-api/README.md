# Walrus HTTP API Example

This codebase showcases how you can utilize the [Walrus HTTP API](https://docs.wal.app/usage/web-api.html).

## Local setup

This example is using TypeScript to test out the Walrus endpoints. Install the node version mentioned in [.nvmrc](../.nvmrc)

Install the dependencies:

```bash
pnpm i
```

## Test the commands

### 1\. Write Content

The `write` command uploads a simple text string as a new blob.

| Parameter               | Description                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **`<content>`**         | The text string to upload.                                                               |
| **`--epochs <number>`** | **Optional**. The number of epochs for the blob. Must be a positive integer, **max 54**. |

**Usage:**

```bash
# Basic usage
pnpm write "This is some text"

# Usage with optional epochs (e.g., 10 epochs)
pnpm write "This is some text for 10 epochs" --epochs 10
```

---

### 2\. Read Content

The `read` command fetches and displays the content of a specified blob.

**Usage:**

```bash
pnpm read <BLOB_ID>
```

**Alternative:** Visit: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/<BLOB_ID>`

---

### 3\. Upload a File

The `upload` command is used to upload the content of a file.

| Parameter               | Description                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **`<FILE_PATH>`**       | The path to the file you want to upload.                                                 |
| **`--epochs <number>`** | **Optional**. The number of epochs for the blob. Must be a positive integer, **max 54**. |

**Usage:**

```bash
# Basic file upload
pnpm upload <FILE_PATH>

# File upload with max epochs
pnpm upload <FILE_PATH> --epochs 54
```

---

### 4\. Download a File

The `download` command fetches a blob and saves its content to a file.

**Usage:**

```bash
pnpm download <BLOB_ID> <OUTPUT_PATH>
```

**Alternative:** Visit: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/<BLOB_ID>`
