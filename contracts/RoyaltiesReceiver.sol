// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Initializable} from "solady/src/utils/Initializable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

error ZeroAddressPasted();
error ZeroSharesPasted();
error ArraysLengthMismatch();
error Only2Payees();
error AccountNotDuePayment();
error AccountHasSharesAlready();
error DvisonByZero();
error IncorrectPayeeIndex(uint256 incorrectIndex);

contract RoyaltiesReceiver is Initializable {
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

    uint256 private _totalShares;
    uint256 private _totalReleased;

    address[] private _payees;

    mapping(address => uint256) private _shares;
    mapping(address => uint256) private _released;
    mapping(address => mapping(address => uint256)) private _erc20Released;
    mapping(address => uint256) private _erc20TotalReleased;

    // constructor() {
    //     _disableInitializers();
    // }

    /**
     * @dev Initiates an instance of `RoyaltiesReceiver` where each account in `payees_` is assigned the number of shares at
     * the matching position in the `shares_` array.
     *
     * All addresses in `payees_` must be non-zero. Both arrays must have the same non-zero length, and there must be no
     * duplicates in `payees_`.
     */

    function initialize(
        address[] calldata payees_,
        uint256[] calldata shares_
    ) external payable initializer {
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
        address[] memory payees_ = _payees;

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
        address[] memory payees = _payees;

        for (uint256 i = 0; i < payees.length; ) {
            _release(token, payees[i]);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Getter for the total shares held by payees.
     */
    function totalShares() external view returns (uint256) {
        return _totalShares;
    }

    /**
     * @dev Getter for the amount of shares held by an account.
     */
    function shares(address account) external view returns (uint256) {
        return _shares[account];
    }

    /**
     * @dev Getter for the total amount of Ether already released.
     */
    function totalReleased() public view returns (uint256) {
        return _totalReleased;
    }

    /**
     * @dev Getter for the total amount of `token` already released. `token` should be the address of an IERC20
     * contract.
     */
    function totalReleased(address token) public view returns (uint256) {
        return _erc20TotalReleased[token];
    }

    /**
     * @dev Getter for the amount of Ether already released to a payee.
     */
    function released(address account) public view returns (uint256) {
        return _released[account];
    }

    /**
     * @dev Getter for the amount of `token` tokens already released to a payee. `token` should be the address of an
     * IERC20 contract.
     */
    function released(
        address token,
        address account
    ) public view returns (uint256) {
        return _erc20Released[token][account];
    }

    /**
     * @dev Getter for the address of the payee number `index`.
     */
    function payee(uint256 index) external view returns (address) {
        if (_payees.length <= index) {
            revert IncorrectPayeeIndex(index);
        }

        return _payees[index];
    }

    /**
     * @dev Triggers a transfer to `account` of the amount of Ether they are owed, according to their percentage of the
     * total shares and their previous withdrawals.
     */
    function _release(address account) internal {
        uint256 payment = _pendingPayment(
            account,
            address(this).balance + _totalReleased,
            _released[account]
        );

        if (payment == 0) {
            revert AccountNotDuePayment();
        }

        _released[account] += payment;
        _totalReleased += payment;

        account.safeTransferETH(payment);

        emit PaymentReleased(account, payment);
    }

    /**
     * @dev Triggers a transfer to `account` of the amount of `token` tokens they are owed, according to their
     * percentage of the total shares and their previous withdrawals. `token` must be the address of an IERC20
     * contract.
     */
    function _release(address token, address account) internal {
        uint256 payment = _pendingPayment(
            account,
            IERC20(token).balanceOf(address(this)) + _erc20TotalReleased[token],
            _erc20Released[token][account]
        );

        if (payment == 0) {
            revert AccountNotDuePayment();
        }

        _erc20Released[token][account] += payment;
        _erc20TotalReleased[token] += payment;

        token.safeTransfer(account, payment);
        emit ERC20PaymentReleased(token, account, payment);
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

        if (_shares[account] != 0) {
            revert AccountHasSharesAlready();
        }

        _payees.push(account);
        _shares[account] = shares_;
        _totalShares += shares_;
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
        uint256 divider = _totalShares - alreadyReleased;
        if (divider == 0) {
            revert DvisonByZero();
        }

        return (totalReceived * _shares[account]) / divider;
    }
}
