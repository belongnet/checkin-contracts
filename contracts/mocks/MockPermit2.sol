// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

contract MockPermit2 {
    event Approval(
        address indexed owner, address indexed token, address indexed spender, uint160 amount, uint48 expiration
    );

    function approve(address token, address spender, uint160 amount, uint48 expiration) external {
        emit Approval(msg.sender, token, spender, amount, expiration);
    }
}
