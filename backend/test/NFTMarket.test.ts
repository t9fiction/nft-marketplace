import { expect } from "chai";
import { ethers } from "hardhat";
// import { Contract } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { NFTMarketplace, NFT } from "../typechain-types";

describe("NFTMarketplace", function () {
  let nftMarketplace: NFTMarketplace;
  let nft: NFT;
  let owner: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let listingPrice: bigint;

  beforeEach(async function () {
    // Get test accounts
    [owner, seller, buyer, ...addrs] = await ethers.getSigners();

    // Deploy NFTMarketplace contract
    const NFTMarketplaceFactory = await ethers.getContractFactory(
      "NFTMarketplace"
    );
    nftMarketplace = await NFTMarketplaceFactory.deploy();
    await nftMarketplace.waitForDeployment();

    // Deploy NFT contract with marketplace address
    const marketplaceAddress = await nftMarketplace.getAddress();
    const NFTFactory = await ethers.getContractFactory("NFT");
    nft = await NFTFactory.deploy(marketplaceAddress);
    
    // Wait for deployment and get deployed contract
    const deployedNFT = await nft.waitForDeployment();
    const nftAddress = await deployedNFT.getAddress();
    nft = await ethers.getContractAt("NFT", nftAddress);

    // Get the listing price
    listingPrice = await nftMarketplace.getListingPrice();
  });

  describe("1. Deployment & Initial State", function () {
    it("Should set the correct owner", async function () {
      expect(await nftMarketplace.owner()).to.equal(owner.address);
    });

    it("Should set the correct initial listing price", async function () {
      expect(await nftMarketplace.listingPrice()).to.equal(
        ethers.parseEther("0.025")
      );
    });

    it("Should set the symbol of the Contract to SINS", async function () {
      const symbol = await nft.symbol();
      expect(symbol).to.equal("SINS");
    });

    it("Should initialize itemIds and itemsSold to 0", async function () {
      expect(await nftMarketplace.getTotalItemsCount()).to.equal(0);
      expect(await nftMarketplace.getSoldItemsCount()).to.equal(0);
    });
  });

  describe("2. Market Item Creation", function () {
    let tokenId: bigint;
    const tokenURI = "https://example.com/token/1";
    const price = ethers.parseEther("1");

    beforeEach(async function () {
      // Create a token to use in tests
      const createTokenTx = await nft.connect(seller).createToken(tokenURI);
      await createTokenTx.wait();
      tokenId = await nft.getTokenId();
    });

    it("Should create a market item with valid inputs", async function () {
      // Approve marketplace to manage the token
      // await nft
      //   .connect(seller)
      //   .setApprovalForAll(await nftMarketplace.getAddress(), true);

      // Create market item
      await expect(
        nftMarketplace
          .connect(seller)
          .createMarketItem(await nft.getAddress(), tokenId, price, {
            value: listingPrice,
          })
      ).to.emit(nftMarketplace, "MarketItemCreated");

      // Check market items count increased
      expect(await nftMarketplace.getTotalItemsCount()).to.equal(1);
      expect(await nftMarketplace.getUnsoldItemsCount()).to.equal(1);

      // Fetch market items to verify
      const items = await nftMarketplace.fetchMarketItems();
      expect(items.length).to.equal(1);

      const item = items[0];
      expect(item.itemId).to.equal(1);
      expect(item.nftContract).to.equal(await nft.getAddress());
      expect(item.tokenId).to.equal(tokenId);
      expect(item.seller).to.equal(seller.address);
      expect(item.owner).to.equal(ethers.ZeroAddress);
      expect(item.price).to.equal(price);
      expect(item.sold).to.equal(false);
    });

    it("Should revert when creating a market item with invalid price (zero)", async function () {
      await nft
        .connect(seller)
        .setApprovalForAll(await nftMarketplace.getAddress(), true);

      await expect(
        nftMarketplace
          .connect(seller)
          .createMarketItem(await nft.getAddress(), tokenId, 0, {
            value: listingPrice,
          })
      ).to.be.revertedWithCustomError(nftMarketplace, "InvalidPrice");
    });

    it("Should revert when creating a market item with incorrect listing fee", async function () {
      await nft
        .connect(seller)
        .setApprovalForAll(await nftMarketplace.getAddress(), true);

      // Try with listing price too low
      await expect(
        nftMarketplace
          .connect(seller)
          .createMarketItem(await nft.getAddress(), tokenId, price, {
            value: listingPrice - 1n,
          })
      ).to.be.revertedWithCustomError(nftMarketplace, "IncorrectListingPrice");

      // Try with listing price too high
      await expect(
        nftMarketplace
          .connect(seller)
          .createMarketItem(await nft.getAddress(), tokenId, price, {
            value: listingPrice + 1n,
          })
      ).to.be.revertedWithCustomError(nftMarketplace, "IncorrectListingPrice");
    });

    it("Should transfer NFT ownership to marketplace during creation", async function () {
      await nft
        .connect(seller)
        .setApprovalForAll(await nftMarketplace.getAddress(), true);

      await nftMarketplace
        .connect(seller)
        .createMarketItem(await nft.getAddress(), tokenId, price, {
          value: listingPrice,
        });

      // Check the token is now owned by the marketplace
      expect(await nft.ownerOf(tokenId)).to.equal(
        await nftMarketplace.getAddress()
      );
    });

    it("Should emit MarketItemCreated event with correct parameters", async function () {
      await nft
        .connect(seller)
        .setApprovalForAll(await nftMarketplace.getAddress(), true);

      await expect(
        nftMarketplace
          .connect(seller)
          .createMarketItem(await nft.getAddress(), tokenId, price, {
            value: listingPrice,
          })
      )
        .to.emit(nftMarketplace, "MarketItemCreated")
        .withArgs(
          1, // itemId
          await nft.getAddress(),
          tokenId,
          seller.address,
          await nftMarketplace.getAddress(),
          price,
          false
        );
    });
  });

  describe("3. Market Item Sales", function () {
    let tokenId: bigint;
    let itemId: bigint;
    const tokenURI = "https://example.com/token/1";
    const price = ethers.parseEther("1");

    beforeEach(async function () {
      // Create a token
      await nft.connect(seller).createToken(tokenURI);
      tokenId = await nft.getTokenId();

      // Approve marketplace to manage the token
      await nft
        .connect(seller)
        .setApprovalForAll(await nftMarketplace.getAddress(), true);

      // Create market item
      await nftMarketplace
        .connect(seller)
        .createMarketItem(await nft.getAddress(), tokenId, price, {
          value: listingPrice,
        });

      itemId = 1n; // First item id
    });

    it("Should allow buying a market item with correct price", async function () {
      const initialOwnerBalance = await ethers.provider.getBalance(
        owner.address
      );
      const initialSellerBalance = await ethers.provider.getBalance(
        seller.address
      );

      // Buy the item
      await expect(
        nftMarketplace
          .connect(buyer)
          .createMarketSale(await nft.getAddress(), itemId, { value: price })
      ).to.emit(nftMarketplace, "MarketItemSold");

      // Check item is now sold
      expect(await nftMarketplace.getSoldItemsCount()).to.equal(1);

      // Check ownership transferred to buyer
      expect(await nft.ownerOf(tokenId)).to.equal(buyer.address);

      // Check balances
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      const finalSellerBalance = await ethers.provider.getBalance(
        seller.address
      );

      // Owner should receive listing price
      expect(finalOwnerBalance).to.equal(initialOwnerBalance + listingPrice);

      // Seller should receive the item price
      expect(finalSellerBalance).to.equal(initialSellerBalance + price);
    });

    it("Should revert when buying with incorrect price", async function () {
      // Try to buy with price too low
      await expect(
        nftMarketplace
          .connect(buyer)
          .createMarketSale(await nft.getAddress(), itemId, {
            value: price - 1n,
          })
      ).to.be.revertedWithCustomError(nftMarketplace, "IncorrectPurchasePrice");

      // Try to buy with price too high
      await expect(
        nftMarketplace
          .connect(buyer)
          .createMarketSale(await nft.getAddress(), itemId, {
            value: price + 1n,
          })
      ).to.be.revertedWithCustomError(nftMarketplace, "IncorrectPurchasePrice");
    });

    it("Should revert when buying a non-existent item", async function () {
      const nonExistentItemId = 999n;

      await expect(
        nftMarketplace
          .connect(buyer)
          .createMarketSale(await nft.getAddress(), nonExistentItemId, {
            value: price,
          })
      ).to.be.revertedWithCustomError(nftMarketplace, "InvalidItemId");
    });

    it("Should revert when buying an already sold item", async function () {
      // First purchase
      await nftMarketplace
        .connect(buyer)
        .createMarketSale(await nft.getAddress(), itemId, { value: price });

      // Try to purchase again
      await expect(
        nftMarketplace
          .connect(addrs[0])
          .createMarketSale(await nft.getAddress(), itemId, { value: price })
      ).to.be.revertedWithCustomError(nftMarketplace, "ItemNotForSale");
    });

    it("Should emit MarketItemSold event with correct parameters", async function () {
      await expect(
        nftMarketplace
          .connect(buyer)
          .createMarketSale(await nft.getAddress(), itemId, { value: price })
      )
        .to.emit(nftMarketplace, "MarketItemSold")
        .withArgs(
          itemId,
          await nft.getAddress(),
          tokenId,
          seller.address,
          buyer.address,
          price
        );
    });
  });

  describe("4. Listing Price Management", function () {
    const newListingPrice = ethers.parseEther("0.05");

    it("Should allow owner to update listing price", async function () {
      await nftMarketplace.connect(owner).updateListingPrice(newListingPrice);
      expect(await nftMarketplace.getListingPrice()).to.equal(newListingPrice);
    });

    it("Should revert when non-owner tries to update listing price", async function () {
      await expect(
        nftMarketplace.connect(seller).updateListingPrice(newListingPrice)
      ).to.be.revertedWithCustomError(nftMarketplace, "OnlyOwner");
    });
  });

  describe("5. Market Item Queries", function () {
    const tokenURI1 = "https://example.com/token/1";
    const tokenURI2 = "https://example.com/token/2";
    const tokenURI3 = "https://example.com/token/3";
    const price = ethers.parseEther("1");

    beforeEach(async function () {
      // Create tokens
      for (let i = 0; i < 3; i++) {
        const uri = i === 0 ? tokenURI1 : i === 1 ? tokenURI2 : tokenURI3;
        await nft.connect(seller).createToken(uri);
      }

      // Approve marketplace for all tokens
      await nft
        .connect(seller)
        .setApprovalForAll(await nftMarketplace.getAddress(), true);

      // Create market items for all tokens
      for (let i = 1; i <= 3; i++) {
        await nftMarketplace
          .connect(seller)
          .createMarketItem(await nft.getAddress(), BigInt(i), price, {
            value: listingPrice,
          });
      }

      // Buy the second item
      await nftMarketplace.connect(buyer).createMarketSale(
        await nft.getAddress(),
        2n, // itemId for second token
        { value: price }
      );
    });

    it("Should correctly return all unsold market items via fetchMarketItems", async function () {
      const items = await nftMarketplace.fetchMarketItems();
      expect(items.length).to.equal(2); // 3 items created, 1 sold

      // Verify the items returned are the ones not sold
      expect(items[0].itemId).to.equal(1);
      expect(items[0].sold).to.equal(false);

      expect(items[1].itemId).to.equal(3);
      expect(items[1].sold).to.equal(false);
    });

    it("Should correctly return buyer's NFTs via fetchMyNFTs", async function () {
      const buyerNFTs = await nftMarketplace.connect(buyer).fetchMyNFTs();
      expect(buyerNFTs.length).to.equal(1);
      expect(buyerNFTs[0].itemId).to.equal(2);
      expect(buyerNFTs[0].owner).to.equal(buyer.address);
    });

    it("Should correctly return seller's active listings via fetchItemsListed", async function () {
      const sellerItems = await nftMarketplace
        .connect(seller)
        .fetchItemsListed();
      expect(sellerItems.length).to.equal(2); // 3 items created, 1 sold

      // Verify each unsold item belongs to the seller
      expect(sellerItems[0].seller).to.equal(seller.address);
      expect(sellerItems[1].seller).to.equal(seller.address);
      expect(sellerItems[0].sold).to.equal(false);
      expect(sellerItems[1].sold).to.equal(false);
    });

    it("Should return correct counts via counter functions", async function () {
      // Total items created
      expect(await nftMarketplace.getTotalItemsCount()).to.equal(3);

      // Items sold
      expect(await nftMarketplace.getSoldItemsCount()).to.equal(1);

      // Unsold items
      expect(await nftMarketplace.getUnsoldItemsCount()).to.equal(2);

      // Buyer's NFTs count
      expect(await nftMarketplace.connect(buyer).getMyNFTsCount()).to.equal(1);

      // Seller's listed items count (unsold items)
      expect(
        await nftMarketplace.connect(seller).getMyListedItemsCount()
      ).to.equal(2);
    });

    it("Should handle multiple buyers and sellers correctly", async function () {
      const seller2 = addrs[0];
      const buyer2 = addrs[1];
      const newPrice = ethers.parseEther("2");

      // Create a new token and list it from a different seller
      await nft.connect(seller2).createToken("https://example.com/token/4");
      await nft
        .connect(seller2)
        .setApprovalForAll(await nftMarketplace.getAddress(), true);
      await nftMarketplace
        .connect(seller2)
        .createMarketItem(await nft.getAddress(), 4n, newPrice, {
          value: listingPrice,
        });

      // Buy an item from first seller
      await nftMarketplace.connect(buyer2).createMarketSale(
        await nft.getAddress(),
        3n, // third item
        { value: price }
      );

      // Verify counts
      expect(await nftMarketplace.getTotalItemsCount()).to.equal(4);
      expect(await nftMarketplace.getSoldItemsCount()).to.equal(2);
      expect(await nftMarketplace.getUnsoldItemsCount()).to.equal(2);

      // Check first seller's items
      const seller1Items = await nftMarketplace
        .connect(seller)
        .fetchItemsListed();
      expect(seller1Items.length).to.equal(1); // Only item 1 remains unsold

      // Check second seller's items
      const seller2Items = await nftMarketplace
        .connect(seller2)
        .fetchItemsListed();
      expect(seller2Items.length).to.equal(1); // Item 4 is unsold

      // Check first buyer's NFTs
      const buyer1NFTs = await nftMarketplace.connect(buyer).fetchMyNFTs();
      expect(buyer1NFTs.length).to.equal(1);
      expect(buyer1NFTs[0].itemId).to.equal(2);

      // Check second buyer's NFTs
      const buyer2NFTs = await nftMarketplace.connect(buyer2).fetchMyNFTs();
      expect(buyer2NFTs.length).to.equal(1);
      expect(buyer2NFTs[0].itemId).to.equal(3);
    });

    it("Should handle empty results correctly", async function () {
      // Check for address with no NFTs
      const emptyAddr = addrs[2];
      const noNFTs = await nftMarketplace.connect(emptyAddr).fetchMyNFTs();
      expect(noNFTs.length).to.equal(0);

      // Check for address with no listings
      const noListings = await nftMarketplace
        .connect(emptyAddr)
        .fetchItemsListed();
      expect(noListings.length).to.equal(0);

      // Verify counts
      expect(await nftMarketplace.connect(emptyAddr).getMyNFTsCount()).to.equal(
        0
      );
      expect(
        await nftMarketplace.connect(emptyAddr).getMyListedItemsCount()
      ).to.equal(0);
    });
  });
});
