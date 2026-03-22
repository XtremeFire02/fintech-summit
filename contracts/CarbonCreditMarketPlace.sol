// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title CarbonCreditMarketplace — AMM with constant product formula (x * y = k)
/// @notice Price is determined by the ratio of reserves. Every trade shifts the price.
///         Heavy buyers push the price up, incentivising emission reductions over credit purchases.
contract CarbonCreditMarketplace {
    IERC20 public carbonCreditToken;
    IERC20 public xrplToken;
    address public owner;

    uint256 public creditReserve;
    uint256 public xrplReserve;

    uint256 public constant FEE_NUMERATOR = 3;
    uint256 public constant FEE_DENOMINATOR = 1000; // 0.3% fee

    event CreditsPurchased(address indexed buyer, uint256 creditAmount, uint256 xrplPaid);
    event CreditsSold(address indexed seller, uint256 creditAmount, uint256 xrplReceived);
    event LiquidityAdded(address indexed provider, uint256 creditAmount, uint256 xrplAmount);
    event LiquidityRemoved(address indexed provider, uint256 creditAmount, uint256 xrplAmount);

    constructor(address carbonCreditAddress, address xrplTokenAddress) {
        carbonCreditToken = IERC20(carbonCreditAddress);
        xrplToken = IERC20(xrplTokenAddress);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action");
        _;
    }

    /// @notice Add liquidity to the pool. Both tokens must be approved first.
    function addLiquidity(uint256 creditAmount, uint256 xrplAmount) external onlyOwner {
        require(creditAmount > 0 && xrplAmount > 0, "Amounts must be > 0");

        bool creditSuccess = carbonCreditToken.transferFrom(msg.sender, address(this), creditAmount);
        require(creditSuccess, "Credit transfer failed");

        bool xrplSuccess = xrplToken.transferFrom(msg.sender, address(this), xrplAmount);
        require(xrplSuccess, "XRPL transfer failed");

        creditReserve += creditAmount;
        xrplReserve += xrplAmount;

        emit LiquidityAdded(msg.sender, creditAmount, xrplAmount);
    }

    /// @notice Remove liquidity from the pool.
    function removeLiquidity(uint256 creditAmount, uint256 xrplAmount) external onlyOwner {
        require(creditAmount <= creditReserve, "Exceeds credit reserve");
        require(xrplAmount <= xrplReserve, "Exceeds XRPL reserve");

        creditReserve -= creditAmount;
        xrplReserve -= xrplAmount;

        bool creditSuccess = carbonCreditToken.transfer(msg.sender, creditAmount);
        require(creditSuccess, "Credit transfer failed");

        bool xrplSuccess = xrplToken.transfer(msg.sender, xrplAmount);
        require(xrplSuccess, "XRPL transfer failed");

        emit LiquidityRemoved(msg.sender, creditAmount, xrplAmount);
    }

    /// @notice Buy credits from the pool. User specifies desired credit amount out.
    ///         XRPL cost is calculated by the constant product formula with 0.3% fee.
    function buyCredits(uint256 creditAmountOut) external {
        require(creditAmountOut > 0, "Amount must be > 0");
        require(creditAmountOut < creditReserve, "Insufficient pool credits");

        uint256 xrplRequired = getBuyQuote(creditAmountOut);

        bool xrplSuccess = xrplToken.transferFrom(msg.sender, address(this), xrplRequired);
        require(xrplSuccess, "XRPL payment failed");

        bool creditSuccess = carbonCreditToken.transfer(msg.sender, creditAmountOut);
        require(creditSuccess, "Credit transfer failed");

        xrplReserve += xrplRequired;
        creditReserve -= creditAmountOut;

        emit CreditsPurchased(msg.sender, creditAmountOut, xrplRequired);
    }

    /// @notice Sell credits to the pool. User specifies credit amount to sell.
    ///         XRPL payout is calculated by the constant product formula with 0.3% fee.
    function sellCredits(uint256 creditAmountIn) external {
        require(creditAmountIn > 0, "Amount must be > 0");

        uint256 xrplOut = getSellQuote(creditAmountIn);
        require(xrplOut > 0, "Insufficient output");

        bool creditSuccess = carbonCreditToken.transferFrom(msg.sender, address(this), creditAmountIn);
        require(creditSuccess, "Credit transfer failed");

        bool xrplSuccess = xrplToken.transfer(msg.sender, xrplOut);
        require(xrplSuccess, "XRPL payout failed");

        creditReserve += creditAmountIn;
        xrplReserve -= xrplOut;

        emit CreditsSold(msg.sender, creditAmountIn, xrplOut);
    }

    /// @notice Preview: how much XRPL is needed to buy `creditAmountOut` credits.
    function getBuyQuote(uint256 creditAmountOut) public view returns (uint256) {
        require(creditAmountOut < creditReserve, "Exceeds pool credits");
        // x_new * y_new = k => (creditReserve - out) * (xrplReserve + in) = creditReserve * xrplReserve
        // Solving for in (with 0.3% fee applied to input):
        // in = (xrplReserve * out * 1000) / ((creditReserve - out) * 997) + 1
        uint256 numerator = xrplReserve * creditAmountOut * 1000;
        uint256 denominator = (creditReserve - creditAmountOut) * 997;
        return (numerator / denominator) + 1; // round up so k never decreases
    }

    /// @notice Preview: how much XRPL the user gets for selling `creditAmountIn` credits.
    function getSellQuote(uint256 creditAmountIn) public view returns (uint256) {
        // xrplOut = (xrplReserve * creditAmountIn * 997) / (creditReserve * 1000 + creditAmountIn * 997)
        uint256 amountInWithFee = creditAmountIn * 997;
        uint256 numerator = amountInWithFee * xrplReserve;
        uint256 denominator = (creditReserve * 1000) + amountInWithFee;
        return numerator / denominator; // round down (user gets slightly less)
    }

    /// @notice Current spot price: XRPL per 1 credit (scaled to 18 decimals).
    function getSpotPrice() public view returns (uint256) {
        require(creditReserve > 0, "Pool empty");
        return (xrplReserve * 1e18) / creditReserve;
    }

    /// @notice Returns pool info for the frontend.
    function getMarketplaceInfo() external view returns (
        uint256 _creditReserve,
        uint256 _xrplReserve,
        uint256 spotPrice
    ) {
        _creditReserve = creditReserve;
        _xrplReserve = xrplReserve;
        spotPrice = creditReserve > 0 ? (xrplReserve * 1e18) / creditReserve : 0;
    }
}
