// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import {RoyaltiesReceiver} from "../RoyaltiesReceiver.sol";

error InstanceEqZero();

contract ReceiverFactory {
    event ReceiverCreated(
        address indexed creator,
        address instance,
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
    ) external returns (address) {
        RoyaltiesReceiver instance = new RoyaltiesReceiver();
        if (address(instance) == address(0)) {
            revert InstanceEqZero();
        }

        instance.initialize(payees, shares);

        emit ReceiverCreated(msg.sender, address(instance), payees, shares);

        return address(instance);
    }
}
