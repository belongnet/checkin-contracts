// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

interface ITransferValidator721 {
    /// @notice Ensure that a transfer has been authorized for a specific tokenId
    function validateTransfer(
        address caller,
        address from,
        address to,
        uint256 tokenId
    ) external view;

    function setTokenTypeOfCollection(
        address collection,
        uint16 tokenType
    ) external;
}
