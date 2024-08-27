// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {Ownable} from "solady/src/auth/Ownable.sol";

import {NFTFactory} from "./factories/NFTFactory.sol";
import {NFT} from "./NFT.sol";

error OnlyFactory();
error ZeroAddressPasted();
error IncorrectNFTId();

contract StorageContract is Ownable {
    event FactorySet(NFTFactory newFactory);
    event NFTAdded(NFT newNFT);

    struct NFTInfo {
        string name;
        string symbol;
        address creator;
    }

    NFTFactory public factory; // The current factory address

    NFT[] public nfts; // The array of all NFTs
    mapping(bytes32 => NFT) public nftByName; // keccak256("name", "symbol") => NFT address
    mapping(NFT => NFTInfo) public nftInfos; // NFT address => InstanceInfo

    constructor() {
        _initializeOwner(msg.sender);
    }

    /**
     * @dev Returns NFT's info
     * @param nftId NFT ID
     */
    function getNFTInfo(
        uint256 nftId
    ) external view returns (NFTInfo memory nftInfo) {
        if (nftId >= nfts.length) {
            revert IncorrectNFTId();
        }

        nftInfo = nftInfos[nfts[nftId]];
    }

    /**
     * @notice Sets new factory address
     * @dev Only owner can call it
     * @param _factory New factory address
     */
    function setFactory(NFTFactory _factory) external onlyOwner {
        if (address(_factory) == address(0)) {
            revert ZeroAddressPasted();
        }

        factory = _factory;
        emit FactorySet(_factory);
    }

    /**
     * @notice Adds new NFT instance
     * @dev Can be called only by factory contract
     * @param nft New NFT instance address
     * @param creator New instance creator
     * @param name New instance name
     * @param symbol New instance symbol
     */
    function addNFT(
        NFT nft,
        address creator,
        string memory name,
        string memory symbol
    ) external returns (uint256) {
        if (msg.sender != address(factory)) {
            revert OnlyFactory();
        }

        nftByName[keccak256(abi.encodePacked(name, symbol))] = nft;
        nfts.push(nft);
        nftInfos[nft] = NFTInfo(name, symbol, creator);

        emit NFTAdded(nft);
        return nfts.length;
    }
}
