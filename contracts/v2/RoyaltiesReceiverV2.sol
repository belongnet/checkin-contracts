// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

import {NFTFactoryV2} from "./factories/NFTFactoryV2.sol";
import {Releases} from "../Structures.sol";

/// @notice Thrown when an account is not due for payment.
error AccountNotDuePayment(address account);

/// @notice Thrown when transfer is not to a payee.
error OnlyToPayee();

/**
 * @title RoyaltiesReceiver
 * @notice A contract for managing and releasing royalty payments in both native Ether and ERC20 tokens.
 * @dev Handles payment distribution based on shares assigned to payees. Fork of OZ's PaymentSplitter with some changes.
 * The only change is that common `release()` functions are replaced with `releaseAll()` functions,
 * which allow the caller to transfer funds for both the creator and the platform.
 */
contract RoyaltiesReceiverV2 is Initializable {
    using SafeTransferLib for address;

    /// @notice Emitted when a new payee is added to the contract.
    /// @param account The address of the new payee.
    /// @param shares The number of shares assigned to the payee.
    event PayeeAdded(address indexed account, uint256 shares);

    /// @notice Emitted when a payment in native Ether is released.
    /// @param token The address of the ERC20 token if address(0) then native currency.
    /// @param to The address receiving the payment.
    /// @param amount The amount of Ether released.
    event PaymentReleased(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    /// @notice Emitted when the contract receives native Ether.
    /// @param from The address sending the Ether.
    /// @param amount The amount of Ether received.
    event PaymentReceived(address indexed from, uint256 amount);

    /**
     * @title RoyaltiesReceivers
     * @notice Payee addresses for royalty splits
     * @dev Used by RoyaltiesReceiver to distribute payments
     */
    struct RoyaltiesReceivers {
        /// @notice Address receiving creator share
        address creator;
        /// @notice Address receiving platform share
        address platform;
        /// @notice Address receiving referral share (optional)
        address referral;
    }

    /// @notice The constant address representing ETH.
    address public constant ETH_ADDRESS =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /// @notice Total shares amount.
    uint256 public constant TOTAL_SHARES = 10000;

    address public nftFactory;

    bytes32 public referralCode;

    /**
     * @notice List of payee addresses. Returns the address of the payee at the given index.
     */
    RoyaltiesReceivers public payees;

    /// @notice Struct for tracking native Ether releases.
    Releases private nativeReleases;

    /// @notice Mapping of ERC20 token addresses to their respective release tracking structs.
    mapping(address => Releases) private erc20Releases;

    /// @custom:oz-upgrades-unsafe-allow constructor
    // constructor() {
    //     _disableInitializers();
    // }

    /**
     * @notice Initializes the contract with a list of payees and their respective shares.
     * @param payees_ The list of payee addresses.
     */
    function initialize(
        RoyaltiesReceivers calldata payees_,
        address _nftFactory,
        bytes32 referralCode_
    ) external initializer {
        nftFactory = _nftFactory;
        payees = payees_;
        referralCode = referralCode_;
    }

    function shares(address account) public view returns (uint256) {
        NFTFactoryV2 factory = NFTFactoryV2(nftFactory);
        RoyaltiesReceivers memory royaltiesReceivers = payees;

        if (account == royaltiesReceivers.creator) {
            return factory.royaltiesParameters().amountToCreator;
        } else {
            uint256 platformShare = factory
                .royaltiesParameters()
                .amountToPlatform;
            uint256 referralShare;
            if (royaltiesReceivers.referral != address(0)) {
                referralShare = factory.getReferralShare(
                    royaltiesReceivers.creator,
                    referralCode
                );

                if (referralShare > 0) {
                    unchecked {
                        platformShare -= referralShare;
                    }
                }
            }
            return
                account == royaltiesReceivers.platform
                    ? platformShare
                    : account == royaltiesReceivers.referral
                        ? referralShare
                        : 0;
        }
    }

    /**
     * @notice Logs the receipt of Ether. Called when the contract receives Ether.
     */
    receive() external payable {
        emit PaymentReceived(msg.sender, msg.value);
    }

    /**
     * @notice Releases all pending payments for a given currency to the payees.
     * @param token The address of the currecny to be released (ERC20 token address or address(0) for native Ether).
     */
    function releaseAll(address token) external {
        RoyaltiesReceivers memory royaltiesReceivers = payees;

        _release(token, royaltiesReceivers.creator);

        _release(token, royaltiesReceivers.platform);
        if (royaltiesReceivers.referral != address(0)) {
            _release(token, royaltiesReceivers.referral);
        }
    }

    /**
     * @notice Releases pending ERC20 token payments for a given token to the payee.
     * @param token The address of the currecny to be released (ERC20 token address or address(0) for native Ether).
     */
    function release(address token, address to) external {
        _onlyToPayee(to);

        _release(token, to);
    }

    /**
     * @notice Returns the total amount of a specific currency already released to payees.
     * @param token The address of the currecny to be released (ERC20 token address or address(0) for native Ether).
     * @return The total amount released.
     */
    function totalReleased(address token) external view returns (uint256) {
        if (token == ETH_ADDRESS) {
            return nativeReleases.totalReleased;
        } else {
            return erc20Releases[token].totalReleased;
        }
    }

    /**
     * @notice Returns the amount of a specific ERC20 token already released to a specific payee.
     * @param token The address of the ERC20 token.
     * @param account The address of the payee.
     * @return The amount of tokens released to the payee.
     */
    function released(
        address token,
        address account
    ) external view returns (uint256) {
        if (token == ETH_ADDRESS) {
            return nativeReleases.released[account];
        } else {
            return erc20Releases[token].released[account];
        }
    }

    /**
     * @dev Internal function to release the pending payment for a payee.
     * @param token The ERC20 token address, or address(0) for native Ether.
     * @param account The payee's address receiving the payment.
     */
    function _release(address token, address account) internal {
        bool isNativeRelease = token == ETH_ADDRESS;
        uint256 payment = _pendingPayment(isNativeRelease, token, account);

        if (payment == 0) {
            return;
        }

        Releases storage releases = isNativeRelease
            ? nativeReleases
            : erc20Releases[token];
        releases.released[account] += payment;
        releases.totalReleased += payment;

        if (isNativeRelease) {
            account.safeTransferETH(payment);
        } else {
            token.safeTransfer(account, payment);
        }

        emit PaymentReleased(token, account, payment);
    }

    /**
     * @dev Internal logic for computing the pending payment for an account.
     * @param account The address of the payee.
     * @return The amount of funds still owed to the payee.
     */
    function _pendingPayment(
        bool isNativeRelease,
        address token,
        address account
    ) private view returns (uint256) {
        Releases storage releases = isNativeRelease
            ? nativeReleases
            : erc20Releases[token];
        uint256 balance = isNativeRelease
            ? address(this).balance
            : token.balanceOf(address(this));

        uint256 payment = ((balance + releases.totalReleased) *
            shares(account)) / TOTAL_SHARES;

        if (payment <= releases.released[account]) {
            return 0;
        }

        return payment - releases.released[account];
    }

    function _onlyToPayee(address account) private view {
        RoyaltiesReceivers memory payees_ = payees;

        require(
            payees_.creator == account ||
                payees_.platform == account ||
                (payees_.referral != address(0) && payees_.referral == account),
            AccountNotDuePayment(account)
        );
    }
}
