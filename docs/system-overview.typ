= Carbon Credit Trading Platform — Complete System Overview

== 1. The Problem This Solves

Companies emit CO₂. Governments and markets require them to *offset* those emissions by purchasing carbon credits. Each credit represents 1 tonne of CO₂ offset.

*Problems with traditional carbon markets:*

- Centralised databases — can be falsified or hacked
- Credits get double-counted (sold to two buyers)
- No transparency — cannot verify if a credit was actually retired
- Slow, expensive brokers and middlemen

*Our solution:* Put everything on a blockchain. Every mint, trade, and retirement is permanently recorded, publicly verifiable, and mathematically impossible to fake.

---

== 2. ERC-721 vs ERC-20 — Why It Matters

This is the most important architectural decision in the whole system.

=== ERC-721 (NFTs) — What the Old System Used

ERC-721 tokens are *non-fungible* — each token is unique and has its own ID.

#block(fill: luma(230), inset: 10pt, radius: 4pt)[
```
Token #1 → owned by Company A
Token #2 → owned by Company B
Token #3 → owned by Company A
```
]

Think of them like serial-numbered banknotes. Every note is tracked individually.

*Problems for carbon credits:*

- To find how many credits Company A owns, you must scan every single token ID — O(n) complexity, gets slower as supply grows
- Trading requires specifying exact token IDs: "I want to buy token \#47 and \#203"
- Credits are supposed to be interchangeable — one tonne of CO₂ is identical to another tonne. There is no reason credit \#47 should be different from credit \#203
- Buying 100 credits = 100 separate NFT transfers = 100× gas cost

=== ERC-20 (Fungible Tokens) — What the Current System Uses

ERC-20 tokens are *fungible* — every token is identical, like cash.

#block(fill: luma(230), inset: 10pt, radius: 4pt)[
```
Company A balance: 500 CREDIT
Company B balance: 200 CREDIT
```
]

Think of them like dollar bills. You do not care which specific dollar you have — \$1 = \$1.

*Why this is correct for carbon credits:*

- 1 tonne of CO₂ offset = 1 tonne, regardless of which token it is
- Balance lookup is O(1) — instant, no scanning
- Trading is amount-based — "buy 100 credits", not "buy token \#47, \#203..."
- 100 credits transferred in 1 transaction — 100× cheaper gas
- Standard DeFi tooling works out of the box (wallets, exchanges, analytics)

=== Direct Comparison

#table(
  columns: (auto, auto, auto),
  [*Property*], [*ERC-721 (old)*], [*ERC-20 (current)*],
  [Token model], [Each credit has unique ID], [All credits identical],
  [Balance lookup], [Scan all tokens O(n)], [Direct mapping O(1)],
  [Transfer 100 credits], [100 transactions], [1 transaction],
  [Trading], [Specify token IDs], [Specify amount],
  [Makes sense for], [Art, collectibles, unique assets], [Currency, commodities, credits],
  [Carbon credit fit], [Wrong — credits are not unique], [Correct — 1t CO₂ = 1t CO₂],
)

---

== 3. Smart Contract Architecture

The system uses two contracts, deliberately separated — this is the *separation of concerns* pattern.

#block(fill: luma(230), inset: 10pt, radius: 4pt)[
```
┌─────────────────────┐         ┌──────────────────────────┐
│   CarbonCredit.sol  │         │ CarbonCreditMarketplace  │
│   (The Asset)       │◄────────│ (The Exchange)           │
│                     │         │                          │
│  ERC-20 token       │         │  Holds pool of credits   │
│  Mint / Burn        │         │  Buy / Sell at fixed     │
│  Redeem tracking    │         │  price                   │
└─────────────────────┘         └──────────────────────────┘
```
]

=== Contract 1: CarbonCredit.sol

Inherits from:

#block(fill: luma(230), inset: 10pt, radius: 4pt)[
```solidity
contract CarbonCredit is ERC20, Ownable
```
]

- `ERC20` — provides `balanceOf`, `transfer`, `approve`, `transferFrom`, `totalSupply` for free from OpenZeppelin
- `Ownable` — provides the `onlyOwner` modifier and ownership transfer logic

*Key design decisions:*

`decimals()` returns `0` — normally ERC-20 tokens have 18 decimal places (like ETH). Carbon credits are whole units — you cannot have 0.5 of a tonne. Setting decimals to 0 means 1 token = 1 credit with no fractional amounts possible.

`mintCredits()` is `onlyOwner` — only the contract deployer can create new credits. This prevents inflation fraud.

`redeemCredits()` is *not* restricted — any holder can retire their own credits. A company holding 100 credits calls `redeemCredits(100, "EM-2025-001")` themselves to prove they offset 100 tonnes. No admin needed.

*Why ERC20Burnable was removed:* OpenZeppelin's `ERC20Burnable` adds a public `burn()` function. If kept, anyone could burn tokens silently without recording which emission they offset. Removing it means the *only* way to destroy credits is through `redeemCredits()`, which forces an emission ID to be recorded. Every retirement is tracked.

*State tracked on-chain:*

#block(fill: luma(230), inset: 10pt, radius: 4pt)[
```solidity
mapping(string => uint256) public redemptionsByEmission;
// "EM-2025-001" → 500  (500 tonnes offset for this emission)

mapping(address => uint256) public totalRedeemed;
// 0xCompany → 1200   (company has retired 1200 credits total)
```
]

This is the audit trail. Permanently on-chain. Regulators, investors, and the public can query it at any time.

=== Contract 2: CarbonCreditMarketplace.sol

Does *not* inherit ERC-20 — it is not a token itself. It is a program that holds tokens.

#block(fill: luma(230), inset: 10pt, radius: 4pt)[
```
Marketplace holds:
  ├── Carbon Credits (ERC-20 balance)
  └── XRPL Tokens   (ERC-20 balance)

Buy:  user pays XRPL  → gets credits from pool
Sell: user pays credits → gets XRPL from pool
```
]

This is a *fixed-price model*, not an AMM. The owner sets prices manually — appropriate for a regulated commodity where prices are set by policy, not speculation.

The two-token design uses the `IERC20` interface:

#block(fill: luma(230), inset: 10pt, radius: 4pt)[
```solidity
IERC20 public carbonCreditToken;  // the CarbonCredit contract
IERC20 public xrplToken;          // payment currency
```
]

The marketplace treats both as generic ERC-20 tokens. It does not care about implementation details — it only calls `transfer` and `transferFrom`. This is the *interface segregation principle*: depend on the minimal interface, not the full implementation.

*How `buyCredits()` works step by step:*

#block(fill: luma(230), inset: 10pt, radius: 4pt)[
```
1. User calls approve(marketplaceAddress, 100 XRPL) on the XRPL token contract
   → gives marketplace permission to pull 100 XRPL from user's wallet

2. User calls buyCredits(1) on marketplace
   → marketplace checks: do I have ≥1 credit in my pool? yes
   → marketplace pulls 100 XRPL from user via transferFrom
   → marketplace sends 1 CREDIT to user via transfer
   → emits CreditsPurchased event
```
]

The `approve` step is required by ERC-20 security — contracts cannot take tokens without explicit permission.

---

== 4. OpenZeppelin — Why It Is Used

#block(fill: luma(230), inset: 10pt, radius: 4pt)[
```solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
```
]

OpenZeppelin is the industry-standard library for smart contracts. Their code has been audited by professional security firms and battle-tested with billions of dollars in production. Inheriting from OpenZeppelin provides:

- Correct ERC-20 standard compliance
- Integer overflow protection (built into Solidity 0.8+)
- Reentrancy-safe transfer logic
- Standard ownership pattern

---

== 5. The Wallet and Cryptographic Signing

Every blockchain transaction must be *cryptographically signed* — proof that the sender authorised it.

#block(fill: luma(230), inset: 10pt, radius: 4pt)[
```
Private key (secret) → mathematically derives → Public address (0xf39F...)

To send a transaction:
  sign(transaction_data, private_key) → signature

Anyone can verify:
  verify(signature, transaction_data) → confirms it came from 0xf39F...
```
]

This is *asymmetric cryptography*. You can prove you authorised a transaction without revealing your private key. MetaMask holds the private key and performs the signing.

This is also why `onlyOwner` works — the contract checks `msg.sender` (the address that signed the transaction) against the stored `owner`. Only someone with the owner's private key can produce a valid signature from that address.

---

== 6. ethers.js — The Bridge Between Frontend and Blockchain

#block(fill: luma(230), inset: 10pt, radius: 4pt)[
```javascript
// This JavaScript:
const tx = await carbonCreditContract.mintCredits(toAddress, 100);
await tx.wait();

// Gets encoded into:
// - Function selector (first 4 bytes of keccak256("mintCredits(address,uint256)"))
// - ABI-encoded parameters
// - Sent as a transaction to the contract address
// - MetaMask signs it
// - Hardhat / XRPL node executes it
```
]

The *ABI* (Application Binary Interface) is the JSON file in `src/contracts/CarbonCredit.json`. It tells ethers.js the exact function signatures and parameter types so it can encode calls correctly. If the ABI is stale, function calls get encoded wrong and fail — which is why recompiling and copying the ABI after any contract change is essential.

---

== 7. Why XRPL EVM Sidechain

The XRPL EVM Sidechain is *EVM-compatible* — it runs the exact same Ethereum Virtual Machine. The Solidity bytecode runs identically. Nothing in the contracts changes between networks. The differences are:

- Gas is paid in XRP instead of ETH
- The XRPL token at `0x39fBBABf...` is a real wrapped XRP ERC-20 that already exists on the sidechain
- Transactions settle in 3–4 seconds (vs Ethereum's ~12 seconds)
- Fees are fractions of a cent (vs Ethereum's variable gas costs)

This makes it ideal for carbon credit trading — Ripple's fast cross-border payment rails handle settlement, while the smart contracts enforce the rules.

---

== 8. The Full Credit Lifecycle

#block(fill: luma(230), inset: 10pt, radius: 4pt)[
```
ADMIN
  mintCredits(1000, marketplaceAddress)
  → 1000 CREDIT tokens created, sit in marketplace pool

COMPANY buys credits
  xrplToken.approve(marketplace, 500 XRPL)   ← grant permission
  marketplace.buyCredits(5)                   ← buy 5 credits for 500 XRPL
  → company now holds 5 CREDIT in wallet

COMPANY reduces emissions, wants to prove offset
  carbonCredit.redeemCredits(5, "EM-2025-001")
  → 5 CREDIT burned forever
  → redemptionsByEmission["EM-2025-001"] += 5
  → totalRedeemed[company] += 5
  → CreditsRedeemed event emitted on-chain

REGULATOR audits
  carbonCredit.getRedemptionsByEmission("EM-2025-001")
  → returns 5
  → tamper-proof, permanently on-chain, no middleman needed
```
]

---

== 9. Why Blockchain vs a Normal Database

#table(
  columns: (auto, auto, auto),
  [*Property*], [*Normal Database*], [*This Blockchain System*],
  [Who controls it], [Database admin], [Nobody — code is law],
  [Can records be edited], [Yes], [No — immutable history],
  [Transparency], [Private], [Public — anyone can audit],
  [Double spending], [Possible if poorly coded], [Mathematically impossible],
  [Trust requirement], [Trust the company], [Trust the math],
  [Cross-border settlement], [Days via banks], [Seconds via XRP],
  [Credit retirement proof], [PDF certificate], [On-chain transaction hash],
)

---

== 10. Fixed Price vs AMM — Market Design Decision

=== What the Current System Uses (Fixed Price)

The owner manually sets buy and sell prices. Simple and predictable.

#table(
  columns: (auto, auto),
  [*Parameter*], [*Value*],
  [Buy Price], [100 XRPL per credit (always)],
  [Sell Price], [80 XRPL per credit (always)],
  [Spread], [20 XRPL = marketplace profit],
)

=== What an AMM Would Be (e.g. Uniswap x·y = k)

Price is determined automatically by the ratio of tokens in the pool.

#block(fill: luma(230), inset: 10pt, radius: 4pt)[
```
Pool: 1000 CREDIT + 100,000 XRPL
Price = XRPL reserve / CREDIT reserve = 100 XRPL per credit

Someone buys 100 credits →
Pool: 900 CREDIT + 110,000 XRPL
New price = 110,000 / 900 = 122 XRPL per credit  ← price moved
```
]

Price rises when people buy, falls when people sell. Purely market-driven.

=== Why Fixed Price Is Correct Here

*1. Carbon Credits Are a Regulated Commodity*

Carbon credit prices are set by policy, compliance schemes (EU ETS, Kyoto, etc.) and verified standards bodies — not by speculative trading. An AMM would let the price swing wildly based on volume, which is inappropriate for a compliance instrument.

*2. AMMs Require Liquidity Providers*

An AMM only works if someone deposits both tokens into the pool simultaneously. This requires liquidity providers earning fees to participate, plus impermanent loss protection mechanisms. This is an entire additional system — unnecessary complexity for a carbon credit platform.

*3. Users Are Buyers, Not Speculators*

Companies buying credits need predictable costs for compliance budgeting. An AMM creates price uncertainty. A company offsetting 1000 tonnes does not want the price moving mid-transaction.

*4. Small Liquidity Breaks an AMM*

AMMs work well with deep liquidity (millions in the pool). With a small pool, a single large purchase would massively spike the price — known as *price impact* or slippage — making the system unusable at small scale.

=== Comparison

#table(
  columns: (auto, auto, auto),
  [*Scenario*], [*AMM*], [*Fixed Price*],
  [Speculative trading market], [✓], [],
  [Deep liquidity, many traders], [✓], [],
  [Price discovery needed], [✓], [],
  [Compliance / regulated instrument], [], [✓],
  [Predictable costs for buyers], [], [✓],
  [Small liquidity pool], [], [✓],
  [Admin controls pricing policy], [], [✓],
)

=== Verdict

Fixed price is the correct choice for this use case. If greater sophistication is required, the appropriate upgrade is not an AMM but an *oracle-based price feed* — pegging the credit price to a real-world carbon market index such as the EU ETS spot price. This keeps prices anchored to reality rather than being set arbitrarily by the administrator.
