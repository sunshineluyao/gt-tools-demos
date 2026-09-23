# Deploy the Three-Lens Studio on Vercel

The tutorial is a dependency-free static site. It uses no API key, database, analytics script, or server-side service.

## One-click Git import

1. Open the [pre-filled Vercel import page](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsunshineluyao%2Fgt-tools-demos).
2. Sign in to Vercel and choose the Git account or team that should own the copy.
3. Keep the detected settings. The repository's `vercel.json` runs `npm run build` and publishes `dist/`.
4. Select **Deploy**. No environment variables are required.
5. Open the deployed URL and test the strategic, auction, contribution, and matching modules on desktop and mobile.

Vercel's official [Git integration documentation](https://vercel.com/docs/git) explains preview deployments for branches and pull requests and production deployments from the configured production branch.

## Local preflight

Node.js 20 or later is sufficient:

```bash
npm test
npm run build
python -m http.server 4173 --directory dist
```

Open `http://localhost:4173`. Confirm that:

- the model gate rejects fewer than two players or fewer than two strategies per player;
- Nash, Selten, and Harsanyi examples produce the expected diagnosis;
- each auction format displays the correct game class, representation, and BNE/DSIC/PBE mapping;
- benchmark and manual bids update the allocation, payment, utility, and objective dashboard;
- the seeded revenue-equivalence check displays all five formats and the theoretical marker;
- bounded-behavior, risk, common-value, resale, collusion, and seller-credibility stress tests render without implying a proof;
- the abstract checker requires sentence two to begin with “However” or “Yet” and identify a gap;
- the generated literature prompt never claims to certify novelty;
- Boston finishes with the blocking pair Bo–Aurora in the supplied example;
- deferred acceptance finishes without a blocking pair in the supplied example;
- tabs, buttons, dialog, and matching animation work with a keyboard;
- reduced-motion preferences suppress decorative animation.

## Scope and privacy

All form data remains in the browser and disappears on refresh. The literature stress-test tool generates a prompt; it does not call an AI service. Students must verify bibliographic claims in primary sources and disclose any AI assistance.
