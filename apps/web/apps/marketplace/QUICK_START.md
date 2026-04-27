# 🚀 Quick Start Guide - axionax-marketplace

## Overview

**axionax-marketplace** เป็น decentralized marketplace dApp สำหรับการซื้อขายและเช่า compute resources บน axionax protocol

**Repository:** https://github.com/axionaxprotocol/axionax-marketplace

---

## 📋 Prerequisites

```bash
# Required
- Node.js 18+
- npm/yarn/pnpm
- MetaMask or Web3 wallet
- Git

# Recommended
- VS Code with React/Next.js extensions
- Chrome/Firefox with Web3 wallet extension
```

---

## 🔧 Installation

### 1. Clone Repository

```bash
git clone https://github.com/axionaxprotocol/axionax-marketplace.git
cd axionax-marketplace
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install

# Or using pnpm
pnpm install
```

### 3. Setup Environment Variables

```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local with your values
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CHAIN_ID=1337
NEXT_PUBLIC_MARKETPLACE_CONTRACT=0x...
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/
```

---

## 🏃 Running Development Server

```bash
# Start development server
npm run dev

# Server will start at http://localhost:3001

# Open in browser
# - Marketplace: http://localhost:3001
# - My Listings: http://localhost:3001/my-listings
# - Create Listing: http://localhost:3001/create
# - Profile: http://localhost:3001/profile
```

### Other Run Modes

```bash
# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Format code
npm run format
```

---

## ✅ Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Test smart contract interactions
npm run test:contracts
```

---

## 🏗️ Project Structure

```
axionax-marketplace/
├── app/                        # Next.js app directory
│   ├── page.tsx                # Marketplace home
│   ├── layout.tsx              # Root layout
│   ├── create/                 # Create listing page
│   ├── listing/[id]/           # Listing detail page
│   ├── my-listings/            # User's listings
│   ├── profile/                # User profile
│   └── api/                    # API routes
│
├── components/                 # React components
│   ├── marketplace/            # Marketplace components
│   │   ├── ListingCard.tsx     # Listing card
│   │   ├── ListingGrid.tsx     # Listings grid
│   │   ├── CreateForm.tsx      # Create listing form
│   │   └── PurchaseModal.tsx   # Purchase modal
│   ├── ui/                     # UI components
│   └── wallet/                 # Wallet components
│       ├── ConnectButton.tsx   # Connect wallet button
│       └── WalletInfo.tsx      # Wallet info display
│
├── contracts/                  # Smart contract ABIs
│   ├── Marketplace.json        # Marketplace contract ABI
│   └── ComputeToken.json       # Token contract ABI
│
├── lib/                        # Utilities
│   ├── hooks/                  # Custom hooks
│   │   ├── useWallet.ts        # Wallet connection hook
│   │   ├── useMarketplace.ts   # Marketplace hook
│   │   └── useIPFS.ts          # IPFS upload hook
│   ├── utils/                  # Helper functions
│   └── api/                    # API clients
│
├── types/                      # TypeScript types
│   ├── listing.ts              # Listing types
│   ├── user.ts                 # User types
│   └── contract.ts             # Contract types
│
├── public/                     # Static files
├── styles/                     # Styles
└── tests/                      # Tests
```

---

## 🎨 Key Features

### 1. Marketplace Home

- Browse compute resource listings
- Filter by GPU type, price, location
- Search functionality
- Featured listings

### 2. Create Listing

- List compute resources
- Set pricing (hourly/daily/monthly)
- Upload resource specifications
- IPFS metadata storage

### 3. Purchase/Rent

- Connect wallet
- Purchase or rent compute time
- Smart contract escrow
- Automatic resource allocation

### 4. My Listings

- Manage your listings
- View earnings
- Update availability
- Analytics dashboard

---

## 🔨 Common Development Tasks

### Connect Wallet

```typescript
// lib/hooks/useWallet.ts
import { useState, useEffect } from 'react';
import { AxionaxClient, Wallet } from '@axionax/sdk';

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState('0');

  const connect = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      setAddress(accounts[0]);
    }
  };

  const disconnect = () => {
    setAddress(null);
  };

  return { address, balance, connect, disconnect };
}
```

### Interact with Marketplace Contract

```typescript
// lib/hooks/useMarketplace.ts
import { Contract } from '@axionax/sdk';
import MarketplaceABI from '@/contracts/Marketplace.json';

export function useMarketplace() {
  const contract = new Contract(
    process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT!,
    MarketplaceABI,
    client
  );

  const createListing = async (listing: Listing) => {
    const tx = await contract.createListing(
      listing.title,
      listing.price,
      listing.duration,
      listing.metadataURI
    );
    await tx.wait();
    return tx.hash;
  };

  const purchaseListing = async (listingId: number) => {
    const listing = await contract.getListing(listingId);
    const tx = await contract.purchaseListing(listingId, {
      value: listing.price,
    });
    await tx.wait();
    return tx.hash;
  };

  return { createListing, purchaseListing };
}
```

### Upload to IPFS

```typescript
// lib/hooks/useIPFS.ts
export function useIPFS() {
  const uploadJSON = async (data: any) => {
    const response = await fetch('/api/ipfs/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const { cid } = await response.json();
    return `ipfs://${cid}`;
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/ipfs/upload', {
      method: 'POST',
      body: formData,
    });
    const { cid } = await response.json();
    return `ipfs://${cid}`;
  };

  return { uploadJSON, uploadFile };
}
```

---

## 🔌 Integration with Other Repos

### With axionax-sdk-ts

```typescript
// Use SDK for blockchain interactions
import { AxionaxClient, Contract } from '@axionax/sdk';

const client = new AxionaxClient(process.env.NEXT_PUBLIC_RPC_URL!);

const marketplace = new Contract(
  process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT!,
  MarketplaceABI,
  client
);
```

### With axionax-core

```typescript
// Connect to local axionax-core node
const client = new AxionaxClient('http://localhost:8545');

// Make sure axionax-core is running:
// cd ../axionax-core && cargo run
```

### With axionax-web

```typescript
// Link to main website
import Link from 'next/link'

<Link href="https://axionax.org">
  Back to Main Site
</Link>
```

---

## 💰 Smart Contract Integration

### Deploy Marketplace Contract

```bash
# Navigate to contracts directory
cd contracts

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost

# Deploy to testnet
npx hardhat run scripts/deploy.js --network testnet

# Update .env.local with contract address
NEXT_PUBLIC_MARKETPLACE_CONTRACT=0x...
```

### Contract Functions

```solidity
// Marketplace.sol (reference)
interface IMarketplace {
  function createListing(
    string memory title,
    uint256 price,
    uint256 duration,
    string memory metadataURI
  ) external returns (uint256);

  function purchaseListing(uint256 listingId) external payable;

  function getListing(uint256 listingId) external view returns (Listing);

  function getMyListings() external view returns (uint256[]);
}
```

---

## 🎨 UI Components

### Listing Card

```typescript
// components/marketplace/ListingCard.tsx
export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <div className="card">
      <img src={listing.image} alt={listing.title} />
      <h3>{listing.title}</h3>
      <p>{listing.description}</p>
      <div className="specs">
        <span>GPU: {listing.gpu}</span>
        <span>RAM: {listing.ram}</span>
        <span>Storage: {listing.storage}</span>
      </div>
      <div className="price">
        <span>{listing.price} AXX/hour</span>
        <button>Rent Now</button>
      </div>
    </div>
  )
}
```

### Create Listing Form

```typescript
// components/marketplace/CreateForm.tsx
export function CreateForm() {
  const { createListing } = useMarketplace()
  const { uploadJSON } = useIPFS()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Upload metadata to IPFS
    const metadataURI = await uploadJSON({
      title,
      description,
      specs: { gpu, ram, storage }
    })

    // Create listing on-chain
    const txHash = await createListing({
      title,
      price,
      duration,
      metadataURI
    })

    console.log('Listing created:', txHash)
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

---

## 🚀 Deployment

### Build for Production

```bash
# Build optimized bundle
npm run build

# Test production build
npm run start
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Environment Variables (Production)

```bash
# Set in Vercel dashboard or .env.production
NEXT_PUBLIC_RPC_URL=https://rpc.axionax.org
NEXT_PUBLIC_CHAIN_ID=1337
NEXT_PUBLIC_MARKETPLACE_CONTRACT=0x...
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

---

## 🐛 Debugging

### Web3 Debugging

```typescript
// Enable detailed logs
const contract = new Contract(address, abi, client);
contract.on('error', (error) => {
  console.error('Contract error:', error);
});

// Log all transactions
client.on('transaction', (tx) => {
  console.log('Transaction sent:', tx.hash);
});
```

### Wallet Connection Issues

```typescript
// Check if wallet is installed
if (!window.ethereum) {
  alert('Please install MetaMask');
  return;
}

// Check network
const chainId = await window.ethereum.request({
  method: 'eth_chainId',
});
if (chainId !== process.env.NEXT_PUBLIC_CHAIN_ID) {
  alert('Please switch to axionax network');
}
```

---

## 🚨 Troubleshooting

### Contract Interaction Errors

```bash
# Check contract address
echo $NEXT_PUBLIC_MARKETPLACE_CONTRACT

# Verify ABI is up to date
# Download latest from axionax-core/contracts/

# Check wallet connection
# Make sure MetaMask is connected to correct network
```

### IPFS Upload Failures

```bash
# Check IPFS gateway
curl https://ipfs.io/ipfs/QmTest

# Use alternative gateway
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Check API route
curl -X POST http://localhost:3001/api/ipfs/upload
```

---

## 📝 Configuration

### Next.js Config

```javascript
// next.config.js
module.exports = {
  reactStrictMode: true,
  images: {
    domains: ['ipfs.io', 'gateway.pinata.cloud'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};
```

---

## 📚 Additional Resources

- **Smart Contracts:** [contracts/](contracts/)
- **API Documentation:** https://docs.axionax.org/marketplace
- **axionax SDK:** [axionax-sdk-ts](https://github.com/axionaxprotocol/axionax-sdk-ts)
- **IPFS Docs:** https://docs.ipfs.tech

---

## 🤝 Getting Help

- **Issues:** Report bugs on [GitHub Issues](https://github.com/axionaxprotocol/axionax-marketplace/issues)
- **Documentation:** Check [axionax-docs](https://github.com/axionaxprotocol/axionax-docs)
- **Core Node:** See [axionax-core](https://github.com/axionaxprotocol/axionax-core)

---

## 📄 License

MIT - See [LICENSE](LICENSE) file for details

---

<p align="center">
  <sub>Built with ❤️ by the axionax protocol Team</sub>
</p>
