// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.27;

/// @title MockTransferValidator
/// @notice Test helper that conditionally reverts on `validateTransfer` based on an internal switch.
contract MockTransferValidator {
    bool internal switcher;

    constructor(bool _switcher) {
        switcher = _switcher;
    }

    /// @notice Toggles the validator on/off behavior.
    /// @param _switcher True to allow transfers; false to revert.
    function setSwitcher(bool _switcher) external {
        switcher = _switcher;
    }

    /// @notice Validates a transfer; reverts when `switcher` is false.
    function validateTransfer(
        address,
        /* caller */
        address,
        /* from */
        address,
        /* to */
        uint256 /* tokenId */
    )
        external
        view
    {
        if (!switcher) {
            revert("MockTransferValidator: always reverts");
        }
    }

    /// @notice No-op token type setter for interface compatibility in tests.
    function setTokenTypeOfCollection(address, uint16) external {}
}

/// @title MockTransferValidatorV2
/// @notice Minimal mock exposing `validateTransfer` without token-type setter.
contract MockTransferValidatorV2 {
    bool internal switcher;

    constructor(bool _switcher) {
        switcher = _switcher;
    }

    /// @notice Toggles the validator on/off behavior.
    /// @param _switcher True to allow transfers; false to revert.
    function setSwitcher(bool _switcher) external {
        switcher = _switcher;
    }

    /// @notice Validates a transfer; reverts when `switcher` is false.
    function validateTransfer(
        address,
        /* caller */
        address,
        /* from */
        address,
        /* to */
        uint256 /* tokenId */
    )
        external
        view
    {
        if (!switcher) {
            revert("MockTransferValidator: always reverts");
        }
    }
}
