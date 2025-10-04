# Seal + Walrus: Decentralized Encrypted Storage

A Next.js application demonstrating end-to-end encryption using **Mysten's Seal** (decentralized secrets management) and **Walrus** (decentralized blob storage).

## 🔒 What This Does

- **Encrypt** text messages using Seal's threshold encryption
- **Store** encrypted data on Walrus decentralized storage
- **Manage** access control via Sui blockchain smart contracts
- **Decrypt** data with owner permissions (transferable via NFT-like objects)

## 🏗️ Architecture

1. **Frontend**: User encrypts & decrypts data with Seal client-side
2. **Backend API**: Uploads encrypted blob to Walrus, creates `PrivateData` object on Sui
3. **Walrus**: Stores encrypted blobs with high availability
4. **Seal Key Servers**: Provide threshold decryption keys after verifying on-chain ownership

### Key Components

- **Seal SDK** (`@mysten/seal`): Client-side encryption/decryption
- **Sui dApp Kit** (`@mysten/dapp-kit`): Wallet integration
- **Move Contract** (`seal_data`): On-chain access control policy
- **Walrus HTTP API**: Blob storage operations

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A Sui wallet (e.g., Sui Wallet, Suiet, Ethos)
- SUI tokens on testnet (for the backend wallet)

### Installation

```bash
pnpm install
```

### Environment Setup

Create a `.env.local` file based on `example.env`:

```bash
# Backend wallet (needs SUI for gas)
BACKEND_SUI_KEY=suiprivkey1...

# Seal configuration
NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID=0x...
NEXT_PUBLIC_SEAL_THRESHOLD=1
NEXT_PUBLIC_SUI_NETWORK=testnet

# Walrus configuration
WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
```

### Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 📖 How It Works

### Encryption Flow

1. **Connect Wallet**: User connects their Sui wallet (frontend)
2. **Initialize Session**: Create a Seal SessionKey and sign with wallet (frontend)
3. **Encrypt Message** (frontend):
   - Generate random nonce
   - Compute key ID from `creator_address + nonce`
   - Seal encrypts data with threshold encryption
4. **Send to Backend**: POST encrypted blob + metadata to `/api/store-encrypted-blob`
5. **Backend Operations**:
   - Upload encrypted blob to Walrus via HTTP API
   - Create and transfer `PrivateData` object on-chain with metadata (creator, nonce, blob_id)

**Note**: Encryption is fully client-side - the plaintext never leaves the user's browser.

### Decryption Flow

1. **Fetch from Walrus**: Download encrypted blob using blob ID (frontend → Walrus aggregator)
2. **Find On-Chain Object**: Query owned `PrivateData` objects (frontend → Sui RPC)
3. **Build Approval Transaction**: Create PTB calling `seal_approve()` (frontend)
4. **Request Decryption Keys**: Seal key servers verify ownership and provide threshold shares (frontend → Seal)
5. **Client-Side Decryption**: Seal client combines threshold shares and decrypts blob (frontend)

**Note**: Decryption is fully client-side - the plaintext never leaves the user's browser.

### Access Control

The Move contract enforces that:
- Only the **current owner** of the `PrivateData` object can decrypt
- Access is transferable by transferring the object
- Object is created and transferred directly under creator
- Key ID is computed from **original creator** + nonce (not current owner)

## 🛠️ Project Structure

```
app/
└── src/
    ├── app/
    │   ├── api/              # Backend API routes
    │   │   ├── store-encrypted-blob/  # Stores blob & creates on-chain object
    │   │   └── test-nacl-session/     # Test nacl-based signing (non-Sui wallets)
    │   ├── page.tsx          # Main UI
    │   ├── test-nacl-seal-session/    # Test page for nacl signing demo
    │   └── providers.tsx     # Sui wallet providers
    ├── hooks/
    │   ├── useSealSession.ts # Session key management
    │   ├── useSealEncrypt.ts # Encryption logic
    │   └── useSealDecrypt.ts # Decryption logic
    └── utils/
        └── sealUtils.ts      # Reusable Seal utilities & documentation
move/
└── seal_data/
    └── sources/
        └── seal_data.move # Access control contract
```

## 🔐 Security Notes

- **Threshold Encryption**: Data encrypted with t-of-n threshold scheme (default: 1 of 2 key servers)
- **No Single Point of Failure**: Decryption requires multiple key servers
- **On-Chain Verification**: Key servers verify ownership via Sui blockchain
- **Client-Side Encryption**: Data encrypted before leaving the browser

## 🔌 Non-Sui Wallet Integration

This project includes a working example of integrating Seal with **non-Sui wallets** (e.g., Phantom, MetaMask):

- **Reference Implementation**: See `app/src/app/api/test-nacl-session/route.ts`
- **Test Page**: Visit `/test-nacl-seal-session` to run the demo
- **Documentation**: Check `app/src/utils/sealUtils.ts` for signature format requirements

The test demonstrates how to manually construct Sui-compatible signatures using nacl when integrating wallets that don't natively support Sui's signing format.

## 🧪 Testing

1. Connect your Sui wallet
2. Initialize a Seal session (sign the personal message)
3. Enter a message and click "Encrypt & Store"
4. Copy the blob ID from the response
5. Paste the blob ID and click "Decrypt from Walrus"

## 📚 Resources

- [Seal Documentation](https://seal-docs.wal.app)
- [Walrus Documentation](https://docs.walrus.site)
- [Sui Documentation](https://docs.sui.io)

## 📝 License

Apache-2.0
