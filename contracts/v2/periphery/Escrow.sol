// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

import {TapAndEarn} from "../platform/TapAndEarn.sol";
import {VenueInfo} from "../Structures.sol";

contract Escrow is Initializable, ERC4626, Ownable {
    using SafeTransferLib for address;

    error NotTapAndEarn();

    TapAndEarn public tapAndEarn;
    mapping(uint256 venueId => uint256 deposit) public venueDeposits;

    modifier onlyTapEarn() {
        require(msg.sender == address(tapAndEarn), NotTapAndEarn());
        _;
    }

    function saveVenueDeposit(
        uint256 venueId,
        uint256 deposited
    ) external onlyTapEarn {
        venueDeposits[venueId] = deposited;
        // TODO: emit
    }

    function distributeVenueDeposit(
        uint256 venueId,
        address to,
        uint256 amount
    ) external onlyTapEarn {
        uint256 deposited = venueDeposits[venue];
        require(amount <= deposited, NotEnoughFunds());

        unchecked {
            deposited -= amount;
        }

        venueDeposits[venue] = deposited;

        tapAndEarn.paymentsInfo().usdc.safeTransfer(promoter, amount);
        // TODO: emit
    }
}
