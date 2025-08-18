// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

import {TapAndEarn} from "../platform/TapAndEarn.sol";
import {VenueInfo} from "../Structures.sol";

/// @title TapAndEarn Escrow
/// @notice Custodies venue deposits in USDC and LONG, and disburses funds on instructions
///         from the TapAndEarn platform.
/// @dev
/// - Tracks per-venue balances for USDC and LONG.
/// - Only the TapAndEarn contract may call mutating methods via {onlyTapEarn}.
/// - Uses SafeTransferLib for robust ERC20 transfers.
/// - Designed for use behind an upgradeable proxy.
contract Escrow is Initializable, Ownable {
    using SafeTransferLib for address;

    // ============================== Errors ==============================

    /// @notice Reverts when a non-authorized caller attempts a TapAndEarn-only action.
    error NotTapAndEarn();

    /// @notice Reverts when a LONG disbursement exceeds the venue's LONG balance.
    /// @param longDeposits Current LONG balance on record.
    /// @param amount Requested LONG amount.
    error NotEnoughLONGs(uint256 longDeposits, uint256 amount);

    /// @notice Reverts when a USDC disbursement exceeds the venue's USDC balance.
    /// @param usdcDeposits Current USDC balance on record.
    /// @param amount Requested USDC amount.
    error NotEnoughUSDCs(uint256 usdcDeposits, uint256 amount);

    // ============================== Events ==============================

    /// @notice Emitted whenever a venue's escrow balances are updated.
    /// @param venue Venue address.
    /// @param usdcDeposits New USDC balance recorded for the venue.
    /// @param longDeposits New LONG balance recorded for the venue.
    event VenueDepositsUpdated(address indexed venue, uint256 usdcDeposits, uint256 longDeposits);

    /// @notice Emitted when LONG discount funds are disbursed to a venue.
    /// @param venue Venue receiving the LONG subsidy.
    /// @param amount Amount of LONG transferred.
    event DistributedLONGDiscount(address indexed venue, uint256 amount);

    /// @notice Emitted when USDC deposit funds are disbursed from a venue's balance.
    /// @param venue Venue whose USDC balance decreased.
    /// @param to Recipient of the USDC transfer.
    /// @param amount Amount of USDC transferred.
    event DistributedVenueDeposit(address indexed venue, address indexed to, uint256 amount);

    // ============================== Types ==============================

    /// @notice Per-venue escrowed amounts for USDC and LONG.
    struct VenueDeposits {
        uint256 usdcDeposits;
        uint256 longDeposits;
    }

    // ============================== Storage ==============================

    /// @notice TapAndEarn platform contract authorized to operate this escrow.
    TapAndEarn public tapAndEarn;

    /// @notice Mapping of per-venue deposits tracked by currency.
    mapping(address venue => VenueDeposits deposits) public venueDeposits;

    // ============================== Initialization ==============================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the escrow with its controlling TapAndEarn contract.
    /// @dev Must be called exactly once (initializer).
    /// @param _tapAndEarn Address of the TapAndEarn contract.
    function initialize(TapAndEarn _tapAndEarn) external initializer {
        tapAndEarn = _tapAndEarn;
    }

    // ============================== Modifiers ==============================

    /// @notice Restricts function to only be callable by the TapAndEarn contract.
    modifier onlyTapEarn() {
        require(msg.sender == address(tapAndEarn), NotTapAndEarn());
        _;
    }

    // ============================== Mutators (TapAndEarn Only) ==============================

    /// @notice Records/overwrites a venue's deposit balances after a deposit operation.
    /// @dev Called by TapAndEarn when new funds are received and routed to escrow.
    /// @param venue Venue whose balances are being updated.
    /// @param depositedUSDCs New USDC balance to record for `venue`.
    /// @param depositedLONGs New LONG balance to record for `venue`.
    function venueDeposit(address venue, uint256 depositedUSDCs, uint256 depositedLONGs) external onlyTapEarn {
        venueDeposits[venue] = VenueDeposits({usdcDeposits: depositedUSDCs, longDeposits: depositedLONGs});

        emit VenueDepositsUpdated(venue, depositedUSDCs, depositedLONGs);
    }

    /// @notice Disburses LONG discount funds from a venue's LONG balance to the venue.
    /// @dev Reverts if the venue does not have enough LONG recorded.
    /// @param venue Venue receiving the LONG transfer.
    /// @param amount Amount of LONG to transfer.
    function distributeLONGDiscount(address venue, uint256 amount) external onlyTapEarn {
        uint256 longDeposits = venueDeposits[venue].longDeposits;
        require(longDeposits >= amount, NotEnoughLONGs(longDeposits, amount));

        unchecked {
            longDeposits -= amount;
        }
        venueDeposits[venue].longDeposits = longDeposits;

        tapAndEarn.paymentsInfo().long.safeTransfer(venue, amount);

        emit VenueDepositsUpdated(venue, venueDeposits[venue].usdcDeposits, longDeposits);
        emit DistributedLONGDiscount(venue, amount);
    }

    /// @notice Disburses USDC funds from a venue's USDC balance to a recipient.
    /// @dev Reverts if the venue does not have enough USDC recorded.
    /// @param venue Venue whose USDC balance will decrease.
    /// @param to Recipient of the USDC transfer.
    /// @param amount Amount of USDC to transfer.
    function distributeVenueDeposit(address venue, address to, uint256 amount) external onlyTapEarn {
        uint256 usdcDeposits = venueDeposits[venue].usdcDeposits;
        require(amount <= usdcDeposits, NotEnoughUSDCs(usdcDeposits, amount));

        unchecked {
            usdcDeposits -= amount;
        }

        venueDeposits[venue].usdcDeposits = usdcDeposits;

        tapAndEarn.paymentsInfo().usdc.safeTransfer(to, amount);

        emit VenueDepositsUpdated(venue, usdcDeposits, venueDeposits[venue].longDeposits);
        emit DistributedVenueDeposit(venue, to, amount);
    }
}
