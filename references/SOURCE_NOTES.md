# Source and verification notes · 2026-09-09

The instructor's supplied *COMSCI_ECON206_Wednesday_Tools_and_Practice.pdf* and existing integrated Week 3 slide deck determined the baseline examples. The current instruction narrows the executable scope to two notebooks. Earlier signaling, advanced-equilibrium and PS1 demo notebooks are not included here.

The two supplied Colab Drive links could not be read during preparation. They are retained as legacy links rather than cited as code sources. The notebooks in this archive were written as new, self-contained, annotated teaching examples.

Current API signatures were inspected in installed QuantEcon 0.11.4, Nashpy 0.0.43 and PyGambit 16.7.0. The current PyGambit `add_outcome` API uses explicit `label=` and `payoffs=` arguments, and player lookups use labels. The examples do not assume obsolete integer player indexing. `enumpure_solve` enumerates pure Nash profiles; SPNE is checked separately.

Li et al. (2024), §4.3/4.3.1, explicitly uses Nashpy's Lemke–Howson implementation. Gemp et al. (ICLR 2024), Appendix C.1 (PDF p.45), compares seven Gambit methods. The full author/official PDFs were inspected to establish actual use. QuantEcon's JOSS article is categorized as a software paper, and its Markov-perfect-equilibrium lecture as a tutorial. Neither is mislabeled as an independent adoption study. GTE's software paper supplies worked demonstrations.

Gambit's current official citation names Rahul Savani and Theodore L. Turocy. The citation here records version 16.7.0 and the 2026 year of this teaching release. The PyPI metadata identifies the Gambit license as GPL-2.0-or-later. License texts for the ten tools in the README were downloaded from their upstream repositories; no software binaries or third-party article PDFs are bundled.

GTE's upstream README describes a Flash/ActionScript GUI. Live builder operation was not established. Desktop UI instructions follow official Gambit documentation; the desktop application was not launched here. A browser or student-account Colab session was not used to certify the notebook widgets. See the actual local execution and callback records in `outputs/`.

## Three-Lens Studio extension · 2026-09-15

The instructor's Monday TED Talk and peer-evaluation observations determine the intervention: students need observable checks for a complete strategic model, an evidence-grounded interdisciplinary contribution, and a three-persona explanation of a collective-choice problem. The site maps those observations to a game card, literature stress test, and school-choice mechanism comparison.

The AI Economist case is grounded in the Science Advances article (DOI `10.1126/sciadv.abk2607`) and the archived official Salesforce repository. It is used as an integration exemplar. The materials do not assert that it is the only interdisciplinary paper or that any student project is novel. The generated prompt asks for candidate counterexamples and marks unverified details; a human must inspect every cited source and revise or withdraw unsupported claims.

School-choice definitions and claims are anchored in Gale and Shapley (1962), Abdulkadiroğlu and Sönmez (2003), Abdulkadiroğlu et al. (2005), and the official 2012 Prize materials. The supplied simulation demonstrates one unstable Boston outcome and one profitable Boston misreport. Those counterexamples can falsify universal properties, but the notebook explicitly distinguishes them from a proof of deferred acceptance's general properties.

The visual system takes high-level cues from the instructor's three Hugging Face Spaces—dark scientific canvas, cyan/violet/amber semantic accents, progressive scenes, glass panels, and restrained motion. No source code, branded illustration, or 3D asset was copied. The released site uses original HTML, CSS, JavaScript, and inline SVG; it has no external runtime dependency or analytics call.

## Week 5 auction-design extension · 2026-09-22

The Week 5 slide specification and the supplied two-page *Strategic Thinking and Auction Application Map* determine the progression: classify timing and information; connect the representation to NE/BNE/SPNE/PBE or DSIC; compare first-price, second-price, English, Dutch, and all-pay formats; verify revenue equivalence; then audit objectives and benchmark failures.

The auction engine and Notebook 04 are instructor-created, transparent one-item examples. The first-price, second-price, English, Dutch, and all-pay benchmark claims are anchored in Vickrey (1961), Riley and Samuelson (1981), Myerson (1981), Milgrom and Weber (1982), Hillman and Riley (1989), and Krishna and Morgan (1997). The extensions are bounded with Haile (2003) for resale, Hassidim et al. (2017) for participant understanding/reporting, and Akbarpour and Li (2020) for credibility. Classroom bidding is described as exploratory behavioral evidence, not population-level causal evidence.

AuctionNet is cited from the official NeurIPS 2024 Datasets and Benchmarks proceedings and its Apache-2.0 repository. It is presented as a large-scale automated-bidding frontier, not copied into the lightweight classroom environment. No AuctionNet dataset, model weight, or third-party paper figure is bundled.

The browser lab uses no API, account, analytics service, or server-side persistence. The revenue-equivalence simulation uses a deterministic seed. The common-value, resale, collusion, and shill-bid cases are labeled diagnostics or counterexamples rather than full equilibrium proofs. Saved notebook tables and figures provide an execution-free fallback.
