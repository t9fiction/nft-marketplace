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
import {
  chain,
  NFT_ADDRESS,
  NFT_MARKETPLACE_ADDRESS,
  NFTContract,
  NFTMarketplace,
} from "@/constants";

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

export default function Dashboard() {
  const [soldItems, setSoldItems] = useState<NFTItem[]>([]);
  const [unsoldItems, setUnsoldItems] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"name" | "price" | "newest">("newest");
  const [activeTab, setActiveTab] = useState<"listed" | "sold">("listed");

  const router = useRouter();
  const activeWallet = useActiveWallet();
  const activeAccount = useActiveAccount();

  // Get current items based on active tab
  const currentItems = activeTab === "listed" ? unsoldItems : soldItems;

  // Filter and sort NFTs
  const filteredAndSortedNFTs = useMemo(() => {
    let filtered = currentItems.filter((nft) => {
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
  }, [currentItems, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedNFTs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedNFTs = filteredAndSortedNFTs.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // Reset to first page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, activeTab]);

  useEffect(() => {
    loadNFTs();
  }, []);

  async function loadNFTs() {
    try {
      setLoading(true);
      const data = await readContract({
        contract: NFTMarketplace,
        method:
          "function fetchMyNFTs() view returns ((uint256 itemId, address nftContract, uint256 tokenId, address seller, address owner, uint256 price, bool sold)[])",
        params: [],
      });
      console.log("Fetched items:", data);

      // Filter items by sold status
      const soldItemsData = data.filter((item: any) => item.sold);
      const unsoldItemsData = data.filter((item: any) => !item.sold);

      // Process sold items
      const processedSoldItems: NFTItem[] = await Promise.all(
        soldItemsData.map(async (item: any) => {
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

      // Process unsold items
      const processedUnsoldItems: NFTItem[] = await Promise.all(
        unsoldItemsData.map(async (item: any) => {
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

      setSoldItems(processedSoldItems);
      setUnsoldItems(processedUnsoldItems);
    } catch (error) {
      console.error("Error loading NFTs:", error);
      setSoldItems([]);
      setUnsoldItems([]);
    } finally {
      setLoading(false);
    }
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
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-foreground/70">
            Please connect your wallet to view the marketplace dashboard
          </p>
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
            Marketplace Dashboard
          </h1>
          <p className="text-foreground/70 text-lg font-inter">
            Track your marketplace activity and sales
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-main rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground/60 text-sm font-inter">
                  Listed Items
                </p>
                <p className="text-3xl font-bold text-foreground font-poppins">
                  {unsoldItems.length}
                </p>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-full">
                <svg
                  className="w-6 h-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-main rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground/60 text-sm font-inter">
                  Sold Items
                </p>
                <p className="text-3xl font-bold text-foreground font-poppins">
                  {soldItems.length}
                </p>
              </div>
              <div className="bg-green-500/10 p-3 rounded-full">
                <svg
                  className="w-6 h-6 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-main rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground/60 text-sm font-inter">
                  Total Revenue
                </p>
                <p className="text-3xl font-bold text-foreground font-poppins">
                  {soldItems
                    .reduce(
                      (acc, item) =>
                        acc + parseFloat(toEther(BigInt(item.price || "0"))),
                      0
                    )
                    .toFixed(2)}{" "}
                  ETH
                </p>
              </div>
              <div className="bg-yellow-500/10 p-3 rounded-full">
                <svg
                  className="w-6 h-6 text-yellow-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-main rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground/60 text-sm font-inter">
                  Success Rate
                </p>
                <p className="text-3xl font-bold text-foreground font-poppins">
                  {unsoldItems.length + soldItems.length > 0
                    ? Math.round(
                        (soldItems.length /
                          (unsoldItems.length + soldItems.length)) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
              <div className="bg-purple-500/10 p-3 rounded-full">
                <svg
                  className="w-6 h-6 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-main rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center mb-6">
            {/* Tab Buttons */}
            <div className="flex bg-background rounded-lg p-1">
              <button
                onClick={() => setActiveTab("listed")}
                className={`px-4 py-2 rounded-lg transition-colors font-inter ${
                  activeTab === "listed"
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-foreground/10"
                }`}
              >
                Listed Items ({unsoldItems.length})
              </button>
              <button
                onClick={() => setActiveTab("sold")}
                className={`px-4 py-2 rounded-lg transition-colors font-inter ${
                  activeTab === "sold"
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-foreground/10"
                }`}
              >
                Sold Items ({soldItems.length})
              </button>
            </div>

            {/* Search */}
            <div className="flex-1 w-full lg:w-auto">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search NFTs by name, description, or token ID..."
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
                onChange={(e) =>
                  setSortBy(e.target.value as "name" | "price" | "newest")
                }
                className="w-full px-4 py-3 border border-foreground/20 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
              >
                <option value="newest">Newest First</option>
                <option value="name">Name A-Z</option>
                <option value="price">Price Low to High</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-foreground/70">
            Showing {paginatedNFTs.length} of {filteredAndSortedNFTs.length}{" "}
            {activeTab === "listed" ? "listed" : "sold"} NFTs
            {searchQuery && ` for "${searchQuery}"`}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="ml-3 text-foreground/70">
              Loading marketplace data...
            </span>
          </div>
        )}

        {/* No Results */}
        {!loading && filteredAndSortedNFTs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-foreground/10 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-foreground/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No NFTs Found
            </h3>
            <p className="text-foreground/70">
              {searchQuery
                ? "Try adjusting your search terms"
                : `No ${
                    activeTab === "listed" ? "listed" : "sold"
                  } items found`}
            </p>
          </div>
        )}

        {/* NFT Grid */}
        {!loading && paginatedNFTs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedNFTs.map((nft, i) => {
              const priceInEth = nft.price ? toEther(BigInt(nft.price)) : "0";
              return (
                <div
                  key={`${nft.itemId}-${i}`}
                  className="bg-main rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Image Container with Fixed Aspect Ratio */}
                  <div className="relative aspect-square bg-background/50">
                    {nft.image ? (
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='16' fill='%236b7280'%3ENo Image%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          className="w-16 h-16 text-foreground/30"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          nft.sold
                            ? "bg-green-500 text-white"
                            : "bg-blue-500 text-white"
                        }`}
                      >
                        {nft.sold ? "Sold" : "Listed"}
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
                    <p className="text-sm text-foreground/60 mb-3 font-inter">
                      Token #{nft.tokenId}
                    </p>

                    {/* Description - Fixed Height */}
                    <div className="h-12 mb-4">
                      <p className="text-foreground/70 text-sm line-clamp-2 font-inter">
                        {nft.description}
                      </p>
                    </div>

                    {/* Price Display */}
                    <div className="border-t border-foreground/10 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground/60 font-inter">
                          Price
                        </span>
                        <span className="text-lg font-bold text-foreground font-poppins">
                          {parseFloat(priceInEth).toFixed(4)} ETH
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {renderPagination()}
      </div>
    </div>
  );
}
