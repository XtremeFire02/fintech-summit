import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy a mock XRPL token for local testing (on XRPL sidechain, use the real one)
  const MockXRPL = await ethers.getContractFactory("MockXRPLToken");
  const mockXrpl = await MockXRPL.deploy();
  await mockXrpl.waitForDeployment();
  const xrplTokenAddress = await mockXrpl.getAddress();
  console.log("MockXRPLToken deployed to:", xrplTokenAddress);

  // Deploy the CarbonCredit ERC-20 contract
  const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
  const carbonCredit = await CarbonCredit.deploy(deployer.address);
  await carbonCredit.waitForDeployment();
  const carbonCreditAddress = await carbonCredit.getAddress();
  console.log("CarbonCredit (ERC-20) deployed to:", carbonCreditAddress);

  // Deploy the CarbonCreditMarketplace (AMM)
  const CarbonCreditMarketplace = await ethers.getContractFactory("CarbonCreditMarketplace");
  const marketplace = await CarbonCreditMarketplace.deploy(
    carbonCreditAddress,
    xrplTokenAddress
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("CarbonCreditMarketplace (AMM) deployed to:", marketplaceAddress);

  // Seed the liquidity pool with 1000 credits + 100,000 XRPL
  // This sets the initial price at 100 XRPL per credit
  const seedCredits = ethers.parseUnits("1000", 18);
  const seedXrpl = ethers.parseUnits("100000", 18);

  // Mint credits to deployer
  const mintTx = await carbonCredit.mintCredits(deployer.address, seedCredits);
  await mintTx.wait();
  console.log("Minted 1000 credits to deployer");

  // Approve marketplace to spend deployer's credits and XRPL
  const approveCreditTx = await carbonCredit.approve(marketplaceAddress, seedCredits);
  await approveCreditTx.wait();
  const approveXrplTx = await mockXrpl.approve(marketplaceAddress, seedXrpl);
  await approveXrplTx.wait();

  // Add liquidity to the pool
  const addLiqTx = await marketplace.addLiquidity(seedCredits, seedXrpl);
  await addLiqTx.wait();
  console.log("Added liquidity: 1000 credits + 100,000 XRPL");

  // Write deployed addresses to frontend
  const addresses = {
    CARBON_CREDIT_ADDRESS: carbonCreditAddress,
    MARKETPLACE_ADDRESS: marketplaceAddress,
    XRPL_TOKEN_ADDRESS: xrplTokenAddress
  };
  const outPath = path.join(__dirname, "..", "frontend", "carbon-trading", "src", "contracts", "deployed-addresses.json");
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log("Wrote deployed addresses to:", outPath);

  const spotPrice = await marketplace.getSpotPrice();
  console.log("\nDeployment completed!");
  console.log("Initial spot price:", ethers.formatUnits(spotPrice, 18), "XRPL per credit");
  console.log("Pool: 1000 credits + 100,000 XRPL tokens");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
