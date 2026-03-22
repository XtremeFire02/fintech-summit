import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy the CarbonCredit ERC-20 contract
  const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
  const carbonCredit = await CarbonCredit.deploy(deployer.address);
  await carbonCredit.waitForDeployment();

  const carbonCreditAddress = await carbonCredit.getAddress();
  console.log("CarbonCredit (ERC-20) deployed to:", carbonCreditAddress);

  // XRPL token address — replace with actual address on your network
  const xrplTokenAddress = "0x39fBBABf11738317a448031930706cd3e612e1B9";

  // Initial prices (in XRPL token wei — 18 decimals)
  // e.g. 100 XRPL tokens per carbon credit
  const initialBuyPrice = ethers.parseUnits("100", 18);
  const initialSellPrice = ethers.parseUnits("80", 18);

  // Deploy the CarbonCreditMarketplace
  const CarbonCreditMarketplace = await ethers.getContractFactory("CarbonCreditMarketplace");
  const marketplace = await CarbonCreditMarketplace.deploy(
    carbonCreditAddress,
    xrplTokenAddress,
    initialBuyPrice,
    initialSellPrice
  );
  await marketplace.waitForDeployment();

  const marketplaceAddress = await marketplace.getAddress();
  console.log("CarbonCreditMarketplace deployed to:", marketplaceAddress);

  // Seed the marketplace with initial credits
  const seedAmount = 1000;
  const mintTx = await carbonCredit.mintCredits(marketplaceAddress, seedAmount);
  await mintTx.wait();
  console.log(`Minted ${seedAmount} credits to marketplace`);

  // Write deployed addresses to frontend so App.js always has the right ones
  const addresses = {
    CARBON_CREDIT_ADDRESS: carbonCreditAddress,
    MARKETPLACE_ADDRESS: marketplaceAddress,
    XRPL_TOKEN_ADDRESS: xrplTokenAddress
  };
  const outPath = path.join(__dirname, "..", "frontend", "carbon-trading", "src", "contracts", "deployed-addresses.json");
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log("Wrote deployed addresses to:", outPath);

  console.log("\nDeployment completed!");
  console.log("Buy price:", ethers.formatUnits(initialBuyPrice, 18), "XRPL per credit");
  console.log("Sell price:", ethers.formatUnits(initialSellPrice, 18), "XRPL per credit");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
