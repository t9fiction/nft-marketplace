"use client";
import {
  chain,
  NFT_ADDRESS,
  NFT_MARKETPLACE_ADDRESS,
  NFTContract,
  NFTMarketplace,
} from "@/constants";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import {
  useActiveAccount,
  useActiveWallet,
  useSendAndConfirmTransaction,
  useContractEvents,
} from "thirdweb/react";
import {
  getContract,
  prepareContractCall,
  resolveMethod,
  toWei,
  prepareEvent,
  getContractEvents,
  sendAndConfirmTransaction,
} from "thirdweb";
import { client } from "../client";
import Swal from "sweetalert2";

// Pinata configuration - using environment variable
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;

const CreateItem = () => {
  const activeWallet = useActiveWallet();
  const account = useActiveAccount();
  const { mutate: createItem } = useSendAndConfirmTransaction();
  const router = useRouter();

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [formInput, setFormInput] = useState({
    name: "",
    description: "",
    price: "",
    image: null as File | null,
  });
  const [status, setStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Show loading modal with SweetAlert2
  const showLoadingModal = (title: string, text: string) => {
    Swal.fire({
      title: title,
      text: text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  };

  // Show success modal
  const showSuccessModal = (title: string, text: string) => {
    Swal.fire({
      icon: 'success',
      title: title,
      text: text,
      confirmButtonText: 'Awesome!',
      confirmButtonColor: '#10B981',
    });
  };

  // Show error modal
  const showErrorModal = (title: string, text: string) => {
    Swal.fire({
      icon: 'error',
      title: title,
      text: text,
      confirmButtonText: 'Try Again',
      confirmButtonColor: '#EF4444',
    });
  };
  async function uploadToPinata(file: File) {
    if (!PINATA_JWT) {
      throw new Error("Pinata JWT is not configured. Please check your environment variables.");
    }
    const formData = new FormData();
    formData.append("file", file);

    const pinataMetadata = JSON.stringify({
      name: file.name,
    });
    formData.append("pinataMetadata", pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formData.append("pinataOptions", pinataOptions);

    console.log("Uploading to Pinata...");
    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log("Pinata upload result:", result);
    return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
  }

  // Upload JSON metadata to Pinata
  async function uploadJSONToPinata(jsonData: any, filename: string) {
    if (!PINATA_JWT) {
      throw new Error("Pinata JWT is not configured. Please check your environment variables.");
    }
    
    console.log("Uploading JSON to Pinata...");
    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        body: JSON.stringify({
          pinataContent: jsonData,
          pinataMetadata: {
            name: filename,
          },
          pinataOptions: {
            cidVersion: 0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Pinata JSON upload failed: ${response.status} ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Pinata JSON upload result:", result);
    return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
  }

  // Handle file input change and generate preview
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("File size exceeds 2MB limit");
      }
      setFormInput({ ...formInput, image: file });
      const reader = new FileReader();
      reader.onload = () => setFileUrl(reader.result as string);
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Error processing file:", error);
      setStatus(`Error: ${error.message || "Failed to process file"}`);
    }
  }

  // Handle form submission: upload to Pinata and mint NFT
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formInput.image || !account) {
      showErrorModal("Missing Information", "Please select an image and connect your wallet");
      return;
    }
    if (!PINATA_JWT) {
      showErrorModal("Configuration Error", "Pinata JWT is not configured. Please check your environment variables.");
      return;
    }

    // Validate price
    if (
      !formInput.price ||
      isNaN(Number(formInput.price)) ||
      Number(formInput.price) <= 0
    ) {
      showErrorModal("Invalid Price", "Please enter a valid price greater than 0");
      return;
    }

    setIsProcessing(true);
    showLoadingModal("Uploading to IPFS", "Uploading your image to IPFS...");

    try {
      console.log("Starting upload process...");
      console.log(
        "Original file:",
        formInput.image.name,
        formInput.image.type,
        formInput.image.size
      );

      // Upload image to Pinata
      const imageUrl = (await Promise.race([
        uploadToPinata(formInput.image),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Upload timeout after 60 seconds")),
            60000
          )
        ),
      ])) as string;

      console.log("Image uploaded successfully to:", imageUrl);

      // Update loading modal for metadata upload
      showLoadingModal("Creating Metadata", "Uploading NFT metadata to IPFS...");

      // Create metadata
      const metadata = {
        name: formInput.name,
        description: formInput.description,
        image: imageUrl,
        attributes: [{ trait_type: "Collection", value: "numericsins" }],
      };

      console.log("Created metadata:", metadata);

      // Upload metadata to Pinata
      const metadataUrl = (await Promise.race([
        uploadJSONToPinata(metadata, `${formInput.name}_metadata.json`),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Metadata upload timeout after 60 seconds")),
            60000
          )
        ),
      ])) as string;

      console.log("Metadata uploaded to:", metadataUrl);

      // Update loading modal for minting
      showLoadingModal("Minting NFT", "Creating your NFT on the blockchain...");

      // Prepare mint transaction
      const tx = prepareContractCall({
        contract: NFTContract,
        method: "function createToken(string memory tokenURI)",
        params: [metadataUrl],
      });

      if (!account) {
        throw new Error("Account not found");
      }

      // Send and confirm mint transaction
      const mintReceipt = await sendAndConfirmTransaction({
        transaction: tx,
        account,
      });
      console.log("Mint transaction receipt:", mintReceipt);

      // Get the latest events to find the tokenId with retry mechanism
      const preparedEvent = prepareEvent({
        signature:
          "event MarketItemCreated(uint256 indexed tokenId, address indexed minter)",
      });

      showLoadingModal("Processing", "Fetching token ID from blockchain...");

      // Retry fetching events up to 5 times with increasing delay
      let tokenId: string | null = null;
      const maxRetries = 5;
      const initialDelay = 3000; // Start with 3 seconds
      const delayIncrement = 2000; // Increase by 2 seconds each retry

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const eventData = await getContractEvents({
            contract: NFTContract,
            events: [preparedEvent],
            fromBlock: mintReceipt.blockNumber, // Start from the block of the mint transaction
            toBlock: "latest", // Look up to the latest block
          });

          console.log(`Attempt ${attempt} - Event data:`, eventData);

          if (eventData && eventData.length > 0) {
            // Filter events to ensure we get the one from this transaction
            const relevantEvent = eventData.find(
              (event) =>
                event.transactionHash === mintReceipt.transactionHash &&
                event.args.minter.toLowerCase() ===
                  account.address.toLowerCase()
            );

            if (relevantEvent) {
              tokenId = relevantEvent.args.tokenId.toString();
              console.log("Token ID:", tokenId);
              break;
            }
          }

          if (attempt < maxRetries) {
            const delay = initialDelay + (attempt - 1) * delayIncrement;
            console.log(`Retrying after ${delay / 1000} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (error: any) {
          console.error(`Attempt ${attempt} - Error fetching events:`, error);
        }
      }

      if (!tokenId) {
        throw new Error(
          "Could not retrieve token ID after multiple attempts. Please try again later."
        );
      }

      showLoadingModal("Listing on Marketplace", "Listing your NFT on the marketplace...");

      // Prepare marketplace listing transaction
      const transaction = prepareContractCall({
        contract: NFTMarketplace,
        method:
          "function createMarketItem(address _nftContract, uint256 _tokenId, uint256 _price) payable",
        params: [NFTContract.address, BigInt(tokenId), toWei(formInput.price)],
        value: toWei("0.025"),
      });

      await sendAndConfirmTransaction({
        transaction,
        account,
      });

      // Close loading modal and show success
      Swal.close();
      showSuccessModal("Success!", "Your NFT has been created and listed successfully!");

      // Reset form
      setFormInput({
        name: "",
        description: "",
        price: "",
        image: null,
      });
      setFileUrl(null);
      setIsProcessing(false);

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (error: any) {
      console.error("Error creating NFT:", error);
      Swal.close();
      showErrorModal("Transaction Failed", error.message || "Failed to create NFT");
      setIsProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-title font-poppins mb-4">
            Create Your NFT
          </h1>
          <p className="text-lg text-foreground/70 font-inter max-w-2xl mx-auto">
            Transform your digital art into a unique NFT and list it on the
            marketplace
          </p>
          <p className="text-xs text-foreground/20 font-inter mt-2">
            Supported formats: PNG, JPG, GIF (max 2MB)
            <br />A small fee of 0.025 ETH is required to list your NFT on the
            marketplace.
          </p>
        </div>

        {activeWallet ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Form Section */}
            <div className="bg-main/10 backdrop-blur-lg rounded-2xl p-6 sm:p-8 border border-primary/20 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Asset Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground font-inter">
                    Asset Name
                  </label>
                  <input
                    placeholder="Enter your NFT name"
                    className="w-full px-4 py-3 bg-background/50 border border-primary/30 rounded-xl text-gray-900 placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 font-inter disabled:opacity-50 disabled:cursor-not-allowed"
                    value={formInput.name}
                    onChange={(e) =>
                      setFormInput({ ...formInput, name: e.target.value })
                    }
                    disabled={isProcessing}
                    required
                  />
                </div>

                {/* Asset Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground font-inter">
                    Asset Description
                  </label>
                  <textarea
                    placeholder="Describe your NFT in detail"
                    className="w-full px-4 py-3 bg-background/50 border border-primary/30 rounded-xl text-gray-900 placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 font-inter resize-none h-24 disabled:opacity-50 disabled:cursor-not-allowed"
                    value={formInput.description}
                    onChange={(e) =>
                      setFormInput({
                        ...formInput,
                        description: e.target.value,
                      })
                    }
                    disabled={isProcessing}
                    required
                  />
                </div>

                {/* Asset Price */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground font-inter">
                    Asset Price (ETH)
                  </label>
                  <div className="relative">
                    <input
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-background/50 border border-primary/30 rounded-xl text-gray-900 placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 font-inter pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
                      value={formInput.price}
                      onChange={(e) =>
                        setFormInput({ ...formInput, price: e.target.value })
                      }
                      type="number"
                      step="0.01"
                      min="0.01"
                      disabled={isProcessing}
                      required
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-foreground/60 font-semibold">
                      ETH
                    </span>
                  </div>
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground font-inter">
                    Upload Asset
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      name="Asset"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                      onChange={onChange}
                      accept="image/*"
                      disabled={isProcessing}
                      required
                    />
                    <div className={`flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed border-primary/40 rounded-xl bg-background/30 hover:bg-background/50 transition-all duration-200 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <svg
                        className="w-10 h-10 text-primary mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-foreground/70 text-center">
                        <span className="font-semibold text-primary">
                          Click to upload
                        </span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-sm text-foreground/50 mt-1">
                        PNG, JPG, GIF up to 2MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-poppins text-lg"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    "Create & List NFT"
                  )}
                </button>
              </form>

              {/* Remove old status message section since we're using SweetAlert2 */}
            </div>

            {/* Preview Section */}
            <div className="bg-main/10 backdrop-blur-lg rounded-2xl p-6 sm:p-8 border border-primary/20 shadow-2xl">
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-foreground font-poppins text-center">
                  NFT Preview
                </h3>

                {fileUrl ? (
                  <div className="space-y-4">
                    <div className="relative group overflow-hidden rounded-xl bg-background/50 border border-primary/20">
                      <img
                        className="w-full h-64 sm:h-80 object-cover group-hover:scale-105 transition-transform duration-300"
                        src={fileUrl}
                        alt="NFT Preview"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>

                    {/* Preview Card Details */}
                    <div className="space-y-3 p-4 bg-background/30 rounded-xl border border-primary/10">
                      <h4 className="text-lg font-bold text-foreground font-poppins">
                        {formInput.name || "Untitled NFT"}
                      </h4>
                      <p className="text-foreground/70 text-sm font-inter">
                        {formInput.description || "No description provided"}
                      </p>
                      <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                        <span className="text-foreground/60 text-sm font-inter">
                          Price
                        </span>
                        <span className="text-primary font-bold font-poppins">
                          {formInput.price || "0.00"} ETH
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 sm:h-80 border-2 border-dashed border-primary/30 rounded-xl bg-background/20">
                    <svg
                      className="w-16 h-16 text-primary/50 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-foreground/50 text-center font-inter">
                      Upload an image to see preview
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="bg-main/10 backdrop-blur-lg rounded-2xl p-12 border border-primary/20 shadow-2xl max-w-md mx-auto">
              <svg
                className="w-16 h-16 text-primary mx-auto mb-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <h3 className="text-xl font-bold text-foreground mb-3 font-poppins">
                Wallet Not Connected
              </h3>
              <p className="text-foreground/70 font-inter">
                Please connect your wallet to create and list NFTs
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateItem;