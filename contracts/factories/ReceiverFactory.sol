// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import {RoyaltiesReceiver} from "../RoyaltiesReceiver.sol";

error RoyaltiesReceiverCreationError();

contract ReceiverFactory {
    event ReceiverCreated(
        address indexed creator,
        RoyaltiesReceiver royaltiesReceiver,
        address[] payees,
        uint256[] shares
    );

    /**
     * @dev Creates an instance of `RoyaltiesReceiver` where each account in `payees` is assigned the number of shares at
     * the matching position in the `shares` array.
     *
     * All addresses in `payees` must be non-zero. Both arrays must have the same non-zero length, and there must be no
     * duplicates in `payees`.
     */
    function deployReceiver(
        address[] calldata payees,
        uint256[] calldata shares
    ) external returns (RoyaltiesReceiver royaltiesReceiver) {
        royaltiesReceiver = new RoyaltiesReceiver();
        if (address(royaltiesReceiver) == address(0)) {
            revert RoyaltiesReceiverCreationError();
        }

        royaltiesReceiver.initialize(payees, shares);

        emit ReceiverCreated(msg.sender, royaltiesReceiver, payees, shares);
    }
}
