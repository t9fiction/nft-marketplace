"use client";
import { NFT_ADDRESS, NFT_MARKETPLACE_ADDRESS, chain } from "@/constants";

import { useEffect, useState } from "react";
import { getContract, readContract, prepareContractCall } from "thirdweb";
import { client } from "./client";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";

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

  async function buyNFT(itemId: bigint) {
    if (!activeWallet) {
      console.error("No wallet connected");
      return;
    }
    try {
      const transaction = await prepareContractCall({
        contract:NFTMarketplace,
        method:
          "function createMarketSale(address _nftContract, uint256 _itemId) payable",
        params: [NFTContract.address, itemId],
      });
    } catch (error) {
      console.error("Error buying NFT:", error);
    }
  }

  useEffect(() => {
    loadNFTs();
  }, []);

  return (
    <div>
      <h2 className="text-3xl font-bold">Home</h2>
      <div>
        {activeWallet ? (
          <>
            {loading && <p>Loading NFTs...</p>}
            {!loading && nfts.length === 0 && <p>No NFTs found</p>}
            {!loading && nfts.length > 0 && (
              <div>
                <p>
                  Found {nfts.length} NFT{nfts.length !== 1 ? "s" : ""}
                </p>
                {/* Optional: Display the NFTs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {nfts.map((nft) => (
                    <div key={nft.itemId} className="border p-4 rounded">
                      {nft.image && (
                        <img
                          src={nft.image}
                          alt={nft.name || "NFT"}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <h3 className="font-semibold">
                        {nft.name || `Token #${nft.tokenId}`}
                      </h3>
                      <p className="text-sm text-gray-600">{nft.description}</p>
                      <p className="font-bold">Price: {nft.price} ETH</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          "No wallet connected."
        )}
      </div>
    </div>
  );
}
