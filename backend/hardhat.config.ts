import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const {
  PRIVATE_KEY,
  SEPOLIA_RPC_URL,
  ETHERSCAN_API_KEY,
  ARBITRUM_SEPOLIA_RPC_URL,
  ARBITRUM_CHAIN_ID,
  ARBITRUM_API_KEY,
  AURORA_MAINNET_RPC_URL,
  AURORA_TESTNET_RPC_URL
} = process.env;

// Ensure environment variables are defined
if (!PRIVATE_KEY) {
  throw new Error("Please set your PRIVATE_KEY in a .env file");
}

if (!SEPOLIA_RPC_URL) {
  throw new Error("Please set your API_URL_sepolia in a .env file");
}

if (!ETHERSCAN_API_KEY) {
  throw new Error("Please set your ETHERSCAN_API_KEY in a .env file");
}

if (!ARBITRUM_SEPOLIA_RPC_URL) {
  throw new Error("Please set your ARBITRUM_SEPOLIA_RPC_URL in a .env file");
}
if (!ARBITRUM_CHAIN_ID) {
  throw new Error("Please set your ARBITRUM_CHAIN_ID in a .env file");
}
if (!ARBITRUM_API_KEY) {
  throw new Error("Please set your ARBITRUM_API_KEY in a .env file");
}

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
    arbitrumSepolia: {
      url: ARBITRUM_SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
    aurora_mainnet:{
      url: AURORA_MAINNET_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
    aurora_testnet:{
      url: AURORA_TESTNET_RPC_URL,
      accounts: [PRIVATE_KEY],
    }
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY as string,
      arbitrumSepolia: "8TRKBFDDDRCQIA3BWQ2DYPY4JMKRU3UBN2"
    },
    customChains: [
      {
        network: "arbitrumSepolia",
        chainId: Number(ARBITRUM_CHAIN_ID),
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
    ],
  },
};

export default config;
