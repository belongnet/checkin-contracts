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
    uint256 public totalShares;
    uint256 public totalReleased;

    address[] public payees;
    mapping(address => uint256) public shares;
    mapping(address => uint256) public released;
    mapping(address => uint256) public erc20TotalReleased;
    mapping(address => mapping(address => uint256)) public erc20Released;

    /**
     * @dev Initiates an instance of `RoyaltiesReceiver` where each account in `payees` is assigned the number of shares at
     * the matching position in the `shares` array.
     *
     * All addresses in `payees` must be non-zero. Both arrays must have the same non-zero length, and there must be no
     * duplicates in `payees`.
     */

    function initialize(
        address[] calldata _payees,
        uint256[] calldata _shares
    ) external payable initializer {
        if (_payees.length != _shares.length) {
            revert ArraysLengthMismatch();
        }

        if (_payees.length == MAX_PAYEES_LENGTH) {
            revert Only2Payees();
        }

        for (uint256 i = 0; i < MAX_PAYEES_LENGTH; ) {
            _addPayee(_payees[i], _shares[i]);

            {
                unchecked {
                    ++i;
                }
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

        for (uint256 i = 0; i < _payees.length; ) {
            _release(_payees[i]);

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

        for (uint256 i = 0; i < _payees.length; ) {
            _release(token, _payees[i]);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Triggers a transfer to `account` of the amount of Ether they are owed, according to their percentage of the
     * total shares and their previous withdrawals.
     */
    function _release(address account) internal {
        uint256 payment = _pendingPayment(
            account,
            address(this).balance + totalReleased,
            released[account]
        );

        if (payment == 0) {
            revert AccountNotDuePayment();
        }

        released[account] += payment;
        totalReleased += payment;

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
            IERC20(token).balanceOf(address(this)) + erc20TotalReleased[token],
            erc20Released[token][account]
        );

        if (payment == 0) {
            revert AccountNotDuePayment();
        }

        erc20Released[token][account] += payment;
        erc20TotalReleased[token] += payment;

        token.safeTransfer(account, payment);
        emit ERC20PaymentReleased(token, account, payment);
    }

    /**
     * @dev Add a new payee to the contract.
     * @param account The address of the payee to add.
     * @param _shares The number of shares owned by the payee.
     */
    function _addPayee(address account, uint256 _shares) private {
        if (account == address(0)) {
            revert ZeroAddressPasted();
        }

        if (_shares == 0) {
            revert ZeroSharesPasted();
        }

        if (shares[account] != 0) {
            revert AccountHasSharesAlready();
        }

        payees.push(account);
        shares[account] = _shares;
        totalShares += _shares;
        emit PayeeAdded(account, _shares);
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
        uint256 divider = totalShares - alreadyReleased;
        if (divider == 0) {
            revert DvisonByZero();
        }

        return (totalReceived * shares[account]) / divider;
    }
}
