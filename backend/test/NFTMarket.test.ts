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
describe("NFTMarketplace", function () {
  // Test variables
  let nftMarketplace;
  let nft;
  let listingPrice;
  let auctionPrice;
  let owner;
  let addr1;
  let addr2;
  let addr3;

  beforeEach(async function () {
    try {
      // Get signers for different test accounts
      [owner, addr1, addr2, addr3] = await ethers.getSigners();

      // Deploy the NFTMarketplace contract
      const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
      nftMarketplace = await NFTMarketplace.deploy();
      
      // Deploy the NFT contract with the marketplace address
      const NFT = await ethers.getContractFactory("NFT");
      nft = await NFT.deploy(await nftMarketplace.getAddress());

      // Get the listing price from marketplace
      listingPrice = await nftMarketplace.getListingPrice();
      
      // Set auction price (10 ETH)
      auctionPrice = ethers.parseEther("10");
    } catch (error) {
      console.error("Setup error:", error);
      throw error;
    }
  });

  // Helper function to create and mint an NFT token
  async function createNFT(creator, tokenURI) {
    try {
      // Get current token ID before creating
      const currentTokenId = await nft.getTokenId();
      
      // Create the token
      const tx = await nft.connect(creator).createToken(tokenURI);
      await tx.wait();
      
      // The new token ID will be the current token ID + 1
      const newTokenId = await nft.getTokenId();
      
      return newTokenId;
    } catch (error) {
      console.error("Error creating NFT:", error);
      throw error;
    }
  }

  // Helper function to list an NFT on the marketplace
  async function listNFT(seller, tokenId, price) {
    try {
      const nftAddress = await nft.getAddress();
      
      // Create market item
      const tx = await nftMarketplace.connect(seller).createMarketItem(
        nftAddress,
        tokenId,
        price,
        { value: listingPrice }
      );
      await tx.wait();
      
      // Get the current item ID
      const itemId = await nftMarketplace.getTotalItemsCount();
      return itemId;
    } catch (error) {
      console.error("Error listing NFT:", error);
      throw error;
    }
  }

  // Helper function to purchase an NFT
  async function purchaseNFT(buyer, itemId, price) {
    try {
      const nftAddress = await nft.getAddress();
      
      // Create market sale
      const tx = await nftMarketplace.connect(buyer).createMarketSale(
        nftAddress,
        itemId,
        { value: price }
      );
      await tx.wait();
      return true;
    } catch (error) {
      console.error("Error purchasing NFT:", error);
      throw error;
    }
  }

  describe("fetchMyNFTs function", function() {
    it("should fetch user's NFTs correctly - both selling and purchased", async function () {
      try {
        // Step 1: Owner creates and lists an NFT for sale
        const tokenId1 = await createNFT(owner, "https://www.mytokenlocation1.com");
        const itemId1 = await listNFT(owner, tokenId1, auctionPrice);
  
        // Step 2: addr1 purchases the NFT
        await purchaseNFT(addr1, itemId1, auctionPrice);
  
        // Step 3: Owner creates and lists another NFT
        const tokenId2 = await createNFT(owner, "https://www.mytokenlocation2.com");
        const itemId2 = await listNFT(owner, tokenId2, auctionPrice);
  
        // Step 4: Verify fetchMyNFTs for owner (should have 1 NFT listed for sale)
        const ownerNFTs = await nftMarketplace.connect(owner).fetchMyNFTs();
        
        expect(ownerNFTs.length).to.equal(1);
        expect(Number(ownerNFTs[0].tokenId)).to.equal(Number(tokenId2));
        expect(ownerNFTs[0].seller).to.equal(owner.address);
        expect(ownerNFTs[0].sold).to.equal(false);
  
        // Step 5: Verify fetchMyNFTs for addr1 (should have 1 NFT purchased)
        const addr1NFTs = await nftMarketplace.connect(addr1).fetchMyNFTs();
        
        expect(addr1NFTs.length).to.equal(1);
        expect(Number(addr1NFTs[0].tokenId)).to.equal(Number(tokenId1));
        expect(addr1NFTs[0].owner).to.equal(addr1.address);
        expect(addr1NFTs[0].sold).to.equal(true);
      } catch (error) {
        console.error("Test error:", error);
        throw error;
      }
    });

    it("should correctly return both NFTs a user is selling and has purchased", async function() {
      try {
        // Create an NFT by addr1
        const tokenId1 = await createNFT(addr1, "https://www.mytokenlocation1.com");
        const itemId1 = await listNFT(addr1, tokenId1, auctionPrice);
        
        // Owner buys addr1's NFT
        await purchaseNFT(owner, itemId1, auctionPrice);
        
        // Owner creates and lists their own NFT
        const tokenId2 = await createNFT(owner, "https://www.mytokenlocation2.com");
        const itemId2 = await listNFT(owner, tokenId2, auctionPrice);
        
        // addr1 creates and lists another NFT
        const tokenId3 = await createNFT(addr1, "https://www.mytokenlocation3.com");
        const itemId3 = await listNFT(addr1, tokenId3, auctionPrice);
        
        // addr1 buys owner's NFT
        await purchaseNFT(addr1, itemId2, auctionPrice);
        
        // Now addr1 should have:
        // 1. One NFT they're selling (tokenId3)
        // 2. One NFT they've purchased (tokenId2)
        const addr1NFTs = await nftMarketplace.connect(addr1).fetchMyNFTs();
        
        expect(addr1NFTs.length).to.equal(2);
        
        // Find the purchased NFT
        const purchasedNFT = addr1NFTs.find(nft => nft.sold === true);
        expect(purchasedNFT).to.not.be.undefined;
        expect(Number(purchasedNFT.tokenId)).to.equal(Number(tokenId2));
        expect(purchasedNFT.owner).to.equal(addr1.address);
        
        // Find the NFT for sale
        const sellingNFT = addr1NFTs.find(nft => nft.sold === false);
        expect(sellingNFT).to.not.be.undefined;
        expect(Number(sellingNFT.tokenId)).to.equal(Number(tokenId3));
        expect(sellingNFT.seller).to.equal(addr1.address);
      } catch (error) {
        console.error("Test error:", error);
        throw error;
      }
    });

    it("should return empty array when user has no NFTs", async function() {
      // User with no NFTs should get an empty array
      const emptyNFTs = await nftMarketplace.connect(addr3).fetchMyNFTs();
      expect(emptyNFTs.length).to.equal(0);
    });

    it("should handle multiple NFTs in different states", async function() {
      try {
        // Create multiple NFTs with different owners and states
        
        // addr1 creates and lists 3 NFTs
        const tokenId1 = await createNFT(addr1, "https://www.mytokenlocation1.com");
        const itemId1 = await listNFT(addr1, tokenId1, auctionPrice);
        
        const tokenId2 = await createNFT(addr1, "https://www.mytokenlocation2.com");
        const itemId2 = await listNFT(addr1, tokenId2, auctionPrice);
        
        const tokenId3 = await createNFT(addr1, "https://www.mytokenlocation3.com");
        const itemId3 = await listNFT(addr1, tokenId3, auctionPrice);
        
        // owner buys one of addr1's NFTs
        await purchaseNFT(owner, itemId1, auctionPrice);
        
        // addr2 buys another of addr1's NFTs
        await purchaseNFT(addr2, itemId2, auctionPrice);
        
        // addr1 creates and lists one more NFT
        const tokenId4 = await createNFT(addr1, "https://www.mytokenlocation4.com");
        const itemId4 = await listNFT(addr1, tokenId4, auctionPrice);
        
        // owner creates and lists an NFT
        const tokenId5 = await createNFT(owner, "https://www.mytokenlocation5.com");
        const itemId5 = await listNFT(owner, tokenId5, auctionPrice);
        
        // addr1 buys owner's NFT
        await purchaseNFT(addr1, itemId5, auctionPrice);
        
        // Check addr1's NFTs - should have 2 for sale and 1 purchased
        const addr1NFTs = await nftMarketplace.connect(addr1).fetchMyNFTs();
        
        expect(addr1NFTs.length).to.equal(3);
        
        const sellingNFTs = addr1NFTs.filter(nft => nft.sold === false);
        const purchasedNFTs = addr1NFTs.filter(nft => nft.sold === true);
        
        expect(sellingNFTs.length).to.equal(2);
        expect(purchasedNFTs.length).to.equal(1);
        
        // Verify one of the NFTs for sale is tokenId3
        const hasTokenId3 = sellingNFTs.some(nft => Number(nft.tokenId) === Number(tokenId3));
        expect(hasTokenId3).to.be.true;
        
        // Verify one of the NFTs for sale is tokenId4
        const hasTokenId4 = sellingNFTs.some(nft => Number(nft.tokenId) === Number(tokenId4));
        expect(hasTokenId4).to.be.true;
        
        // Verify the purchased NFT is tokenId5
        expect(Number(purchasedNFTs[0].tokenId)).to.equal(Number(tokenId5));
        expect(purchasedNFTs[0].owner).to.equal(addr1.address);
      } catch (error) {
        console.error("Test error:", error);
        throw error;
      }
    });
  });
});

