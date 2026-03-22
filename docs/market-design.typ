= Fixed Price vs AMM — Which Is Right for Carbon Credit Trading

== What We Currently Have (Fixed Price)

The owner manually sets buy and sell prices. Simple and predictable.

#table(
  columns: (auto, auto),
  [*Parameter*], [*Value*],
  [Buy Price], [100 XRPL per credit (always)],
  [Sell Price], [80 XRPL per credit (always)],
  [Spread], [20 XRPL = marketplace profit],
)

== What an AMM Would Be (e.g. Uniswap x·y = k)

Price is determined automatically by the ratio of tokens in the pool.

#block(
  fill: luma(230),
  inset: 10pt,
  radius: 4pt,
)[
```
Pool: 1000 CREDIT + 100,000 XRPL
Price = XRPL reserve / CREDIT reserve = 100 XRPL per credit

Someone buys 100 credits →
Pool: 900 CREDIT + 110,000 XRPL
New price = 110,000 / 900 = 122 XRPL per credit  ← price moved
```
]

Price rises when people buy, falls when people sell. Purely market-driven.

== The Case for Fixed Price in Carbon Credit Markets

*Fixed price is more appropriate.* Here is why:

=== 1. Carbon Credits Are a Regulated Commodity

Carbon credit prices in the real world are set by policy, compliance schemes (EU ETS, Kyoto, etc.) and verified standards bodies — not by speculative trading. An AMM would let the price swing wildly based on buy/sell volume, which is inappropriate for a compliance instrument.

=== 2. AMMs Require Liquidity Providers

An AMM only works if someone deposits both tokens into the pool. This requires:

- Someone to deposit CREDIT tokens *and* XRPL tokens simultaneously
- Liquidity providers earning fees to incentivise participation
- Impermanent loss protection mechanisms

This is a whole additional system. For a carbon credit platform, it is unnecessary complexity.

=== 3. Users Are Buyers, Not Speculators

Companies buying credits want to know exactly what they will pay — predictable cost for compliance budgeting. An AMM creates price uncertainty. A company trying to offset 1000 tonnes does not want the price moving mid-transaction.

=== 4. Small Liquidity Breaks an AMM

AMMs work well with deep liquidity (millions in the pool). With a small pool, a single large purchase would massively spike the price. This is known as *price impact* or slippage, and it makes the system unusable at small scale.

== Comparison Table

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

== Verdict

Keep fixed price for this use case. If greater sophistication is required, the appropriate upgrade is not an AMM but an *oracle-based price feed* — pegging the credit price to a real-world carbon market index such as the EU ETS spot price. This keeps prices anchored to reality rather than being set arbitrarily by the administrator.
