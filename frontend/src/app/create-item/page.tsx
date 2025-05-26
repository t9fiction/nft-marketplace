"use client";
import { chain, NFT_ADDRESS, NFT_MARKETPLACE_ADDRESS } from "@/constants";
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

// Pinata configuration
const PINATA_API_KEY = "2f4bc968a4e1cdcb9af4";
const PINATA_SECRET_API_KEY =
  "6cb8ec099a6cf0d61a8f237738fd11b1f26ec7b2dcd685df1ee839fc8b0ba477";
const PINATA_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI1MDFlZmM2OS01OTRhLTQyMGUtOWVhYS0wMDVlNWI5MjQyNjMiLCJlbWFpbCI6InNvaGFpbC5zb2hhaWxpc2hhcUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMmY0YmM5NjhhNGUxY2RjYjlhZjQiLCJzY29wZWRLZXlTZWNyZXQiOiI2Y2I4ZWMwOTlhNmNmMGQ2MWE4ZjIzNzczOGZkMTFiMWYyNmVjN2IyZGNkNjg1ZGYxZWU4MzlmYzhiMGJhNDc3IiwiZXhwIjoxNzc5ODA0MDYyfQ._N2e5KwxAhUjFu3aEAXXfQtc5-FPpTlEMdG0azYmtSA";

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

  // Upload file to Pinata
  async function uploadToPinata(file: File) {
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
      // Validate file size (e.g., max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size exceeds 10MB limit");
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
      setStatus("Please select an image and connect your wallet");
      return;
    }

    // Validate price
    if (
      !formInput.price ||
      isNaN(Number(formInput.price)) ||
      Number(formInput.price) <= 0
    ) {
      setStatus("Please enter a valid price greater than 0");
      return;
    }

    setStatus("Uploading to Pinata...");

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

      setStatus("Minting NFT...");

      // Prepare mint transaction
      const tx = prepareContractCall({
        contract: NFTContract,
        method:
          "function createToken(string memory tokenURI)",
        params: [metadataUrl],
      });

      if (!account) {
        return false;
      }

      const mintReceipt = await sendAndConfirmTransaction({
        transaction: tx,
        account,
      });
      // Send and confirm mint transaction
      // const mintReceipt = await createItem(tx);
      console.log("Mint transaction receipt:", mintReceipt);

      // Get the latest events to find the tokenId
      const preparedEvent = prepareEvent({
        signature:
          "event MarketItemCreated(uint256 indexed tokenId, address indexed minter)",
      });

      // Add a small delay to ensure event is indexed
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const eventData = await getContractEvents({
        contract: NFTContract,
        events: [preparedEvent],
      });

      console.log("Event data:", eventData);

      if (!eventData || eventData.length === 0) {
        throw new Error("Could not retrieve token ID from mint transaction");
      }

      const tokenId = eventData[0].args.tokenId.toString();
      console.log("Token ID:", tokenId);

      setStatus("NFT minted! Listing on marketplace...");

      // ----------------------------------------------------
      const transaction = prepareContractCall({
        contract: NFTMarketplace,
        method:
          "function createMarketItem(address _nftContract, uint256 _tokenId, uint256 _price) payable",
        params: [NFTContract.address, BigInt(tokenId), toWei(formInput.price)],
        value: toWei("0.025"),
      });

      if (!account) {
        return false;
      }

      await sendAndConfirmTransaction({
        transaction,
        account,
      });
      // const marketplaceReceipt = await createItem(transaction);
      // console.log("Marketplace listing receipt:", marketplaceReceipt);

      setStatus("NFT created and listed successfully!");

      // Reset form
      setFormInput({
        name: "",
        description: "",
        price: "",
        image: null,
      });
      setFileUrl(null);

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error: any) {
      console.error("Error creating NFT:", error);
      setStatus(`Error: ${error.message || "Failed to create NFT"}`);
    }
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground font-poppins mb-4">
            Create Your NFT
          </h1>
          <p className="text-lg text-foreground/70 font-inter max-w-2xl mx-auto">
            Transform your digital art into a unique NFT and list it on the marketplace
          </p>
          <p className="text-xs text-foreground/20 font-inter mt-2">
            Supported formats: PNG, JPG, GIF (max 1 MB)
            <br />
            A small fee of 0.025 ETH is required to list your NFT on the marketplace.
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
                    className="w-full px-4 py-3 bg-background/50 border border-primary/30 rounded-xl text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 font-inter"
                    value={formInput.name}
                    onChange={(e) =>
                      setFormInput({ ...formInput, name: e.target.value })
                    }
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
                    className="w-full px-4 py-3 bg-background/50 border border-primary/30 rounded-xl text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 font-inter resize-none h-24"
                    value={formInput.description}
                    onChange={(e) =>
                      setFormInput({ ...formInput, description: e.target.value })
                    }
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
                      className="w-full px-4 py-3 bg-background/50 border border-primary/30 rounded-xl text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 font-inter pr-12"
                      value={formInput.price}
                      onChange={(e) =>
                        setFormInput({ ...formInput, price: e.target.value })
                      }
                      type="number"
                      step="0.01"
                      min="0.01"
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
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={onChange}
                      accept="image/*"
                      required
                    />
                    <div className="flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed border-primary/40 rounded-xl bg-background/30 hover:bg-background/50 transition-all duration-200">
                      <svg className="w-10 h-10 text-primary mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-foreground/70 text-center">
                        <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-sm text-foreground/50 mt-1">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-poppins text-lg"
                  disabled={
                    status.includes("Uploading") || status.includes("Minting")
                  }
                >
                  {status.includes("Uploading") || status.includes("Minting")
                    ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </div>
                    )
                    : "Create & List NFT"}
                </button>
              </form>

              {/* Status Message */}
              {status && (
                <div className="mt-6 p-4 rounded-xl text-center">
                  <p className={`font-semibold ${
                    status.includes("Error") 
                      ? "text-red-400 bg-red-400/10 border border-red-400/20" 
                      : status.includes("successfully")
                      ? "text-green-400 bg-green-400/10 border border-green-400/20"
                      : "text-primary bg-primary/10 border border-primary/20"
                  } p-3 rounded-lg font-inter`}>
                    {status}
                  </p>
                </div>
              )}
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
                        <span className="text-foreground/60 text-sm font-inter">Price</span>
                        <span className="text-primary font-bold font-poppins">
                          {formInput.price || "0.00"} ETH
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 sm:h-80 border-2 border-dashed border-primary/30 rounded-xl bg-background/20">
                    <svg className="w-16 h-16 text-primary/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
              <svg className="w-16 h-16 text-primary mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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