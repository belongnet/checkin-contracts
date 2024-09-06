// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {Ownable} from "solady/src/auth/Ownable.sol";

import {NFTFactory} from "./factories/NFTFactory.sol";
import {NFT} from "./NFT.sol";

error OnlyFactory();
error ZeroAddressPasted();
error IncorrectNFTId();

struct InstanceInfo {
    string name;
    string symbol;
    address creator;
}

contract StorageContract is Ownable {
    event FactorySet(NFTFactory newFactory);
    event InstanceAdded(NFT newInstance);

    NFTFactory public factory; // The current factory address

    NFT[] public instances; // The array of all NFTs
    mapping(bytes32 => NFT) public instancesByName; // keccak256("name", "symbol") => NFT address
    mapping(NFT => InstanceInfo) public instanceInfos; // NFT address => InstanceInfo

    constructor() {
        _initializeOwner(msg.sender);
    }

    /**
     * @dev Returns NFT's info
     * @param nftId NFT ID
     */
    function getInstanceInfo(
        uint256 nftId
    ) external view returns (InstanceInfo memory instanceInfo) {
        if (nftId >= instances.length) {
            revert IncorrectNFTId();
        }

        instanceInfo = instanceInfos[instances[nftId]];
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

        instancesByName[keccak256(abi.encodePacked(name, symbol))] = nft;
        instances.push(nft);
        instanceInfos[nft] = InstanceInfo(name, symbol, creator);

        emit InstanceAdded(nft);
        return instances.length;
    }
}
