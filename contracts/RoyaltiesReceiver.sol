// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

/// @notice Thrown when a zero address is provided where it's not allowed.
error ZeroAddressPassed();

/// @notice Thrown when zero shares are provided for a payee.
error ZeroSharesPasted();

/// @notice Thrown when the lengths of payees and shares arrays do not match.
error ArraysLengthMismatch();

/// @notice Thrown when more than two payees are provided.
error Only2Payees();

/// @notice Thrown when an account is not due for payment.
error AccountNotDuePayment();

/// @notice Thrown when an account already has shares.
error AccountHasSharesAlready();

/// @notice Thrown when a division by zero is attempted.
error DivisionByZero();

/// @notice Thrown when an incorrect payee index is provided.
/// @param incorrectIndex The incorrect index value provided.
error IncorrectPayeeIndex(uint256 incorrectIndex);

/// @notice Struct for tracking total released amounts and account-specific released amounts.
struct Releases {
    uint256 totalReleased;
    mapping(address => uint256) released;
}

/// @notice Struct for managing total shares and individual account shares.
struct SharesAdded {
    uint256 totalShares;
    mapping(address => uint256) shares;
}

/**
 * @title RoyaltiesReceiver
 * @notice A contract for managing and releasing royalty payments in both native Ether and ERC20 tokens.
 * @dev Handles payment distribution based on shares assigned to payees.
 * Fork of OZ's PaymentSplitter with some changes. The only change is that common `release()`
 * functions are replaced with `releaseAll()` functions which allow the caller to transfer funds
 * for only both the creator and the platform.
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

    /// @notice Maximum number of payees allowed.
    uint256 public constant MAX_PAYEES_LENGTH = 2;

    /// @notice List of payee addresses.
    address[] public payees;

    /// @notice Struct storing payee shares and total shares.
    SharesAdded public sharesAdded;

    /// @notice Struct for tracking native Ether releases.
    Releases public nativeReleases;

    /// @notice Mapping of ERC20 token addresses to their respective release tracking structs.
    mapping(address => Releases) public erc20Releases;

    /**
     * @dev Initializes the contract with a list of payees and their respective shares.
     * @param payees_ The list of payee addresses.
     * @param shares_ The list of shares corresponding to each payee.
     */
    constructor(address[] memory payees_, uint256[] memory shares_) payable {
        if (payees_.length != shares_.length) {
            revert ArraysLengthMismatch();
        }

        if (payees_.length != MAX_PAYEES_LENGTH) {
            revert Only2Payees();
        }

        for (uint256 i = 0; i < MAX_PAYEES_LENGTH; ) {
            _addPayee(payees_[i], shares_[i]);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Logs the receipt of Ether. Called when the contract receives Ether.
     */
    receive() external payable {
        emit PaymentReceived(msg.sender, msg.value);
    }

    /**
     * @notice Releases all pending native Ether payments to the payees.
     */
    function releaseAll() external {
        address[] memory _payees = payees;

        for (uint256 i = 0; i < _payees.length; ) {
            _releaseNative(_payees[i]);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Releases all pending ERC20 payments for a given token to the payees.
     * @param token The address of the ERC20 token to be released.
     */
    function releaseAll(address token) external {
        address[] memory _payees = payees;

        for (uint256 i = 0; i < _payees.length; ) {
            _releaseERC20(token, _payees[i]);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Returns the total number of shares assigned to all payees.
     * @return The total shares.
     */
    function totalShares() public view returns (uint256) {
        return sharesAdded.totalShares;
    }

    /**
     * @notice Returns the number of shares held by a specific payee.
     * @param account The address of the payee.
     * @return The number of shares held by the payee.
     */
    function shares(address account) external view returns (uint256) {
        return sharesAdded.shares[account];
    }

    /**
     * @notice Returns the total amount of native Ether already released to payees.
     * @return The total amount of Ether released.
     */
    function totalReleased() public view returns (uint256) {
        return nativeReleases.totalReleased;
    }

    /**
     * @notice Returns the total amount of a specific ERC20 token already released to payees.
     * @param token The address of the ERC20 token.
     * @return The total amount of tokens released.
     */
    function totalReleased(address token) public view returns (uint256) {
        return erc20Releases[token].totalReleased;
    }

    /**
     * @notice Returns the amount of native Ether already released to a specific payee.
     * @param account The address of the payee.
     * @return The amount of Ether released to the payee.
     */
    function released(address account) public view returns (uint256) {
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
    ) public view returns (uint256) {
        return erc20Releases[token].released[account];
    }

    /**
     * @notice Returns the address of the payee at the given index.
     * @param index The index of the payee.
     * @return The address of the payee.
     */
    function payee(uint256 index) external view returns (address) {
        address[] memory _payees = payees;

        if (_payees.length <= index) {
            revert IncorrectPayeeIndex(index);
        }

        return _payees[index];
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
            IERC20(token).balanceOf(address(this)) +
                _erc20Releases.totalReleased,
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
        if (account == address(0)) {
            revert ZeroAddressPassed();
        }

        if (shares_ == 0) {
            revert ZeroSharesPasted();
        }

        if (sharesAdded.shares[account] != 0) {
            revert AccountHasSharesAlready();
        }

        payees.push(account);
        sharesAdded.shares[account] = shares_;
        sharesAdded.totalShares += shares_;
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
        uint256 divider = sharesAdded.totalShares - alreadyReleased;
        if (divider == 0) {
            revert DvisonByZero();
        }

        return (totalReceived * sharesAdded.shares[account]) / divider;
    }
}
