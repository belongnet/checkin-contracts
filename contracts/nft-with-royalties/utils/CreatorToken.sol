// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {ITransferValidator721} from "../interfaces/ITransferValidator721.sol";

/// @notice Revert with an error if the transfer validator is being set to the same address.
error SetTransferValidatorError();
error ZeroAddressPasted();

/**
 * @title  CreatorToken
 * @notice Functionality to use a transfer validator.
 */
abstract contract CreatorToken {
    event TransferValidatorUpdated(
        ITransferValidator721 oldValidator,
        ITransferValidator721 newValidator
    );
    event CanNotSetTokenTypeOfCollection();

    /// @dev Store the transfer validator. The null address means no transfer validator is set.
    ITransferValidator721 internal _transferValidator;

    /// @notice Returns the currently active transfer validator.
    ///         The null address means no transfer validator is set.
    function getTransferValidator()
        external
        view
        returns (ITransferValidator721)
    {
        return _transferValidator;
    }

    /**
     * @notice Returns the transfer validation function used.
     */
    function getTransferValidationFunction()
        external
        pure
        returns (bytes4 functionSignature, bool isViewFunction)
    {
        functionSignature = ITransferValidator721.validateTransfer.selector;
        isViewFunction = true;
    }

    /// @notice Set the transfer validator.
    ///         The external method that uses this must include access control.
    function _setTransferValidator(
        ITransferValidator721 newValidator
    ) internal {
        ITransferValidator721 oldValidator = _transferValidator;

        if (oldValidator == newValidator) {
            revert SetTransferValidatorError();
        }

        _transferValidator = newValidator;

        if (address(newValidator) != address(0)) {
            if (address(newValidator).code.length > 0) {
                try
                    newValidator.setTokenTypeOfCollection(
                        address(this),
                        uint16(721)
                    )
                {} catch {
                    emit CanNotSetTokenTypeOfCollection();
                }
            }
        }

        emit TransferValidatorUpdated(oldValidator, newValidator);
    }

    function _validateTansfer(
        address caller,
        address from,
        address to,
        uint256 tokenId
    ) internal {
        // Call the transfer validator if one is set.
        address transferValidator = address(_transferValidator);
        if (transferValidator != address(0)) {
            if (msg.sender == transferValidator) {
                return;
            }

            _transferValidator.validateTransfer(caller, from, to, tokenId);
        }
    }
}
