"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getContract,
  readContract,
  prepareContractCall,
  toEther,
} from "thirdweb";
import {
  useActiveAccount,
  useActiveWallet,
  useSendAndConfirmTransaction,
} from "thirdweb/react";
import { client } from "../client";
import { chain, NFT_ADDRESS, NFT_MARKETPLACE_ADDRESS, NFTContract, NFTMarketplace } from "@/constants";

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

const ITEMS_PER_PAGE = 12;

export default function MyAssets() {
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"name" | "price" | "newest">("newest");
  const [showListModal, setShowListModal] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFTItem | null>(null);
  const [listingPrice, setListingPrice] = useState("");

  const router = useRouter();
  const activeWallet = useActiveWallet();
  const activeAccount = useActiveAccount();


  const { mutate: listNFTTransaction } = useSendAndConfirmTransaction();

  // Filter and sort NFTs
  const filteredAndSortedNFTs = useMemo(() => {
    let filtered = nfts.filter((nft) => {
      const matchesSearch = 
        nft.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nft.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nft.tokenId.includes(searchQuery);
      
      return matchesSearch;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "price":
          const priceA = parseFloat(toEther(BigInt(a.price || "0")));
          const priceB = parseFloat(toEther(BigInt(b.price || "0")));
          return priceA - priceB;
        case "newest":
        default:
          return parseInt(b.tokenId) - parseInt(a.tokenId);
      }
    });

    return filtered;
  }, [nfts, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedNFTs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedNFTs = filteredAndSortedNFTs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to first page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);

  useEffect(() => {
    if (activeAccount) {
      loadMyNFTs();
    }
  }, [activeAccount]);


  async function loadMyNFTs() {
    try {
      setLoading(true);
      const data = await readContract({
        contract: NFTMarketplace,
        method:
          "function fetchMyNFTs() view returns ((uint256 itemId, address nftContract, uint256 tokenId, address seller, address owner, uint256 price, bool sold)[])",
        params: [],
      });

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

            return {
              itemId: item.itemId.toString(),
              nftContract: item.nftContract,
              tokenId: item.tokenId.toString(),
              seller: item.seller,
              owner: item.owner,
              price: item.price.toString(),
              sold: item.sold,
              image: meta.image || undefined,
              name: meta.name || "Unnamed NFT",
              description: meta.description || "No description available",
            };
          } catch (metaError) {
            console.error(
              `Error loading metadata for token ${item.tokenId}:`,
              metaError
            );
            return {
              itemId: item.itemId.toString(),
              nftContract: item.nftContract,
              tokenId: item.tokenId.toString(),
              seller: item.seller,
              owner: item.owner,
              price: item.price.toString(),
              sold: item.sold,
              name: `NFT #${item.tokenId}`,
              description: "Metadata unavailable",
            };
          }
        })
      );

      setNfts(items);
    } catch (error) {
      console.error("Error loading NFTs:", error);
      setNfts([]);
    } finally {
      setLoading(false);
    }
  }

  function openListModal(nft: NFTItem) {
    setSelectedNFT(nft);
    setListingPrice("");
    setShowListModal(true);
  }

  function closeListModal() {
    setShowListModal(false);
    setSelectedNFT(null);
    setListingPrice("");
  }

  function handleListNFT() {
    if (!selectedNFT || !listingPrice || !activeAccount) {
      alert("Please enter a valid price");
      return;
    }

    const priceInWei = (parseFloat(listingPrice) * 1e18).toString();

    const transaction = prepareContractCall({
      contract: NFTMarketplace,
      method: "function createMarketItem(address _nftContract, uint256 _tokenId, uint256 _price) payable",
      params: [NFTContract.address, BigInt(selectedNFT.tokenId), BigInt(priceInWei)],
    });

    listNFTTransaction(transaction, {
      onSuccess: () => {
        console.log("NFT listed successfully!");
        closeListModal();
        loadMyNFTs(); // Reload NFTs after successful listing
      },
      onError: (error) => {
        console.error("Listing failed:", error);
        alert("Listing failed. Please try again.");
      },
    });
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`px-3 py-2 mx-1 rounded-lg transition-colors ${
            currentPage === i
              ? "bg-pink-500 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex justify-center items-center mt-8 space-x-2">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-main text-foreground rounded-lg hover:bg-background border border-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {pages}
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-main text-foreground rounded-lg hover:bg-background border border-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    );
  };

  if (!activeWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 bg-main rounded-2xl shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Connect Your Wallet</h2>
          <p className="text-foreground/70">Please connect your wallet to view your NFT collection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-title mb-4 font-poppins">
            My NFT Collection
          </h1>
          <p className="text-foreground/70 text-lg font-inter">Manage and list your digital assets</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-background rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Search */}
            <div className="flex-1 w-full lg:w-auto">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search your NFTs by name, description, or token ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-foreground/20 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground placeholder-foreground/50"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "name" | "price" | "newest")}
                className="w-full px-4 py-3 border border-foreground/20 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
              >
                <option value="newest">Newest First</option>
                <option value="name">Name A-Z</option>
                <option value="price">Price Low to High</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-foreground/70">
            Showing {paginatedNFTs.length} of {filteredAndSortedNFTs.length} NFTs
            {searchQuery && ` for "${searchQuery}"`}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="ml-3 text-foreground/70">Loading your NFTs...</span>
          </div>
        )}

        {/* No Results */}
        {!loading && filteredAndSortedNFTs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-foreground/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No NFTs Found</h3>
            <p className="text-foreground/70">
              {searchQuery ? "Try adjusting your search terms" : "You don't own any NFTs yet"}
            </p>
          </div>
        )}

        {/* NFT Grid */}
        {!loading && paginatedNFTs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedNFTs.map((nft, i) => {
              const priceInEth = nft.price ? toEther(BigInt(nft.price)) : "0";
              return (
                <div key={`${nft.itemId}-${i}`} className="bg-main rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  {/* Image Container with Fixed Aspect Ratio */}
                  <div className="relative aspect-square bg-background/50">
                    {nft.image ? (
                      <img 
                        src={nft.image} 
                        alt={nft.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='16' fill='%236b7280'%3ENo Image%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        Owned
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Title - Fixed Height */}
                    <div className="h-14 mb-3">
                      <h3 className="text-xl font-bold text-foreground line-clamp-2 font-poppins">
                        {nft.name}
                      </h3>
                    </div>

                    {/* Token ID */}
                    <p className="text-sm text-foreground/60 mb-3 font-inter">Token #{nft.tokenId}</p>

                    {/* Description - Fixed Height */}
                    <div className="h-12 mb-4">
                      <p className="text-foreground/70 text-sm line-clamp-2 font-inter">
                        {nft.description}
                      </p>
                    </div>

                    {/* Current Price Display (if any) */}
                    {nft.price && parseFloat(priceInEth) > 0 && (
                      <div className="border-t border-foreground/10 pt-4 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-foreground/60 font-inter">Current Price</span>
                          <span className="text-lg font-bold text-foreground font-poppins">
                            {parseFloat(priceInEth).toFixed(4)} ETH
                          </span>
                        </div>
                      </div>
                    )}

                    {/* List Button */}
                    <button
                      onClick={() => openListModal(nft)}
                      className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 font-inter"
                    >
                      List for Sale
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {renderPagination()}

        {/* List NFT Modal */}
        {showListModal && selectedNFT && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-main rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-foreground font-poppins">List NFT for Sale</h3>
                <button
                  onClick={closeListModal}
                  className="text-foreground/50 hover:text-foreground transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* NFT Preview */}
              <div className="mb-6">
                <div className="aspect-square bg-background/50 rounded-lg overflow-hidden mb-3">
                  {selectedNFT.image ? (
                    <img 
                      src={selectedNFT.image} 
                      alt={selectedNFT.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <h4 className="text-lg font-bold text-foreground mb-1">{selectedNFT.name}</h4>
                <p className="text-sm text-foreground/60">Token #{selectedNFT.tokenId}</p>
              </div>

              {/* Price Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Listing Price (ETH)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.00"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  className="w-full px-4 py-3 border border-foreground/20 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeListModal}
                  className="flex-1 px-4 py-3 border border-foreground/20 text-foreground rounded-lg hover:bg-background transition-colors font-inter"
                >
                  Cancel
                </button>
                <button
                  onClick={handleListNFT}
                  disabled={!listingPrice || parseFloat(listingPrice) <= 0}
                  className="flex-1 bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-inter"
                >
                  List NFT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}