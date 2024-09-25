// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

/**
 * @title PricePointParameters
 * @notice A struct that contains all the parameters needed to create an PricePoint collection.
 * @dev This struct is used to pass parameters between contracts.
 */
struct PricePointParameters {
    /// @notice The detailed information about the NFT collection.
    PricePointInfo info;
    /// @notice The platform address associated with the collection.
    address platform;
}

/**
 * @title PricePointInfo
 * @notice A struct that holds detailed information about an individual PricePoint collection.
 */
struct PricePointInfo {
    /// @notice The address of the price point user.
    address user;
    /// @notice The name of the NFT collection.
    string name;
    /// @notice The symbol of the NFT collection.
    string symbol;
    /// @notice The contract URI for the NFT collection, used for metadata.
    string contractURI;
    /// @notice The address of the ERC20 token used for payments, or ETH (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) for Ether.
    address paymentCurrency;
    /// @notice A flag indicating whether the tokens in the collection are transferable.
    bool transferable;
    /// @notice A signature provided by the backend for validation.
    bytes signature;
}
