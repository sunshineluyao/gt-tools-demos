import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('../validation/node_modules/playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const port = 4173;
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

const server = http.createServer(async (request, response) => {
  try {
    const urlPath = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
    const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
    const resolved = path.resolve(dist, relative);
    if (!resolved.startsWith(`${dist}${path.sep}`)) throw new Error('Invalid path');
    const content = await fs.readFile(resolved);
    response.writeHead(200, { 'content-type': mime[path.extname(resolved)] || 'application/octet-stream' });
    response.end(content);
  } catch {
    response.writeHead(404); response.end('Not found');
  }
});
await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true });
const errors = [];
const checks = [];

async function openPage(viewport, label) {
  console.log(`Browser QA: ${label} create page`);
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`${label} page: ${error.message}`));
  console.log(`Browser QA: ${label} navigate`);
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log(`Browser QA: ${label} wait for main`);
  await page.locator('#main').waitFor();
  console.log(`Browser QA: ${label} inspect geometry`);
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clipped: [...document.querySelectorAll('.panel, .lens-strip article, .auction-objectives article, .auction-three-lenses article, .auction-bidder, .dimension-grid article, .persona-stage article, .handoff-grid article, .round-flow section')]
      .filter((element) => element.scrollWidth > element.clientWidth + 2)
      .map((element) => `${element.tagName}.${element.className}`),
  }));
  if (geometry.scrollWidth > geometry.clientWidth + 2) errors.push(`${label}: horizontal page overflow ${geometry.scrollWidth} > ${geometry.clientWidth}`);
  if (geometry.clipped.length) errors.push(`${label}: clipped panel content in ${geometry.clipped.join(', ')}`);
  checks.push({ label, viewport, geometry });
  return page;
}

try {
  console.log('Browser QA: opening desktop view');
  const desktop = await openPage({ width: 1440, height: 1000 }, 'desktop');
  await desktop.locator('#p1-strategies').fill('Only act');
  await desktop.locator('#game-form button[type="submit"]').click();
  if (!await desktop.locator('#diagnosis').getByText('Structure gate not yet passed').isVisible()) errors.push('desktop: invalid game was not rejected');
  await desktop.locator('#p1-strategies').fill('Enter, Stay out');
  await desktop.locator('.switch-row').nth(2).click();
  await desktop.locator('#game-form button[type="submit"]').click();
  if (!await desktop.locator('#diagnosis').getByText('Harsanyi lens').isVisible()) errors.push('desktop: private-information game was not classified as Harsanyi');
  if (!await desktop.locator('#solution-harsanyi').isVisible()) errors.push('desktop: Harsanyi diagnosis did not open the type-space lab');
  await desktop.locator('#harsanyi-prior').fill('80');
  if (!await desktop.locator('#harsanyi-result').getByText(/Entrant: Stay out/).isVisible()) errors.push('desktop: Harsanyi prior did not change the entrant decision');
  await desktop.locator('#sample-harsanyi').click();
  if (!await desktop.locator('#harsanyi-sample').getByText(/Nature drew (Tough|Weak)/).isVisible()) errors.push('desktop: Harsanyi type draw did not run');

  await desktop.locator('.switch-row').nth(2).click();
  await desktop.locator('.switch-row').nth(0).click();
  await desktop.locator('.switch-row').nth(1).click();
  await desktop.locator('#game-form button[type="submit"]').click();
  if (!await desktop.locator('#diagnosis').getByText('Selten lens').isVisible()) errors.push('desktop: observed sequential game was not classified as Selten');
  if (!await desktop.locator('#solution-selten').isVisible()) errors.push('desktop: Selten diagnosis did not open the game-tree lab');
  await desktop.locator('[data-selten="fight-incumbent"]').fill('3');
  await desktop.locator('#solve-selten').click();
  if (!await desktop.locator('#selten-result').getByText(/Entrant Stay out; Incumbent Fight/).isVisible()) errors.push('desktop: backward induction did not respond to edited continuation payoffs');

  await desktop.locator('#solution-tab-nash').click();
  await desktop.locator('#trace-nash').click();
  if (!await desktop.locator('[data-payoff-cell="11"]').evaluate((element) => element.classList.contains('equilibrium-cell'))) errors.push('desktop: Nash best-response animation did not identify the equilibrium cell');

  console.log('Browser QA: checking auction laboratory');
  if (!await desktop.locator('#auction-definition').getByText(/Bayesian Nash equilibrium/).isVisible()) errors.push('desktop: first-price classification is missing BNE');
  await desktop.locator('[data-auction-format="second-price"]').click();
  if (!await desktop.locator('#auction-definition').getByText(/DSIC/).isVisible()) errors.push('desktop: second-price classification is missing DSIC');
  if (!await desktop.locator('#auction-narrative').getByText(/Bidder 1 wins/).isVisible()) errors.push('desktop: auction allocation did not identify the winner');
  if (!await desktop.locator('#auction-equilibrium-check').getByText(/zero realized unilateral regret/i).isVisible()) errors.push('desktop: truthful second-price diagnostic is missing');
  await desktop.locator('#auction-behavior').selectOption('manual');
  await desktop.locator('[data-auction-input="bid"][data-bidder="1"]').fill('1.10');
  await desktop.locator('#run-auction').click();
  if (!await desktop.locator('#auction-narrative').getByText(/Bidder 2 wins/).isVisible()) errors.push('desktop: manual auction bids did not change the winner');
  await desktop.locator('#run-revenue-check').click();
  if (await desktop.locator('.revenue-bar-row').count() !== 5) errors.push('desktop: revenue-equivalence comparison does not show five formats');
  await desktop.locator('[data-auction-stress="common"]').click();
  if (!await desktop.locator('#auction-stress-result').getByText(/Winner's curse/).isVisible()) errors.push('desktop: common-value stress test is missing');

  await desktop.locator('#abstract-input').fill('Allocation matters. We build a tool.');
  await desktop.locator('#check-abstract').click();
  if (!await desktop.locator('#abstract-result').getByText('Revise sentence two').isVisible()) errors.push('desktop: weak abstract passed');
  await desktop.locator('#abstract-input').fill('Allocation matters. However, prior work leaves the behavioral gap unresolved. We test a mechanism.');
  await desktop.locator('#check-abstract').click();
  if (!await desktop.locator('#abstract-result').getByText('Gap pivot detected').isVisible()) errors.push('desktop: valid gap pivot failed');

  console.log('Browser QA: checking Boston rounds');
  const enabledRoundButton = await desktop.locator('#next-round').evaluate((element) => {
    const style = getComputedStyle(element);
    return { disabled: element.disabled, color: style.color, backgroundImage: style.backgroundImage, opacity: style.opacity };
  });
  if (enabledRoundButton.backgroundImage === 'none') errors.push('desktop: enabled Next round button lost its high-contrast gradient');
  if (enabledRoundButton.color !== 'rgb(4, 17, 29)') errors.push(`desktop: enabled Next round text color changed to ${enabledRoundButton.color}`);
  if (!await desktop.locator('#round-applications').getByText('Amina → Beacon').isVisible()) errors.push('desktop: round-one proposals are not explicit');
  if (!await desktop.locator('#round-applications').getByText(/FINAL accept Amina/).isVisible()) errors.push('desktop: round-one final acceptance is not explicit');
  if (!await desktop.locator('#round-applications').getByText(/Permanently assigned and out: Amina, Chen/).isVisible()) errors.push('desktop: round-one exit status is not explicit');
  await desktop.locator('#play-rounds').click();
  if (await desktop.locator('#play-rounds').getAttribute('aria-pressed') !== 'true') errors.push('desktop: autoplay did not start');
  await desktop.locator('#play-rounds').click();
  await desktop.locator('#motion-toggle').click();
  if (!await desktop.locator('body').evaluate((element) => element.classList.contains('motion-paused'))) errors.push('desktop: motion pause did not activate');
  await desktop.locator('#motion-toggle').click();
  for (let step = 0; step < 10 && await desktop.locator('#next-round').isEnabled(); step += 1) await desktop.locator('#next-round').click();
  if (!await desktop.locator('#stability-result').getByText('Not stable in this example.').isVisible()) errors.push('desktop: Boston blocking-pair result missing');
  const disabledRoundButton = await desktop.locator('#next-round').evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      disabled: element.disabled,
      color: style.color,
      textFillColor: style.webkitTextFillColor,
      backgroundImage: style.backgroundImage,
      boxShadow: style.boxShadow,
      opacity: style.opacity,
    };
  });
  if (!disabledRoundButton.disabled) errors.push('desktop: Final allocation button is not disabled');
  if (disabledRoundButton.textFillColor !== 'rgb(237, 247, 255)' || !disabledRoundButton.boxShadow.includes('rgb(23, 44, 68)')) {
    errors.push(`desktop: disabled Final allocation text is not readable (${JSON.stringify(disabledRoundButton)})`);
  }
  if (disabledRoundButton.opacity !== '1') errors.push(`desktop: disabled Final allocation opacity is ${disabledRoundButton.opacity}`);
  checks.push({ label: 'matching-button-contrast', enabledRoundButton, disabledRoundButton });
  await desktop.locator('#mechanism-select').selectOption('deferred');
  console.log('Browser QA: checking deferred-acceptance rounds');
  for (let step = 0; step < 10 && await desktop.locator('#next-round').isEnabled(); step += 1) await desktop.locator('#next-round').click();
  if (!await desktop.locator('#stability-result').getByText('Stable in this example.').isVisible()) errors.push('desktop: DA stability result missing');
  await desktop.locator('#run-comparison').click();
  if (!await desktop.locator('#comparison-dialog').isVisible()) errors.push('desktop: comparison dialog failed');
  await desktop.locator('.dialog-close').click();
  console.log('Browser QA: capturing desktop');
  await desktop.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await desktop.screenshot({ path: path.join(root, 'outputs', 'three_lens_desktop.png'), fullPage: true });
  await desktop.close();

  console.log('Browser QA: opening mobile view');
  const mobile = await openPage({ width: 390, height: 844 }, 'mobile');
  for (const lens of ['selten', 'harsanyi']) {
    await mobile.locator(`#solution-tab-${lens}`).click();
    const panelGeometry = await mobile.locator(`#solution-${lens}`).evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      clipped: [...element.querySelectorAll('fieldset, .game-visual, .solution-result')]
        .filter((child) => child.scrollWidth > child.clientWidth + 2)
        .map((child) => `${child.tagName}.${child.className}`),
    }));
    if (panelGeometry.scrollWidth > panelGeometry.clientWidth + 2 || panelGeometry.clipped.length) {
      errors.push(`mobile: ${lens} lab overflow ${JSON.stringify(panelGeometry)}`);
    }
    checks.push({ label: `mobile-${lens}-lab`, viewport: { width: 390, height: 844 }, geometry: panelGeometry });
  }
  const auctionGeometry = await mobile.locator('#auctions').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    clipped: [...element.querySelectorAll('.auction-map, .auction-control-column, .auction-result-column, .auction-analysis-grid, .auction-resource-line')]
      .filter((child) => child.scrollWidth > child.clientWidth + 2)
      .map((child) => `${child.tagName}.${child.className}`),
  }));
  if (auctionGeometry.scrollWidth > auctionGeometry.clientWidth + 2 || auctionGeometry.clipped.length) {
    errors.push(`mobile: auction lab overflow ${JSON.stringify(auctionGeometry)}`);
  }
  checks.push({ label: 'mobile-auction-lab', viewport: { width: 390, height: 844 }, geometry: auctionGeometry });
  await mobile.locator('#solution-tab-nash').click();
  console.log('Browser QA: capturing mobile');
  await mobile.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await mobile.screenshot({ path: path.join(root, 'outputs', 'three_lens_mobile.png'), fullPage: true });
  await mobile.close();
} finally {
  await browser.close();
  server.close();
}

const report = { status: errors.length ? 'failed' : 'passed', checks, errors, method: 'Playwright Chromium at desktop and mobile widths with reduced motion' };
await fs.writeFile(path.join(root, 'outputs', 'browser_render_checks.json'), `${JSON.stringify(report, null, 2)}\n`);
if (errors.length) throw new Error(errors.join('\n'));
console.log('Browser render checks passed at 1440×1000 and 390×844.');
