# NFT Marketplace dApp

A full-stack decentralized NFT marketplace built using:

- 🧱 **Solidity** and **Hardhat** for backend smart contracts
- 🌐 **Next.js**, **TypeScript**, **TailwindCSS**, and **Thirdweb** for the frontend UI

---

## 📁 Project Structure

```

.
├── backend/            # Hardhat project (Solidity contracts, deployment scripts, etc.)
│   ├── contracts/
│   ├── scripts/
│   ├── test/
│   └── hardhat.config.ts
│
├── frontend/           # Next.js 15 App Router frontend
│   ├── app/
│   ├── components/
│   ├── styles/
│   ├── public/
│   ├── tailwind.config.js
│   └── thirdweb config + hooks
│
├── README.md
└── .gitignore

````

---

## ⚙️ Tech Stack

### Backend (Hardhat)

- Solidity (Smart Contracts)
- Hardhat
- Ethers.js
- Typechain
- Hardhat Deploy (optional)

### Frontend (Next.js)

- Next.js 15 (App Router)
- TypeScript
- TailwindCSS
- Thirdweb SDK (for wallet connection + contract interaction)
- Viem (optional low-level alternative to Ethers.js)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/nft-marketplace.git
cd nft-marketplace
````

---

### 2. Backend Setup (`/backend`)

```bash
cd backend
npm install
```

#### Compile Contracts

```bash
npx hardhat compile
```

#### Run Local Blockchain

```bash
npx hardhat node
```

#### Deploy Contracts (Localhost)

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

---

### 3. Frontend Setup (`/frontend`)

```bash
cd ../frontend
npm install
```

#### Create `.env.local`

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id
```

#### Start Frontend

```bash
npm run dev
```

Go to: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Running Tests (Hardhat)

```bash
cd backend
npx hardhat test
```

---

## 🧳 Deploy to Testnet (Sepolia, etc.)

Make sure `.env` in `backend/` includes:

```env
PRIVATE_KEY=your_wallet_private_key
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
```

Deploy:

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Update frontend `.env.local` with the new contract address.

---

## ✅ Features

* 💡 Smart contracts to mint, list, and buy NFTs
* 🖼️ NFT metadata storage with IPFS (optional)
* 🔐 Wallet connection (MetaMask, WalletConnect) via Thirdweb
* ⚡ Real-time UI with Next.js + Tailwind
* 🌐 Fully decentralized architecture

---

## 📄 License

MIT

---

## 🙌 Acknowledgements

* [Hardhat](https://hardhat.org/)
* [Thirdweb](https://thirdweb.com/)
* [Next.js](https://nextjs.org/)
* [TailwindCSS](https://tailwindcss.com/)