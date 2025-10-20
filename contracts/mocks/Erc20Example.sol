// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title USDCMock
/// @notice Simple ERC20 mock with 6 decimals and an open `mint` function for testing.
contract USDCMock is ERC20 {
    constructor() ERC20("USDC Mock", "USDCm") {
        _mint(msg.sender, 1_000_000_000_000 * 10 ** decimals());
    }

    /// @notice Mints `amount` tokens to `to`.
    /// @param to Recipient address.
    /// @param amount Amount to mint (6 decimals).
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    /// @notice Returns 6 to emulate USDC decimals.
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/// @title WETHMock
/// @notice Simple ERC20 mock (18 decimals) with an open `mint` function for testing.
contract WETHMock is ERC20 {
    constructor() ERC20("WETH Mock", "WETHm") {
        _mint(msg.sender, 1_000_000_000_000 * 10 ** decimals());
    }

    /// @notice Mints `amount` tokens to `to`.
    /// @param to Recipient address.
    /// @param amount Amount to mint (18 decimals).
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
