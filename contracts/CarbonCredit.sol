// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CarbonCredit is ERC20, Ownable {
    mapping(string => uint256) public redemptionsByEmission;
    mapping(address => uint256) public totalRedeemed;

    event CreditsRedeemed(address indexed redeemer, uint256 amount, string emissionId);

    constructor(address initialOwner) ERC20("CarbonCredit", "CREDIT") Ownable(initialOwner) {}

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    function mintCredits(address to, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        _mint(to, amount);
    }

    function redeemCredits(uint256 amount, string calldata emissionId) external {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient credits");
        require(bytes(emissionId).length > 0, "Emission ID required");

        _burn(msg.sender, amount);
        redemptionsByEmission[emissionId] += amount;
        totalRedeemed[msg.sender] += amount;

        emit CreditsRedeemed(msg.sender, amount, emissionId);
    }

    function getRedemptionsByEmission(string calldata emissionId) external view returns (uint256) {
        return redemptionsByEmission[emissionId];
    }
}
