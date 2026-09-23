# Auction Design Computational Demonstration

**COMSCI/ECON 206 · Week 5 · Auctions and Digital Markets**

Use this page with the [annotated Colab notebook](https://colab.research.google.com/github/sunshineluyao/gt-tools-demos/blob/main/notebooks/auctions/04_Auction_Design_Three_Lenses.ipynb) and the [live Three-Lens Studio](https://gt-tools-demos-sigma.vercel.app/#auctions).

## Learning path

**Classify → solve → execute → evaluate → stress-test → govern**

| Stage | Student action | Observable check |
|---|---|---|
| Classify | Identify timing, information, representation, and players' strategy spaces | Select NE, BNE, SPNE, PBE, or DSIC for a stated reason |
| Solve | State the benchmark strategy and assumptions | Reproduce the first-price best response or second-price threshold logic |
| Execute | Apply allocation and payment rules to one profile | Winner, payments, utilities, and seller revenue agree with a hand calculation |
| Evaluate | Compare revenue, welfare, efficiency, IR, budget balance, and a named fairness criterion | Explain why a revenue ranking is not a welfare or fairness ranking |
| Stress-test | Change one assumption or institutional rule | Record baseline → modification → new result → mechanism → uncertainty |
| Govern | Audit implementation, collusion, appeal, and revision | Separate participant incentives from seller credibility |

## Five-format map

| Format | Game class | Solution concept | Benchmark result |
|---|---|---|---|
| First-price sealed bid | Static + incomplete; Bayesian normal form | BNE | $b(v)=\frac{n-1}{n}v$ for risk-neutral Uniform[0,1] values |
| Second-price / Vickrey | Static + incomplete; direct mechanism | DSIC, therefore BNE | Truthful report $b(v)=v$ is weakly dominant |
| English ascending | Dynamic + incomplete; observed price history | PBE / sequential rationality | Stay while $p<v$ and exit at $p=v$ under IPV |
| Dutch descending | Dynamic + incomplete; stopping game | PBE | Outcome-equivalent to first price under the benchmark |
| All-pay | Static + incomplete; every bidder pays | BNE | $b(v)=\frac{n-1}{n}v^n$ under the benchmark |

Under the shared Uniform[0,1] benchmark, the revenue-equivalence target for all five formats is

$$
\mathbb{E}[R]=\frac{n-1}{n+1}.
$$

## What the notebook verifies

1. A first-price type's expected-utility maximizer matches the symmetric BNE formula.
2. Truthful second-price bidding is weakly optimal against a fixed rivals' bid profile.
3. English dropout and Dutch stopping rules create dynamic histories that need sequential reasoning.
4. Seeded Monte Carlo revenue converges toward $(n-1)/(n+1)$ across the five benchmark formats.
5. Allocation, payment, utility, revenue, welfare, efficiency, loser burden, ex-post IR, budget balance, and realized unilateral regret are computed from the same profile.
6. Risk, bounded behavior, common values, reserves, budgets, resale, collusion, and a seller shill bid each expose a different assumption or governance boundary.

## Required modification

Before editing the final notebook cell, write a directional prediction. Change only one of:

- auction format;
- one value, signal, or bid;
- risk-aversion coefficient;
- reserve price;
- budget cap;
- common-value assumption;
- resale cost;
- coalition behavior; or
- seller execution rule.

Report:

1. baseline;
2. exact modification;
3. changed output;
4. strategic or algorithmic mechanism causing the change;
5. one remaining uncertainty;
6. one independent check.

## Interpretation boundaries

- A realized revenue difference does not refute revenue equivalence, which is an expectation under specific assumptions.
- Positive ex-post regret does not refute BNE; it evaluates a different information timing.
- A common-value signal-bidding example demonstrates winner's curse risk but is not a derived equilibrium.
- An ex-post resale calculation is not a PBE with anticipated resale.
- A collusion flag is not proof of collusion; repeated logs and benign-alternative tests are necessary.
- Strategy-proofness for bidders does not make seller execution credible.
- Classroom play is exploratory behavioral evidence, not a representative causal estimate.

## Static and access fallback

The committed notebook contains saved tables and figures, so students can inspect the complete baseline without executing code. If Colab is unavailable, use the browser laboratory; it runs locally in the browser, stores no response on a server, and requires no API key. For a fully offline route, clone the repository and open the saved notebook before class.

## Core sources

- Vickrey, W. (1961). Counterspeculation, auctions, and competitive sealed tenders. *Journal of Finance, 16*(1), 8–37. https://doi.org/10.1111/j.1540-6261.1961.tb02789.x
- Myerson, R. B. (1981). Optimal auction design. *Mathematics of Operations Research, 6*(1), 58–73. https://doi.org/10.1287/moor.6.1.58
- Milgrom, P. R., & Weber, R. J. (1982). A theory of auctions and competitive bidding. *Econometrica, 50*(5), 1089–1122. https://doi.org/10.2307/1911865
- Akbarpour, M., & Li, S. (2020). Credible auctions: A trilemma. *Econometrica, 88*(2), 425–467. https://doi.org/10.3982/ECTA15925
- Su, K., et al. (2024). AuctionNet: A novel benchmark for decision-making in large-scale games. *NeurIPS 2024 Datasets and Benchmarks Track*. https://proceedings.neurips.cc/paper_files/paper/2024/hash/ab9b7c23edfea0011507f7e1eae82cd2-Abstract-Datasets_and_Benchmarks_Track.html
