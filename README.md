Run these in order from the project directory:

Terminal 1:
cd "C:\Users\nicky\OneDrive\Fintech Hackation 2025\fintech-summit"
npx hardhat node

Terminal 2:
cd "C:\Users\nicky\OneDrive\Fintech Hackation 2025\fintech-summit"
npx hardhat run scripts/deploy.ts --network localhost

Terminal 3:
cd "C:\Users\nicky\OneDrive\Fintech Hackation 2025\fintech-summit\frontend\carbon-trading"
npm start

# Carbon Credit Trading Platform

A decentralised carbon credit exchange built on the XRPL EVM Sidechain using ERC-20 fungible tokens.

---

## Prerequisites

- [Node.js](https://nodejs.org) v18+
- [MetaMask](https://metamask.io) browser extension
- Git

---

## First-Time Setup

Install dependencies for the project root (Hardhat):

```bash
npm install
```

Install dependencies for the frontend:

```bash
cd frontend/carbon-trading
npm install
cd ../..
```

---

## Running Locally (Development)

You need **three terminals** running simultaneously.

### Terminal 1 — Start the local blockchain

```bash
npx hardhat node
```

Leave this running. It starts a local Ethereum node at `http://127.0.0.1:8545` and prints 20 test accounts with private keys.

### Terminal 2 — Deploy the contracts

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

This deploys both contracts and automatically writes the contract addresses to `frontend/carbon-trading/src/contracts/deployed-addresses.json`.

> **Important:** Run this every time you restart Terminal 1. The local blockchain resets on restart and all contracts are wiped.

### Terminal 3 — Start the frontend

```bash
cd frontend/carbon-trading
npm start
```

The app opens at `http://localhost:3000`.

> **Important:** If you redeployed in Terminal 2, restart `npm start` so the frontend picks up the new contract addresses.

---

## MetaMask Setup (First Time Only)

### 1. Add the Hardhat Local network

In MetaMask → Settings → Networks → Add a network manually:

| Field | Value |
|---|---|
| Network name | Hardhat Local |
| RPC URL | http://127.0.0.1:8545 |
| Chain ID | 31337 |
| Currency symbol | ETH |

### 2. Import the deployer account

Copy the private key of **Account #0** from the Terminal 1 output (the account printed first). In MetaMask → Import Account → paste the private key.

This account is the contract owner and has admin access in the app.

---

## Deploying to XRPL EVM Sidechain (Production)

### 1. Create a `.env` file in the project root

```
PRIVATE_KEY=your_wallet_private_key_here
```

### 2. Get testnet XRP for gas

Visit `https://faucet.xrplevm.org` and paste your wallet address to receive testnet XRP.

### 3. Add XRPL EVM Sidechain to MetaMask

| Field | Value |
|---|---|
| Network name | XRPL EVM Sidechain |
| RPC URL | https://rpc-evm-sidechain.xrpl.org |
| Chain ID | 1440002 |
| Currency symbol | XRP |

### 4. Deploy

```bash
npx hardhat run scripts/deploy.ts --network xrplEvmSidechain
```

### 5. Restart the frontend

```bash
cd frontend/carbon-trading
npm start
```

Switch MetaMask to the XRPL EVM Sidechain network and open `http://localhost:3000`.

---

## Other Useful Commands

```bash
# Compile contracts
npx hardhat compile

# Open interactive blockchain console
npx hardhat console --network localhost

# Run tests
npx hardhat test
```

---

## Project Structure

```
fintech-summit/
├── contracts/
│   ├── CarbonCredit.sol              # ERC-20 carbon credit token
│   └── CarbonCreditMarketPlace.sol   # Fixed-price exchange
├── scripts/
│   └── deploy.ts                     # Deployment script
├── frontend/
│   └── carbon-trading/
│       ├── src/
│       │   ├── App.js                # Main React app
│       │   └── contracts/            # ABIs + deployed addresses
│       └── package.json
├── hardhat.config.ts
└── .env                              # Private key (never commit this)
```
