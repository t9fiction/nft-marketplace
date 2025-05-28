import { client } from "@/app/client";
import { sepolia } from "thirdweb/chains";
import { getContract } from "thirdweb";

export const NFT_ADDRESS = "0x599D8ea817D2d2e2B1aE6865481fe2a361dD5c28";
export const NFT_MARKETPLACE_ADDRESS =
  "0x7D649D8210E99125E6208E70f2d9065Ca6181D01";
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
