# NFT Marketplace dApp

A full-stack decentralized application built using **Solidity**, **Hardhat**, and **Next.js with TypeScript**. This project allows users to mint, list, and trade NFTs on an Ethereum-compatible blockchain.

---

## 🛠️ Tech Stack

- **Smart Contracts:** Solidity, Hardhat
- **Frontend:** Next.js 15 (App Router) + TypeScript + TailwindCSS
- **Blockchain Interaction:** Ethers.js, Wagmi, Viem
- **Wallet Connection:** WalletConnect, MetaMask

---

## 📦 Project Structure

```

nft-marketplace/
├── contracts/           # Solidity smart contracts
├── scripts/             # Deployment and test scripts
├── frontend/            # Next.js frontend (or part of root if monorepo)
├── test/                # Smart contract tests
├── public/              # Static assets
├── styles/              # Global CSS / Tailwind setup
├── hardhat.config.ts    # Hardhat config
└── tailwind.config.js   # Tailwind config

````

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm / yarn / pnpm
- MetaMask browser extension
- Hardhat CLI

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/nft-marketplace.git
cd nft-marketplace
````

### 2. Install Dependencies

```bash
# root
npm install

# if frontend is in a subfolder like /frontend
cd frontend
npm install
```

### 3. Compile Smart Contracts

```bash
npx hardhat compile
```

### 4. Deploy Contracts (Local Network)

```bash
npx hardhat node
# In a separate terminal
npx hardhat run scripts/deploy.ts --network localhost
```

### 5. Start the Frontend

```bash
npm run dev
```

Access the app at: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Running Tests

```bash
npx hardhat test
```

---

## 🔐 Environment Variables

Create a `.env` file in the root and/or frontend:

```env
# Hardhat / Backend
PRIVATE_KEY=your_private_key
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Frontend
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedContract
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
```

---

## 🧠 Features

* Smart contract for minting and listing NFTs
* NFT listing UI with wallet integration
* Responsive UI with TailwindCSS
* Type-safe code with TypeScript
* Wagmi hooks for seamless contract interaction
* Local, testnet, and mainnet support

---

## 🧳 Deployment

To deploy to a testnet like Sepolia:

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Update the deployed contract address in the frontend `.env` file accordingly.

---

## 📝 License

MIT

---

## 🤝 Acknowledgements

* [Hardhat](https://hardhat.org/)
* [Next.js](https://nextjs.org/)
* [Wagmi](https://wagmi.sh/)
* [Ethers.js](https://docs.ethers.org/)
* [TailwindCSS](https://tailwindcss.com/)