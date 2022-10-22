// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;


interface IStorageContract {

    struct InstanceInfo {
        string name;
        string symbol;
        address creator;
    }

    function addInstance(
        address instanceAddress,
        address creator,
        string memory name,
        string memory symbol
    ) external returns (uint256);
    function factory() view external returns(address);
    function getInstanceInfo() view external returns(InstanceInfo memory);
    function getInstance(bytes32 hash) view external returns(address);
    function instancesCount() external view returns (uint256);

}