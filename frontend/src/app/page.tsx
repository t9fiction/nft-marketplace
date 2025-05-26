"use client";
import { NFT_ADDRESS, NFT_MARKETPLACE_ADDRESS, chain } from "@/constants";

import { useEffect, useState } from "react";
import {
  getContract,
  readContract,
  prepareContractCall,
  sendAndConfirmTransaction,
} from "thirdweb";
import { client } from "./client";
import {
  useActiveAccount,
  useActiveWallet,
  useSendTransaction,
  useSendAndConfirmTransaction,
} from "thirdweb/react";

// Move interface outside component and include all properties
interface NFTItem {
  itemId: string;
  nftContract: string;
  tokenId: string;
  seller: string;
  owner: string;
  price: string;
  sold: boolean;
  image?: string;
  name?: string;
  description?: string;
}

export default function Home() {
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(false);
  // const account = useActiveAccount(); // copied from original code, but not used
  const activeWallet = useActiveWallet();
  const activeAccount = useActiveAccount();
  console.log("Active Wallet", activeWallet);
  console.log("Active Account", activeAccount);

  const NFTContract = getContract({
    client,
    chain: chain,
    address: NFT_ADDRESS,
  });

  const NFTMarketplace = getContract({
    client,
    chain: chain,
    address: NFT_MARKETPLACE_ADDRESS,
  });

  const { mutate: buyNFTTransaction } = useSendAndConfirmTransaction();

  async function loadNFTs() {
    try {
      setLoading(true);
      const data = await readContract({
        contract: NFTMarketplace,
        method:
          "function fetchMarketItems() view returns ((uint256 itemId, address nftContract, uint256 tokenId, address seller, address owner, uint256 price, bool sold)[])",
        params: [],
      });
      console.log("Data", data);

      const items: NFTItem[] = await Promise.all(
        data.map(async (item: any) => {
          try {
            const tokenURI = await readContract({
              contract: NFTContract,
              method:
                "function tokenURI(uint256 tokenId) view returns (string)",
              params: [item.tokenId.toString()],
            });

            const meta = await fetch(tokenURI).then((res) => res.json());
            console.log("Meta", meta);
            console.log("TokenURI", tokenURI);

            return {
              itemId: item.itemId.toString(),
              nftContract: item.nftContract,
              tokenId: item.tokenId.toString(),
              seller: item.seller,
              owner: item.owner,
              price: item.price.toString(),
              sold: item.sold,
              image: meta.image || undefined,
              name: meta.name || undefined,
              description: meta.description || undefined,
            };
          } catch (metaError) {
            console.error(
              `Error loading metadata for token ${item.tokenId}:`,
              metaError
            );
            // Return basic NFT info even if metadata fails
            return {
              itemId: item.itemId.toString(),
              nftContract: item.nftContract,
              tokenId: item.tokenId.toString(),
              seller: item.seller,
              owner: item.owner,
              price: item.price.toString(),
              sold: item.sold,
            };
          }
        })
      );

      // This was missing - update the state with the loaded items
      setNfts(items);
    } catch (error) {
      console.error("Error loading NFTs:", error);
      setNfts([]);
    } finally {
      setLoading(false);
    }
  }

  function buyOnClick(nft: NFTItem) {
    const onClick = () => {
      const transaction = prepareContractCall({
        contract: NFTMarketplace,
        method:
          "function createMarketSale(address _nftContract, uint256 _itemId) payable",
        params: [NFTContract.address, BigInt(nft.tokenId)],
        // value: nfts[itemId].price
      });
      buyNFTTransaction(transaction);
    };
    onClick();
  }

  useEffect(() => {
    loadNFTs();
  }, []);

  return (
    <div className="flex justify-center">
      <div className="px-4" style={{ maxWidth: "1600px" }}>
        {activeWallet ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 justify-items-center">
            {nfts.map((nft, i) => (
              <div key={i} className="border shadow rounded-xl overflow-hidden">
                <img src={nft.image} />
                <div className="p-4">
                  <p
                    style={{ height: "64px" }}
                    className="text-2xl font-semibold"
                  >
                    {nft.name}
                  </p>
                  <div style={{ height: "70px", overflow: "hidden" }}>
                    <p className="text-gray-400">{nft.description}</p>
                  </div>
                </div>
                <div className="p-4 bg-black">
                  <p className="text-2xl font-bold text-white">
                    {nft.price} ETH
                  </p>
                  <button
                    className="mt-4 w-full bg-pink-500 text-white font-bold py-2 px-12 rounded"
                    onClick={() => buyOnClick(nft)}
                  >
                    Buy
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 mt-8">No wallet connected</p>
        )}
      </div>
    </div>
  );
}
