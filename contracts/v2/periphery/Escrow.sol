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

    struct VenueDeposits {
        uint256 usdcDeposits;
        uint256 longDeposits;
    }

    TapAndEarn public tapAndEarn;
    mapping(address venue => VenueDeposits deposits) public venueDeposits;

    modifier onlyTapEarn() {
        require(msg.sender == address(tapAndEarn), NotTapAndEarn());
        _;
    }

    function venueDeposit(
        address venue,
        uint256 depositedUSDCs,
        uint256 depositedLONGs
    ) external onlyTapEarn {
        venueDeposits[venue] = VenueDeposits({
            usdcDeposits: depositedUSDCs,
            longDeposits: depositedLONGs
        });
        // TODO: emit
    }

    function distributeLONGDiscount(
        address venue,
        uint256 amount
    ) external onlyTapEarn {
        uint256 longDeposits = venueDeposits[venue].longDeposits;
        require(longDeposits >= amount, NotEnoughLONGs(longDeposits, amount));

        unchecked {
            longDeposits -= amount;
        }
        venueDeposits[venue].longDeposits = longDeposits;

        tapAndEarn.paymentsInfo().long.safeTransfer(venue, amount);
        // TODO: emit
    }

    function distributeVenueDeposit(
        address venue,
        address to,
        uint256 amount
    ) external onlyTapEarn {
        uint256 usdcDeposits = venueDeposits[venue].usdcDeposits;
        require(amount <= usdcDeposits, NotEnoughFunds());

        unchecked {
            usdcDeposits -= amount;
        }

        venueDeposits[venue].usdcDeposits = usdcDeposits;

        tapAndEarn.paymentsInfo().usdc.safeTransfer(promoter, amount);
        // TODO: emit
    }
}
