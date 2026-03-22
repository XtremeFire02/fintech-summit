// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CarbonCreditMarketplace {
    IERC20 public carbonCreditToken;
    IERC20 public xrplToken;
    address public owner;

    uint256 public buyPrice;
    uint256 public sellPrice;

    event CreditsPurchased(address indexed buyer, uint256 amount, uint256 totalCost);
    event CreditsSold(address indexed seller, uint256 amount, uint256 totalPayout);
    event PriceUpdated(uint256 newBuyPrice, uint256 newSellPrice);

    constructor(
        address carbonCreditAddress,
        address xrplTokenAddress,
        uint256 initialBuyPrice,
        uint256 initialSellPrice
    ) {
        carbonCreditToken = IERC20(carbonCreditAddress);
        xrplToken = IERC20(xrplTokenAddress);
        owner = msg.sender;
        buyPrice = initialBuyPrice;
        sellPrice = initialSellPrice;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action");
        _;
    }

    function setBuyPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be > 0");
        buyPrice = newPrice;
        emit PriceUpdated(buyPrice, sellPrice);
    }

    function setSellPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be > 0");
        sellPrice = newPrice;
        emit PriceUpdated(buyPrice, sellPrice);
    }

    function buyCredits(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        uint256 totalCost = amount * buyPrice;
        require(
            carbonCreditToken.balanceOf(address(this)) >= amount,
            "Not enough credits in marketplace"
        );

        bool xrplSuccess = xrplToken.transferFrom(msg.sender, address(this), totalCost);
        require(xrplSuccess, "XRPL payment failed");

        bool creditSuccess = carbonCreditToken.transfer(msg.sender, amount);
        require(creditSuccess, "Credit transfer failed");

        emit CreditsPurchased(msg.sender, amount, totalCost);
    }

    function sellCredits(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        uint256 totalPayout = amount * sellPrice;
        require(
            xrplToken.balanceOf(address(this)) >= totalPayout,
            "Not enough XRPL in marketplace"
        );

        bool creditSuccess = carbonCreditToken.transferFrom(msg.sender, address(this), amount);
        require(creditSuccess, "Credit transfer failed");

        bool xrplSuccess = xrplToken.transfer(msg.sender, totalPayout);
        require(xrplSuccess, "XRPL payout failed");

        emit CreditsSold(msg.sender, amount, totalPayout);
    }

    function withdrawXrpl(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        require(xrplToken.balanceOf(address(this)) >= amount, "Insufficient XRPL balance");
        bool success = xrplToken.transfer(owner, amount);
        require(success, "Withdraw failed");
    }

    function withdrawCredits(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        require(carbonCreditToken.balanceOf(address(this)) >= amount, "Insufficient credit balance");
        bool success = carbonCreditToken.transfer(owner, amount);
        require(success, "Withdraw failed");
    }

    function getMarketplaceInfo() external view returns (
        uint256 creditBalance,
        uint256 xrplBalance,
        uint256 currentBuyPrice,
        uint256 currentSellPrice
    ) {
        creditBalance = carbonCreditToken.balanceOf(address(this));
        xrplBalance = xrplToken.balanceOf(address(this));
        currentBuyPrice = buyPrice;
        currentSellPrice = sellPrice;
    }
}
