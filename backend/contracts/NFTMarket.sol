// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "hardhat/console.sol";

library NFTMarketplace__Errors {
    error OnlyOwner();
    error InvalidPrice();
    error IncorrectListingPrice();
    error NotItemOwner();
    error IncorrectPurchasePrice();
    error ItemNotForSale();
    error InvalidItemId();
}

contract NFTMarketplace is ReentrancyGuard {
    uint256 private _itemIds;
    uint256 private _itemsSold;
    uint256 public listingPrice = 0.025 ether;
    address payable public owner;

    struct MarketItem {
        uint256 itemId;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
    }

    mapping(uint256 => MarketItem) private idToMarketItem;

    event MarketItemCreated(
        uint256 indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price,
        bool sold
    );

    event MarketItemSold(
        uint256 indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price
    );

    constructor() {
        owner = payable(msg.sender);
        _itemIds = 0;
    }

    function getListingPrice() public view returns (uint256) {
        return listingPrice;
    }

    function updateListingPrice(uint256 _listingPrice) public {
        if (owner != msg.sender) revert NFTMarketplace__Errors.OnlyOwner();
        listingPrice = _listingPrice;
    }

    function createMarketItem(address _nftContract, uint256 _tokenId, uint256 _price) public payable nonReentrant {
        if (_price <= 0) revert NFTMarketplace__Errors.InvalidPrice();
        if (msg.value != listingPrice) revert NFTMarketplace__Errors.IncorrectListingPrice();

        _itemIds++;
        uint256 itemId = _itemIds;

        // owner is set to address(0) since the item is up for sale
        idToMarketItem[itemId] =
            MarketItem(itemId, _nftContract, _tokenId, payable(msg.sender), payable(address(0)), _price, false);

        IERC721(_nftContract).transferFrom(msg.sender, address(this), _tokenId);

        emit MarketItemCreated(itemId, _nftContract, _tokenId, msg.sender, address(this), _price, false);
    }

    function createMarketSale(address _nftContract, uint256 _itemId) public payable nonReentrant {
        if (_itemId == 0 || _itemId > _itemIds) revert NFTMarketplace__Errors.InvalidItemId();
        
        MarketItem storage item = idToMarketItem[_itemId];
        
        if (item.sold) revert NFTMarketplace__Errors.ItemNotForSale();
        if (msg.value != item.price) revert NFTMarketplace__Errors.IncorrectPurchasePrice();

        uint256 price = item.price;
        uint256 tokenId = item.tokenId;
        address payable seller = item.seller;

        // Update the item
        item.owner = payable(msg.sender);
        item.sold = true;
        item.seller = payable(address(0));
        _itemsSold++;

        // Transfer NFT to buyer
        IERC721(_nftContract).transferFrom(address(this), msg.sender, tokenId);
        
        // Transfer listing fee to marketplace owner
        payable(owner).transfer(listingPrice);
        
        // Transfer sale amount to seller
        payable(seller).transfer(price);

        emit MarketItemSold(_itemId, _nftContract, tokenId, seller, msg.sender, price);
    }

    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint256 itemCount = _itemIds;
        uint256 unsoldItemCount = _itemIds - _itemsSold;
        uint256 currentIndex = 0;

        MarketItem[] memory items = new MarketItem[](unsoldItemCount);
        for (uint256 i = 1; i <= itemCount; i++) {
            if (idToMarketItem[i].owner == address(0) && !idToMarketItem[i].sold) {
                items[currentIndex] = idToMarketItem[i];
                currentIndex++;
            }
        }
        return items;
    }

    // Fetch NFTs owned by the caller (purchased items)
    function fetchMyNFTs() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _itemIds;
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        // First pass: count items owned by caller
        for (uint256 i = 1; i <= totalItemCount; i++) {
            if (idToMarketItem[i].owner == msg.sender) {
                itemCount++;
            }
        }

        // Second pass: populate array
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 1; i <= totalItemCount; i++) {
            if (idToMarketItem[i].owner == msg.sender) {
                items[currentIndex] = idToMarketItem[i];
                currentIndex++;
            }
        }
        return items;
    }

    // Fetch items listed by the caller (items they're selling)
    function fetchItemsListed() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _itemIds;
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        // First pass: count items listed by caller
        for (uint256 i = 1; i <= totalItemCount; i++) {
            if (idToMarketItem[i].seller == msg.sender && !idToMarketItem[i].sold) {
                itemCount++;
            }
        }

        // Second pass: populate array
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 1; i <= totalItemCount; i++) {
            if (idToMarketItem[i].seller == msg.sender && !idToMarketItem[i].sold) {
                items[currentIndex] = idToMarketItem[i];
                currentIndex++;
            }
        }
        return items;
    }

    // Gas-efficient function to get owned NFTs count
    function getMyNFTsCount() public view returns (uint256) {
        uint256 totalItemCount = _itemIds;
        uint256 itemCount = 0;

        for (uint256 i = 1; i <= totalItemCount; i++) {
            if (idToMarketItem[i].owner == msg.sender) {
                itemCount++;
            }
        }
        return itemCount;
    }

    // Gas-efficient function to get listed items count
    function getMyListedItemsCount() public view returns (uint256) {
        uint256 totalItemCount = _itemIds;
        uint256 itemCount = 0;

        for (uint256 i = 1; i <= totalItemCount; i++) {
            if (idToMarketItem[i].seller == msg.sender && !idToMarketItem[i].sold) {
                itemCount++;
            }
        }
        return itemCount;
    }

    // Get total items count
    function getTotalItemsCount() public view returns (uint256) {
        return _itemIds;
    }

    // Get sold items count
    function getSoldItemsCount() public view returns (uint256) {
        return _itemsSold;
    }

    // Get unsold items count
    function getUnsoldItemsCount() public view returns (uint256) {
        return _itemIds - _itemsSold;
    }
}