// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Mock XRPL token for local testing only. On XRPL EVM Sidechain, use the real wrapped XRP.
contract MockXRPLToken is ERC20 {
    constructor() ERC20("Mock XRPL", "XRPL") {
        _mint(msg.sender, 1_000_000 * 1e18);
    }
}
