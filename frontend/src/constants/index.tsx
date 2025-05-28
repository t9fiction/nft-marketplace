import { client } from "@/app/client";
import { sepolia } from "thirdweb/chains";
import { getContract } from "thirdweb";

export const NFT_ADDRESS = "0x94e07648aC2A803271a4fe437670F6657258833b";
export const NFT_MARKETPLACE_ADDRESS =
  "0x8b035CAb51b0FbA6D8e537523c13FA50136650cE";
export const chain = sepolia;

export const NFTContract = getContract({
  client,
  chain: chain,
  address: NFT_ADDRESS,
});

export const NFTMarketplace = getContract({
  client,
  chain: chain,
  address: NFT_MARKETPLACE_ADDRESS,
});
