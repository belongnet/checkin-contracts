// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ITransferValidator721} from "../interfaces/ITransferValidator721.sol";

/// @notice Thrown when attempting to set a zero address as the transfer validator.
/// @dev This error prevents setting an invalid address.
error ZeroAddressPassed();

/**
 * @title CreatorToken
 * @notice Contract that enables the use of a transfer validator to validate token transfers.
 * @dev The contract stores a reference to the transfer validator and provides functionality for setting and using it.
 */
abstract contract CreatorToken {
    /// @notice Emitted when the transfer validator is updated.
    /// @param newValidator The new transfer validator address.
    event TransferValidatorUpdated(address newValidator);

    /// @notice Emitted when the collection's token type cannot be set by the transfer validator.
    event TokenTypeOfCollectionSet(bool isSet);

    uint16 internal constant ERC721_TOKEN_TYPE = 721;

    /// @dev The current transfer validator. The null address indicates no validator is set.
    address internal _transferValidator;

    /**
     * @notice Returns the currently active transfer validator.
     * @dev If the return value is the null address, no transfer validator is set.
     * @return The address of the currently active transfer validator.
     */
    function getTransferValidator()
        external
        view
        returns (ITransferValidator721)
    {
        return ITransferValidator721(_transferValidator);
    }

    /**
     * @notice Returns the transfer validation function and whether it is a view function.
     * @dev This returns the function selector of `validateTransfer` from the `ITransferValidator721` interface.
     * @return functionSignature The selector of the transfer validation function.
     * @return isViewFunction True if the transfer validation function is a view function.
     */
    function getTransferValidationFunction()
        external
        pure
        returns (bytes4 functionSignature, bool isViewFunction)
    {
        functionSignature = ITransferValidator721.validateTransfer.selector;
        isViewFunction = true;
    }

    /**
     * @notice Sets a new transfer validator.
     * @dev The external method calling this function must include access control, such as onlyOwner.
     * @param _newValidator The address of the new transfer validator contract.
     */
    function _setTransferValidator(address _newValidator) internal {
        _transferValidator = _newValidator;

        // Attempt to set the token type for the collection, if the new validator is not a null address.
        if (_newValidator != address(0) && _newValidator.code.length > 0) {
            try
                ITransferValidator721(_newValidator).setTokenTypeOfCollection(
                    address(this),
                    ERC721_TOKEN_TYPE
                )
            {
                emit TokenTypeOfCollectionSet(true);
            } catch {
                emit TokenTypeOfCollectionSet(false);
            }
        }

        emit TransferValidatorUpdated(_newValidator);
    }

    /**
     * @notice Validates a transfer using the transfer validator, if one is set.
     * @dev If no transfer validator is set or the caller is the transfer validator, no validation occurs.
     * @param caller The address initiating the transfer.
     * @param from The address transferring the token.
     * @param to The address receiving the token.
     * @param tokenId The ID of the token being transferred.
     */
    function _validateTransfer(
        address caller,
        address from,
        address to,
        uint256 tokenId
    ) internal {
        // Call the transfer validator if one is set.
        address transferValidator = _transferValidator;
        if (transferValidator != address(0)) {
            if (msg.sender == transferValidator) {
                return;
            }

            ITransferValidator721(transferValidator).validateTransfer(
                caller,
                from,
                to,
                tokenId
            );
        }
    }
}
