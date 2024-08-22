// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {Ownable} from "solady/src/auth/Ownable.sol";

import {NFTFactory} from "./factories/NFTFactory.sol";
import {NFT} from "./NFT.sol";

error OnlyFactory();
error ZeroAddressPasted();
error IncorrectInstanceId();

contract StorageContract is Ownable {
    event FactorySet(NFTFactory newFactory);
    event InstanceAdded(NFT newInstance);

    struct InstanceInfo {
        string name;
        string symbol;
        address creator;
    }

    NFTFactory public factory; // The current factory address

    NFT[] public instances; // The array of all instances
    mapping(bytes32 => NFT) public instancesByName; // keccak256("name", "symbol") => instance address
    mapping(NFT => InstanceInfo) public instanceInfos; // Instance address => InstanceInfo

    constructor() {
        _initializeOwner(msg.sender);
    }

    /**
     * @dev Returns instance info
     * @param instanceId Instance ID
     */
    function getInstanceInfo(
        uint256 instanceId
    ) external view returns (InstanceInfo memory) {
        if (instanceId >= instances.length) {
            revert IncorrectInstanceId();
        }

        return instanceInfos[instances[instanceId]];
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
     * @notice Adds new instance
     * @dev Can be called only by factory contract
     * @param instanceAddress New instance address
     * @param creator New instance creator
     * @param name New instance name
     * @param symbol New instance symbol
     */
    function addInstance(
        NFT instanceAddress,
        address creator,
        string memory name,
        string memory symbol
    ) external returns (uint256) {
        if (msg.sender != address(factory)) {
            revert OnlyFactory();
        }

        instancesByName[
            keccak256(abi.encodePacked(name, symbol))
        ] = instanceAddress;
        instances.push(instanceAddress);
        instanceInfos[instanceAddress] = InstanceInfo(name, symbol, creator);

        emit InstanceAdded(instanceAddress);
        return instances.length;
    }
}
