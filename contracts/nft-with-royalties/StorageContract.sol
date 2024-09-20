// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {Ownable} from "solady/src/auth/Ownable.sol";
import {NFTFactory} from "./factories/NFTFactory.sol";
import {NFT} from "./NFT.sol";
import {StorageInstanceInfo} from "./Structures.sol";

/// @notice Error thrown when the caller is not the factory contract.
error OnlyFactory();

/// @notice Error thrown when a zero address is provided.
error ZeroAddressPasted();

/// @notice Error thrown when an incorrect instance ID is provided.
error IncorrectInstanceId();

/**
 * @title StorageContract
 * @notice A contract to store and manage instances of NFTs created by a factory.
 * @dev This contract holds information about all NFT instances and allows only the factory to add new instances.
 */
contract StorageContract is Ownable {
    /// @notice Emitted when a new factory is set.
    /// @param newFactory The address of the newly set factory.
    event FactorySet(NFTFactory newFactory);

    /// @notice Emitted when a new NFT instance is added.
    /// @param newInstance The address of the newly added NFT instance.
    event InstanceAdded(NFT newInstance);

    /// @notice The current NFT factory contract address.
    NFTFactory public factory;

    /// @notice An array storing all created NFT instances.
    NFT[] public instances;

    /// @notice A mapping from keccak256(name, symbol) to the NFT instance address.
    mapping(bytes32 => NFT) public getInstance;

    /// @notice A mapping from NFT instance address to its storage information.
    mapping(NFT => StorageInstanceInfo) public instanceInfos;

    /**
     * @dev Initializes the contract and sets the contract deployer as the owner.
     */
    constructor() {
        _initializeOwner(msg.sender);
    }

    /**
     * @notice Retrieves information about a specific NFT instance.
     * @param instanceId The ID of the NFT instance.
     * @return instanceInfo The information about the specified instance.
     * @dev Reverts with `IncorrectInstanceId` if the provided ID is invalid.
     */
    function getInstanceInfo(
        uint256 instanceId
    ) external view returns (StorageInstanceInfo memory instanceInfo) {
        if (instanceId >= instances.length) {
            revert IncorrectInstanceId();
        }

        instanceInfo = instanceInfos[instances[instanceId]];
    }

    /**
     * @notice Returns the total count of NFT instances stored in the contract.
     * @return The number of NFT instances.
     */
    function instancesCount() external view returns (uint256) {
        return instances.length;
    }

    /**
     * @notice Sets a new factory contract address.
     * @dev Can only be called by the contract owner.
     * @param _factory The new factory contract address.
     */
    function setFactory(NFTFactory _factory) external onlyOwner {
        if (address(_factory) == address(0)) {
            revert ZeroAddressPasted();
        }

        factory = _factory;
        emit FactorySet(_factory);
    }

    /**
     * @notice Adds a new NFT instance to the storage.
     * @dev Can only be called by the factory contract.
     * @param nft The address of the new NFT instance.
     * @param creator The address of the creator of the new instance.
     * @param name The name of the new NFT collection.
     * @param symbol The symbol of the new NFT collection.
     * @return The total number of instances after adding the new one.
     */
    function addInstance(
        NFT nft,
        address creator,
        string memory name,
        string memory symbol
    ) external returns (uint256) {
        if (msg.sender != address(factory)) {
            revert OnlyFactory();
        }

        getInstance[keccak256(abi.encodePacked(name, symbol))] = nft;
        instances.push(nft);
        instanceInfos[nft] = StorageInstanceInfo(name, symbol, creator);

        emit InstanceAdded(nft);
        return instances.length;
    }
}
