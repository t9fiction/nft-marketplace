# 🖼️ NFT Marketplace

This is a full-stack decentralized NFT marketplace built with **Next.js**, **Tailwind CSS**, **TypeScript**, **Thirdweb**, and **Hardhat**. The frontend provides a clean and intuitive interface for creating and trading NFTs, while the backend contains the smart contracts that power the marketplace.

---

## 📁 Project Structure

```bash
.
├── frontend    # Next.js frontend for NFT marketplace
└── backend     # Hardhat-based smart contracts for NFT + marketplace
````

---

## ✨ Features

### ✅ Frontend

* Built with **Next.js** and **TypeScript**
* Styled using **Tailwind CSS**
* NFT interactions handled via **Thirdweb SDK**
* Users can:

  * Mint NFTs
  * List NFTs for sale
  * Browse the marketplace
  * Buy NFTs
  * View owned and listed NFTs

### 🔐 Backend

* Developed with **Hardhat**
* Includes two main contracts:

  * `NFT.sol` – A basic ERC-721 compliant NFT contract
  * `NFTMarketplace.sol` – Custom marketplace smart contract
* Key Functions:

  * `createMarketItem()` – List an NFT on the marketplace
  * `createMarketSale()` – Purchase a listed NFT
  * `fetchMarketItems()` – Retrieve all listed items
  * `fetchMyNFTs()` – Retrieve NFTs owned by the user
  * `fetchItemsListed()` – Retrieve NFTs listed by the user
* Built-in custom error handling and event emissions

---

## 🔧 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/nft-marketplace.git
cd nft-marketplace
```

### 2. Install Dependencies

#### Backend

```bash
cd backend
npm install
```

#### Frontend

```bash
cd ../frontend
npm install
```

---

## 🚀 Usage

### Backend - Compile & Deploy Contracts

```bash
cd backend
npx hardhat compile
npx hardhat run scripts/deploy.js --network your_network
```

> Replace `your_network` with `localhost`, `sepolia`, etc., depending on your config in `hardhat.config.js`.

### Frontend - Start the App

```bash
cd ../frontend
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the frontend.

---

## 📦 Tech Stack

| Layer      | Tech                                        |
| ---------- | ------------------------------------------- |
| Frontend   | Next.js, Tailwind CSS, TypeScript, Thirdweb |
| Backend    | Solidity, Hardhat                           |
| Blockchain | Ethereum / EVM-compatible chain             |

---

## 📄 Smart Contract Overview

### Contract: `NFTMarketplace`

Key functionalities:

* Enforces listing price
* Handles purchase logic securely
* Emits events: `MarketItemCreated`, `MarketItemSold`
* Custom error messages for robustness
* Marketplace item struct tracks:

  * `itemId`, `nftContract`, `tokenId`, `seller`, `owner`, `price`, `sold`

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).

---

## 🤝 Contributions

Feel free to fork the repo and submit a pull request. Feedback and improvements are welcome!

---

## 📬 Contact

For queries, feel free to reach out via \[[your-email@example.com](mailto:your-email@example.com)] or open an issue.