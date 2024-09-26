// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

/// @title ITransferValidator721 Interface
/// @notice Interface for validating NFT transfers for ERC721 tokens
/// @dev This interface defines functions for validating transfers and managing token types
interface ITransferValidator721 {
    /// @notice Validates the transfer of a specific tokenId between addresses
    /// @dev Ensures that all transfer conditions are met before allowing the transfer
    /// @param caller The address that initiated the transfer
    /// @param from The address transferring the token
    /// @param to The address receiving the token
    /// @param tokenId The ID of the token being transferred
    function validateTransfer(
        address caller,
        address from,
        address to,
        uint256 tokenId
    ) external view;

    /// @notice Sets the token type for a specific collection
    /// @param collection The address of the token collection
    /// @param tokenType The token type to be assigned to the collection
    function setTokenTypeOfCollection(
        address collection,
        uint16 tokenType
    ) external;
}
