import { client } from "@/app/client";
import { sepolia } from "thirdweb/chains";
import { getContract } from "thirdweb";

export const NFT_ADDRESS = "0xA8519AFe30cB43f2aE7c997433973BbAB8E063ad";
export const NFT_MARKETPLACE_ADDRESS =
  "0x99BbAA88Ef22454FB464fB789CF484781b6661Ef";
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
