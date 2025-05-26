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
    <div className="flex justify-center">
      {activeWallet ? (
        <div className="w-1/2 flex flex-col pb-12">
          <form onSubmit={handleSubmit}>
            <input
              placeholder="Asset Name"
              className="mt-8 border rounded p-4"
              value={formInput.name}
              onChange={(e) =>
                setFormInput({ ...formInput, name: e.target.value })
              }
              required
            />
            <textarea
              placeholder="Asset Description"
              className="mt-2 border rounded p-4"
              value={formInput.description}
              onChange={(e) =>
                setFormInput({ ...formInput, description: e.target.value })
              }
              required
            />
            <input
              placeholder="Asset Price in Eth"
              className="mt-2 border rounded p-4"
              value={formInput.price}
              onChange={(e) =>
                setFormInput({ ...formInput, price: e.target.value })
              }
              type="number"
              step="0.01"
              min="0.01"
              required
            />
            <input
              type="file"
              name="Asset"
              className="my-4"
              onChange={onChange}
              accept="image/*"
              required
            />
            {fileUrl && (
              <img
                className="rounded mt-4"
                width="350"
                src={fileUrl}
                alt="NFT Preview"
              />
            )}
            <button
              type="submit"
              className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg"
              disabled={
                status.includes("Uploading") || status.includes("Minting")
              }
            >
              {status.includes("Uploading") || status.includes("Minting")
                ? "Processing..."
                : "Create NFT"}
            </button>
          </form>
          {status && (
            <div className="mt-4 text-center">
              <p
                className={
                  status.includes("Error") ? "text-red-500" : "text-blue-500"
                }
              >
                {status}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-center text-gray-500 mt-8">No wallet connected</p>
        </div>
      )}
    </div>
  );
};

export default CreateItem;
