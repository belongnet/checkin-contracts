// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockPermit2 {
    struct PackedAllowance {
        uint160 amount;
        uint48 expiration;
        uint48 nonce;
    }

    event Approval(
        address indexed owner, address indexed token, address indexed spender, uint160 amount, uint48 expiration
    );

    mapping(address owner => mapping(address token => mapping(address spender => PackedAllowance))) private _allowances;

    function allowance(address owner, address token, address spender)
        external
        view
        returns (uint160 amount, uint48 expiration, uint48 nonce)
    {
        PackedAllowance memory allowed = _allowances[owner][token][spender];
        return (allowed.amount, allowed.expiration, allowed.nonce);
    }

    function approve(address token, address spender, uint160 amount, uint48 expiration) external {
        _allowances[msg.sender][token][spender] = PackedAllowance({
            amount: amount,
            expiration: expiration,
            nonce: _allowances[msg.sender][token][spender].nonce
        });
        emit Approval(msg.sender, token, spender, amount, expiration);
    }

    function transferFrom(address from, address to, uint160 amount, address token) external {
        PackedAllowance storage allowed = _allowances[from][token][msg.sender];
        require(block.timestamp <= allowed.expiration, "MockPermit2: expired");
        require(allowed.amount >= amount, "MockPermit2: allowance");

        if (allowed.amount != type(uint160).max) {
            allowed.amount -= amount;
        }

        IERC20(token).transferFrom(from, to, amount);
    }
}
