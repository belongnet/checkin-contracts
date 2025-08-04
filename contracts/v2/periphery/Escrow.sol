// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

import {TapAndEarn} from "../platform/TapAndEarn.sol";
import {VenueInfo} from "../Structures.sol";

contract Escrow is Initializable, Ownable {
    using SafeTransferLib for address;

    error NotTapAndEarn();
    error NotEnoughLONGs(uint256 longDeposits, uint256 amount);
    error NotEnoughUSDCs(uint256 usdcDeposits, uint256 amount);

    event VenueDepositsUpdated(
        address indexed venue,
        uint256 usdcDeposits,
        uint256 longDeposits
    );
    event DistributedLONGDiscount(address indexed venue, uint256 amount);
    event DistributedVenueDeposit(
        address indexed venue,
        address indexed to,
        uint256 amount
    );

    struct VenueDeposits {
        uint256 usdcDeposits;
        uint256 longDeposits;
    }

    TapAndEarn public tapAndEarn;
    mapping(address venue => VenueDeposits deposits) public venueDeposits;

    // ========== Functions ==========

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with NFT factory parameters and referral percentages.
     */
    function initialize(TapAndEarn _tapAndEarn) external initializer {
        tapAndEarn = _tapAndEarn;
    }

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

        emit VenueDepositsUpdated(venue, depositedUSDCs, depositedLONGs);
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

        emit VenueDepositsUpdated(
            venue,
            venueDeposits[venue].usdcDeposits,
            longDeposits
        );
        emit DistributedLONGDiscount(venue, amount);
    }

    function distributeVenueDeposit(
        address venue,
        address to,
        uint256 amount
    ) external onlyTapEarn {
        uint256 usdcDeposits = venueDeposits[venue].usdcDeposits;
        require(amount <= usdcDeposits, NotEnoughUSDCs(usdcDeposits, amount));

        unchecked {
            usdcDeposits -= amount;
        }

        venueDeposits[venue].usdcDeposits = usdcDeposits;

        tapAndEarn.paymentsInfo().usdc.safeTransfer(to, amount);

        emit VenueDepositsUpdated(
            venue,
            usdcDeposits,
            venueDeposits[venue].longDeposits
        );
        emit DistributedVenueDeposit(venue, to, amount);
    }
}
