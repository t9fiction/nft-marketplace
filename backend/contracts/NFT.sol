// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "hardhat/console.sol";

library NFT__Errors {
    error OnlyOwner();
}

contract NFT is ERC721URIStorage {
    uint256 private _tokenId;
    address immutable CONTRACT_ADDRESS;

    event MarketItemCreated(uint256 indexed tokenId, address indexed minter);

    constructor(address marketPlace) ERC721("Numeric Sins", "SINS") {
        CONTRACT_ADDRESS = marketPlace;
        _tokenId = 0;
    }

    function createToken(string memory tokenURI) public returns (uint256) {
        _tokenId++;
        uint256 newTokenId = _tokenId;

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        setApprovalForAll(CONTRACT_ADDRESS, true);

        emit MarketItemCreated(newTokenId, msg.sender);
        return newTokenId;
    }

    function getTokenId() public view returns (uint256) {
        return _tokenId;
    }

    function getContractAddress() public view returns (address) {
        return CONTRACT_ADDRESS;
    }

    // function getTokenURI(uint256 tokenId) public view returns (string memory) {
    //     return tokenURI(tokenId);
    // }

    // function getTokenOwner(uint256 tokenId) public view returns (address) {
    //     return ownerOf(tokenId);
    // }
}
