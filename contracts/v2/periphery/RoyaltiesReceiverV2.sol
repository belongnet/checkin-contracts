// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

import {Factory} from "../platform/Factory.sol";

/**
 * @title RoyaltiesReceiverV2
 * @notice Manages and releases royalty payments in native NativeCurrency and ERC20 tokens.
 * @dev Fork of OZ PaymentSplitter with changes: common `release()` variants are replaced with
 *      `releaseAll()` functions to release funds for creator, platform and optional referral in one call.
 */
contract RoyaltiesReceiverV2 is Initializable {
    using SafeTransferLib for address;

    /// @notice Thrown when an account is not due for payment.
    error AccountNotDuePayment(address account);

    /// @notice Thrown when transfer is not to a payee.
    error OnlyToPayee();

    /// @notice Emitted when a new payee is added to the contract.
    /// @param account The address of the new payee.
    /// @param shares The number of shares assigned to the payee.
    event PayeeAdded(address indexed account, uint256 shares);

    /// @notice Emitted when a payment is released in native NativeCurrency or an ERC20 token.
    /// @param token The ERC20 token address, or `NATIVE_CURRENCY_ADDRESS` for native currency.
    /// @param to The address receiving the payment.
    /// @param amount The amount released.
    event PaymentReleased(address indexed token, address indexed to, uint256 amount);

    /// @notice Emitted when the contract receives native Ether.
    /// @param from The address sending the Ether.
    /// @param amount The amount of Ether received.
    event PaymentReceived(address indexed from, uint256 amount);

    /// @notice Struct for tracking total released amounts and account-specific released amounts.
    struct Releases {
        /// @notice The total amount of funds released from the contract.
        uint256 totalReleased;
        /// @notice A mapping to track the released amount per payee account.
        mapping(address => uint256) released;
    }

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

    /// @notice The constant address representing NativeCurrency.
    address public constant NATIVE_CURRENCY_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /// @notice Total shares amount.
    uint256 public constant TOTAL_SHARES = 10000;

    Factory public factory;

    bytes32 public referralCode;

    /**
     * @notice List of payee addresses. Returns the address of the payee at the given index.
     */
    RoyaltiesReceivers public royaltiesReceivers;

    /// @notice Struct for tracking native Ether releases.
    Releases private nativeReleases;

    /// @notice Mapping of ERC20 token addresses to their respective release tracking structs.
    mapping(address => Releases) private erc20Releases;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with payees and a Factory reference.
     * @param _royaltiesReceivers Payee addresses for creator, platform and optional referral.
     * @param _factory Factory instance to read royalties parameters and referrals.
     * @param referralCode_ Referral code associated with this receiver.
     */
    function initialize(RoyaltiesReceivers calldata _royaltiesReceivers, Factory _factory, bytes32 referralCode_)
        external
        initializer
    {
        factory = _factory;
        royaltiesReceivers = _royaltiesReceivers;
        referralCode = referralCode_;
    }

    /// @notice Returns shares (in BPS, out of TOTAL_SHARES) for a given account.
    /// @dev Platform share may be reduced by a referral share if a referral payee is set.
    /// @param account The account to query (creator, platform or referral).
    /// @return The share assigned to the account in BPS (out of TOTAL_SHARES).
    function shares(address account) public view returns (uint256) {
        RoyaltiesReceivers memory _royaltiesReceivers = royaltiesReceivers;

        Factory _factory = factory;
        Factory.RoyaltiesParameters memory royaltiesParameters = _factory.royaltiesParameters();
        if (account == _royaltiesReceivers.creator) {
            return royaltiesParameters.amountToCreator;
        } else {
            uint256 platformShare = royaltiesParameters.amountToPlatform;
            uint256 referralShare;
            if (_royaltiesReceivers.referral != address(0)) {
                referralShare = _factory.getReferralRate(
                    _royaltiesReceivers.creator, referralCode, royaltiesParameters.amountToPlatform
                );

                if (referralShare > 0) {
                    unchecked {
                        platformShare -= referralShare;
                    }
                }
            }
            return account == _royaltiesReceivers.platform
                ? platformShare
                : account == _royaltiesReceivers.referral ? referralShare : 0;
        }
    }

    /**
     * @notice Logs the receipt of NativeCurrency. Triggered on plain NativeCurrency transfers.
     */
    receive() external payable {
        emit PaymentReceived(msg.sender, msg.value);
    }

    /**
     * @notice Releases all pending payments for a currency to the payees.
     * @param token The currency to release: ERC20 token address or `NATIVE_CURRENCY_ADDRESS` for native NativeCurrency.
     */
    function releaseAll(address token) external {
        RoyaltiesReceivers memory _royaltiesReceivers = royaltiesReceivers;

        _release(token, _royaltiesReceivers.creator);

        _release(token, _royaltiesReceivers.platform);
        if (_royaltiesReceivers.referral != address(0)) {
            _release(token, _royaltiesReceivers.referral);
        }
    }

    /**
     * @notice Returns the total amount of a currency already released to payees.
     * @param token The currency queried: ERC20 token address or `NATIVE_CURRENCY_ADDRESS` for native NativeCurrency.
     * @return The total amount released.
     */
    function totalReleased(address token) external view returns (uint256) {
        if (token == NATIVE_CURRENCY_ADDRESS) {
            return nativeReleases.totalReleased;
        } else {
            return erc20Releases[token].totalReleased;
        }
    }

    /**
     * @notice Returns the amount of a specific currency already released to a specific payee.
     * @param token The currency queried: ERC20 token address or `NATIVE_CURRENCY_ADDRESS` for native NativeCurrency.
     * @param account The address of the payee.
     * @return The amount of tokens released to the payee.
     */
    function released(address token, address account) external view returns (uint256) {
        if (token == NATIVE_CURRENCY_ADDRESS) {
            return nativeReleases.released[account];
        } else {
            return erc20Releases[token].released[account];
        }
    }

    /**
     * @dev Internal function to release the pending payment for a payee.
     * @param token The ERC20 token address, or `NATIVE_CURRENCY_ADDRESS` for native NativeCurrency.
     * @param account The payee's address receiving the payment.
     */
    function _release(address token, address account) private {
        bool isNativeRelease = token == NATIVE_CURRENCY_ADDRESS;
        uint256 payment = _pendingPayment(isNativeRelease, token, account);

        if (payment == 0) {
            return;
        }

        Releases storage releases = isNativeRelease ? nativeReleases : erc20Releases[token];
        releases.released[account] += payment;
        releases.totalReleased += payment;

        if (isNativeRelease) {
            account.forceSafeTransferETH(payment);
        } else {
            token.safeTransfer(account, payment);
        }

        emit PaymentReleased(token, account, payment);
    }

    /**
     * @dev Computes the pending payment for an account in a given currency.
     * @param isNativeRelease True if the currency is native NativeCurrency, false for ERC20.
     * @param token The ERC20 token address or `NATIVE_CURRENCY_ADDRESS` for native NativeCurrency.
     * @param account The payee to compute pending payment for.
     * @return The amount of funds still owed to the payee.
     */
    function _pendingPayment(bool isNativeRelease, address token, address account) private view returns (uint256) {
        Releases storage releases = isNativeRelease ? nativeReleases : erc20Releases[token];
        uint256 balance = isNativeRelease ? address(this).balance : token.balanceOf(address(this));

        uint256 payment = ((balance + releases.totalReleased) * shares(account)) / TOTAL_SHARES;

        if (payment <= releases.released[account]) {
            return 0;
        }

        return payment - releases.released[account];
    }

    /// @dev Reverts unless `account` is one of the configured payees.
    /// @param account The account to validate as a payee.
    function _onlyToPayee(address account) private view {
        RoyaltiesReceivers memory _royaltiesReceivers = royaltiesReceivers;

        require(
            _royaltiesReceivers.creator == account || _royaltiesReceivers.platform == account
                || (_royaltiesReceivers.referral != address(0) && _royaltiesReceivers.referral == account),
            AccountNotDuePayment(account)
        );
    }
}
