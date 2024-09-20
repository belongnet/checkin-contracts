// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import {RoyaltiesReceiver} from "../RoyaltiesReceiver.sol";

error RoyaltiesReceiverCreationFailed();

/// @title Receiver Factory Contract
/// @notice A factory contract for creating instances of the RoyaltiesReceiver contract
/// @dev This contract deploys new instances of RoyaltiesReceiver and assigns payees and shares
contract ReceiverFactory {
    /// @notice Emitted when a new RoyaltiesReceiver contract is created
    /// @param creator The address that deployed the new receiver
    /// @param royaltiesReceiver The address of the newly created RoyaltiesReceiver contract
    /// @param payees The list of payees in the RoyaltiesReceiver
    /// @param shares The list of shares corresponding to each payee
    event ReceiverCreated(
        address indexed creator,
        RoyaltiesReceiver royaltiesReceiver,
        address[] payees,
        uint256[] shares
    );

    /**
     * @notice Deploys a new RoyaltiesReceiver contract
     * @dev Creates an instance of `RoyaltiesReceiver` where each account in `payees` is assigned the number of shares
     * at the corresponding position in the `shares` array.
     *
     * Requirements:
     * - All addresses in `payees` must be non-zero.
     * - Both arrays (`payees` and `shares`) must have the same non-zero length.
     * - There must be no duplicate addresses in `payees`.
     *
     * @param payees The array of addresses to receive royalties
     * @param shares The array of shares corresponding to each payee
     * @return royaltiesReceiver The address of the newly deployed RoyaltiesReceiver contract
     */
    function deployReceiver(
        address[] calldata payees,
        uint256[] calldata shares
    ) external returns (RoyaltiesReceiver royaltiesReceiver) {
        royaltiesReceiver = new RoyaltiesReceiver(payees, shares);

        emit ReceiverCreated(msg.sender, royaltiesReceiver, payees, shares);
    }
}
