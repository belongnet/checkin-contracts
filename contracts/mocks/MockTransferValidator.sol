// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.25;

contract MockTransferValidator {
    bool internal switcher;

    constructor(bool _switcher) {
        switcher = _switcher;
    }

    function setSwitcher(bool _switcher) external {
        switcher = _switcher;
    }

    function validateTransfer(
        address,
        /* caller */
        address,
        /* from */
        address,
        /* to */
        uint256 /* tokenId */
    ) external view {
        if (!switcher) {
            revert("MockTransferValidator: always reverts");
        }
    }
}
