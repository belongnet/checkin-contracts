// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/**
 * @title AutoValidatorTransferApprove
 * @notice Base contract mix-in that provides functionality to automatically approve a 721-C transfer validator implementation for transfers.
 * @dev This contract allows the contract owner to set an automatic approval flag for transfer validators.
 */
abstract contract AutoValidatorTransferApprove {
    /// @notice Emitted when the automatic approval flag is modified by the creator.
    /// @param autoApproved The new value of the automatic approval flag.
    event AutomaticApprovalOfTransferValidatorSet(bool autoApproved);

    /// @notice If true, the collection's transfer validator is automatically approved to transfer token holders' tokens.
    bool public autoApproveTransfersFromValidator;

    /**
     * @notice Sets whether the transfer validator is automatically approved as an operator for all token owners.
     * @dev This function can only be called by the contract owner and modifies the automatic approval flag.
     * @param autoApprove If true, the collection's transfer validator will be automatically approved to transfer token holders' tokens.
     */
    function _setAutomaticApprovalOfTransfersFromValidator(
        bool autoApprove
    ) internal {
        autoApproveTransfersFromValidator = autoApprove;
        emit AutomaticApprovalOfTransferValidatorSet(autoApprove);
    }
}
