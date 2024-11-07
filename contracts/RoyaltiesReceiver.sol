// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

import {NFTFactory} from "./factories/NFTFactory.sol";

import {Releases} from "./Structures.sol";

/// @notice Thrown when a zero address is provided where it's not allowed.
error ZeroAddressPassed();

/// @notice Thrown when zero shares are provided for a payee.
error ZeroSharesPassed();

/// @notice Thrown when an account is not due for payment.
error AccountNotDuePayment();

/// @notice Thrown when an account already has shares.
error AccountHasSharesAlready();

/**
 * @title RoyaltiesReceiver
 * @notice A contract for managing and releasing royalty payments in both native Ether and ERC20 tokens.
 * @dev Handles payment distribution based on shares assigned to payees. Fork of OZ's PaymentSplitter with some changes.
 * The only change is that common `release()` functions are replaced with `releaseAll()` functions,
 * which allow the caller to transfer funds for both the creator and the platform.
 */
contract RoyaltiesReceiver {
    using SafeTransferLib for address;

    /// @notice Emitted when a new payee is added to the contract.
    /// @param account The address of the new payee.
    /// @param shares The number of shares assigned to the payee.
    event PayeeAdded(address indexed account, uint256 shares);

    /// @notice Emitted when a payment in native Ether is released.
    /// @param to The address receiving the payment.
    /// @param amount The amount of Ether released.
    event PaymentReleased(address indexed to, uint256 amount);

    /// @notice Emitted when a payment in ERC20 tokens is released.
    /// @param token The address of the ERC20 token.
    /// @param to The address receiving the payment.
    /// @param amount The amount of tokens released.
    event ERC20PaymentReleased(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    /// @notice Emitted when the contract receives native Ether.
    /// @param from The address sending the Ether.
    /// @param amount The amount of Ether received.
    event PaymentReceived(address indexed from, uint256 amount);

    /// @notice Maximum array size used.
    uint256 public constant ARRAY_SIZE = 3;
    /// @notice Total shares amount.
    uint256 public constant TOTAL_SHARES = 10000;
    /// @notice Amount goes to creator.
    uint16 constant AMOUNT_TO_CREATOR = 8000;
    /// @notice Amount goes to platform.
    uint16 constant AMOUNT_TO_PLATFORM = 2000;

    /**
     * @notice List of payee addresses. Returns the address of the payee at the given index.
     */
    address[ARRAY_SIZE] public payees;

    /**
     * @notice Returns the number of shares held by a specific payee.
     */
    mapping(address => uint256) shares;

    /// @notice Struct for tracking native Ether releases.
    Releases public nativeReleases;

    /// @notice Mapping of ERC20 token addresses to their respective release tracking structs.
    mapping(address => Releases) public erc20Releases;

    /**
     * @notice Initializes the contract with a list of payees and their respective shares.
     * @param referralCode The referral code associated with this NFT instance.
     * @param payees_ The list of payee addresses.
     */
    constructor(bytes32 referralCode, address[ARRAY_SIZE] memory payees_) {
        bool isReferral = payees_[2] != address(0);

        uint16 amountToPlatform = AMOUNT_TO_PLATFORM;
        uint16 amountToReferral;
        if (isReferral) {
            amountToReferral = uint16(
                NFTFactory(msg.sender).getReferralRate(
                    payees_[0],
                    referralCode,
                    amountToPlatform
                )
            );
            unchecked {
                amountToPlatform -= amountToReferral;
            }
        }

        payees = payees_;

        shares[payees_[0]] = AMOUNT_TO_CREATOR;
        shares[payees_[1]] = amountToPlatform;
        shares[payees_[2]] = amountToReferral;
    }

    /**
     * @notice Logs the receipt of Ether. Called when the contract receives Ether.
     */
    receive() external payable {
        emit PaymentReceived(msg.sender, msg.value);
    }

    /**
     * @notice Releases all pending native Ether payments to the payees.
     */
    function releaseAll() external {
        address[ARRAY_SIZE] memory _payees = payees;
        uint8 arraySize = _payees[2] != address(0) ? 3 : 2;

        for (uint256 i = 0; i < arraySize; ) {
            _releaseNative(_payees[i]);
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Releases all pending ERC20 token payments for a given token to the payees.
     * @param token The address of the ERC20 token to be released.
     */
    function releaseAll(address token) external {
        address[ARRAY_SIZE] memory _payees = payees;
        uint256 arraySize = _payees[2] != address(0) ? 3 : 2;

        for (uint256 i = 0; i < arraySize; ) {
            _releaseERC20(token, _payees[i]);
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Returns the total amount of native Ether already released to payees.
     * @return The total amount of Ether released.
     */
    function totalReleased() external view returns (uint256) {
        return nativeReleases.totalReleased;
    }

    /**
     * @notice Returns the total amount of a specific ERC20 token already released to payees.
     * @param token The address of the ERC20 token.
     * @return The total amount of tokens released.
     */
    function totalReleased(address token) external view returns (uint256) {
        return erc20Releases[token].totalReleased;
    }

    /**
     * @notice Returns the amount of native Ether already released to a specific payee.
     * @param account The address of the payee.
     * @return The amount of Ether released to the payee.
     */
    function released(address account) external view returns (uint256) {
        return nativeReleases.released[account];
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
        return erc20Releases[token].released[account];
    }

    /**
     * @dev Releases pending native Ether to a payee.
     * @param account The address of the payee.
     */
    function _releaseNative(address account) internal {
        uint256 toRelease = _pendingPayment(
            account,
            address(this).balance + nativeReleases.totalReleased,
            nativeReleases.released[account]
        );

        if (toRelease == 0) {
            revert AccountNotDuePayment();
        }

        nativeReleases.released[account] += toRelease;
        nativeReleases.totalReleased += toRelease;

        account.safeTransferETH(toRelease);

        emit PaymentReleased(account, toRelease);
    }

    /**
     * @dev Releases pending ERC20 tokens to a payee.
     * @param token The address of the ERC20 token.
     * @param account The address of the payee.
     */
    function _releaseERC20(address token, address account) internal {
        Releases storage _erc20Releases = erc20Releases[token];

        uint256 toRelease = _pendingPayment(
            account,
            token.balanceOf(address(this)) + _erc20Releases.totalReleased,
            _erc20Releases.released[account]
        );

        if (toRelease == 0) {
            revert AccountNotDuePayment();
        }

        _erc20Releases.released[account] += toRelease;
        _erc20Releases.totalReleased += toRelease;

        token.safeTransfer(account, toRelease);

        emit ERC20PaymentReleased(token, account, toRelease);
    }

    /**
     * @dev Adds a new payee to the contract with a given number of shares.
     * @param account The address of the payee.
     * @param shares_ The number of shares assigned to the payee.
     */
    function _addPayee(address account, uint256 shares_) private {
        emit PayeeAdded(account, shares_);
    }

    /**
     * @dev Internal logic for computing the pending payment for an account.
     * @param account The address of the payee.
     * @param totalReceived The total amount of funds received by the contract.
     * @param alreadyReleased The amount already released to the payee.
     * @return The amount of funds still owed to the payee.
     */
    function _pendingPayment(
        address account,
        uint256 totalReceived,
        uint256 alreadyReleased
    ) private view returns (uint256) {
        uint256 payment = (totalReceived * shares[account]) / TOTAL_SHARES;

        if (payment <= alreadyReleased) {
            return 0;
        }
        return payment - alreadyReleased;
    }
}
