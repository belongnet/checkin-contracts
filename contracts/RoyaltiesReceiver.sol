// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

error ZeroAddressPasted();
error ZeroSharesPasted();
error ArraysLengthMismatch();
error Only2Payees();
error AccountNotDuePayment();
error AccountHasSharesAlready();
error DvisonByZero();
error IncorrectPayeeIndex(uint256 incorrectIndex);

struct Releases {
    uint256 totalReleased;
    mapping(address account => uint256 amount) released;
}

struct Shares {
    uint256 totalShares;
    mapping(address => uint256) shares;
}

contract RoyaltiesReceiver {
    using SafeTransferLib for address;

    event PayeeAdded(address indexed account, uint256 shares);
    event PaymentReleased(address indexed to, uint256 amount);
    event ERC20PaymentReleased(
        address indexed token,
        address indexed to,
        uint256 amount
    );
    event PaymentReceived(address indexed from, uint256 amount);

    uint256 public constant MAX_PAYEES_LENGTH = 2;

    address[] public payees;

    Shares public shares;

    Releases public nativeReleases;
    mapping(address token => Releases) public erc20Releases;

    /**
     * @dev Initiates an instance of `RoyaltiesReceiver` where each account in `payees_` is assigned the number of shares at
     * the matching position in the `shares_` array.
     *
     * All addresses in `payees_` must be non-zero. Both arrays must have the same non-zero length, and there must be no
     * duplicates in `payees_`.
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
     * @dev The Ether received will be logged with {PaymentReceived} events. Note that these events are not fully
     * reliable: it's possible for a contract to receive Ether without triggering this function. This only affects the
     * reliability of the events, and not the actual splitting of Ether.
     *
     * To learn more about this see the Solidity documentation for
     * https://solidity.readthedocs.io/en/latest/contracts.html#fallback-function[fallback
     * functions].
     */
    receive() external payable {
        emit PaymentReceived(msg.sender, msg.value);
    }

    /**
     * @notice releases ETH to all payees
     */
    function releaseAll() external {
        address[] memory _payees = payees;

        for (uint256 i = 0; i < payees_.length; ) {
            _release(payees_[i]);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice releases specified ERC20 to all payees
     * @param token ERC20 token to be distributed
     */
    function releaseAll(address token) external {
        address[] memory _payees = payees;

        for (uint256 i = 0; i < payees.length; ) {
            _release(token, payees[i]);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Getter for the total amount of Ether already released.
     */
    function totalReleased() public view returns (uint256) {
        return nativeReleases.totalReleased;
    }

    /**
     * @dev Getter for the total amount of `token` already released. `token` should be the address of an IERC20
     * contract.
     */
    function totalReleased(address token) public view returns (uint256) {
        return erc20Releases[token].totalReleased;
    }

    /**
     * @dev Getter for the amount of Ether already released to a payee.
     */
    function released(address account) public view returns (uint256) {
        return nativeReleases.released[account];
    }

    /**
     * @dev Getter for the amount of `token` tokens already released to a payee. `token` should be the address of an
     * IERC20 contract.
     */
    function released(
        address token,
        address account
    ) public view returns (uint256) {
        return erc20Releases[token].released[account];
    }

    /**
     * @dev Getter for the address of the payee number `index`.
     */
    function payee(uint256 index) external view returns (address) {
        address[] memory _payees = payees;

        if (_payees.length <= index) {
            revert IncorrectPayeeIndex(index);
        }

        return _payees[index];
    }

    /**
     * @dev Triggers a transfer to `account` of the amount of Ether they are owed, according to their percentage of the
     * total shares and their previous withdrawals.
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
     * @dev Triggers a transfer to `account` of the amount of `token` tokens they are owed, according to their
     * percentage of the total shares and their previous withdrawals. `token` must be the address of an IERC20
     * contract.
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
     * @dev Add a new payee to the contract.
     * @param account The address of the payee to add.
     * @param shares_ The number of shares owned by the payee.
     */
    function _addPayee(address account, uint256 shares_) private {
        if (account == address(0)) {
            revert ZeroAddressPasted();
        }

        if (shares_ == 0) {
            revert ZeroSharesPasted();
        }

        if (shares.shares[account] != 0) {
            revert AccountHasSharesAlready();
        }

        payees.push(account);
        shares.shares[account] = shares_;
        shares.totalShares += shares_;
        emit PayeeAdded(account, shares_);
    }

    /**
     * @dev internal logic for computing the pending payment of an `account` given the token historical balances and
     * already released amounts.
     */
    function _pendingPayment(
        address account,
        uint256 totalReceived,
        uint256 alreadyReleased
    ) private view returns (uint256) {
        uint256 divider = shares.totalShares - alreadyReleased;
        if (divider == 0) {
            revert DvisonByZero();
        }

        return (totalReceived * shares.shares[account]) / divider;
    }
}
