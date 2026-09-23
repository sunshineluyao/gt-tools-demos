import {
  SCHOOL_CHOICE_SCENARIO,
  analyzePureNash,
  classifyGame,
  describeMatchingRound,
  findBlockingPairs,
  runBoston,
  runDeferredAcceptance,
  solveBayesianEntry,
  solveSequentialEntry,
  validateAbstract,
} from './logic.js';
import {
  benchmarkBids,
  classifyAuction,
  collusionDiagnostic,
  formatMetric,
  resaleDiagnostic,
  revenueEquivalenceExperiment,
  runAuction,
  sellerCredibilityAudit,
  winnerCurseDiagnostic,
} from './auction-logic.js';

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));

function strategiesFrom(selector) {
  return $(selector).value.split(',').map((value) => value.trim()).filter(Boolean);
}

function gameInput() {
  return {
    players: [
      { name: $('#p1-name').value, strategies: strategiesFrom('#p1-strategies') },
      { name: $('#p2-name').value, strategies: strategiesFrom('#p2-strategies') },
    ],
    sequential: $('#sequential').checked,
    observedMoves: $('#observed').checked,
    privateInformation: $('#private-info').checked,
  };
}

function renderDiagnosis() {
  const result = classifyGame(gameInput());
  if (!result.valid) {
    $('#diagnosis').innerHTML = `<div class="diagnosis-card error"><b>Structure gate not yet passed</b><ul>${result.problems.map((problem) => `<li>${escapeHtml(problem)}</li>`).join('')}</ul></div>`;
    return;
  }
  $('#diagnosis').innerHTML = `
    <div class="diagnosis-card">
      <b>${escapeHtml(result.lens)} lens</b>
      <p><strong>Start with:</strong> ${escapeHtml(result.concept)}.</p>
      <p><strong>Show:</strong> ${escapeHtml(result.representation)}.</p>
      <p><strong>Falsify:</strong> ${escapeHtml(result.check)}</p>
      <p><strong>Boundary:</strong> ${escapeHtml(result.caution)}</p>
    </div>`;
  activateSolutionLens(result.lens.toLowerCase(), false);
}

$('#game-form').addEventListener('submit', (event) => {
  event.preventDefault();
  renderDiagnosis();
});
['#sequential', '#observed', '#private-info'].forEach((selector) => {
  $(selector).addEventListener('change', () => {
    if (selector === '#sequential' && !$('#sequential').checked) $('#observed').checked = false;
    renderDiagnosis();
  });
});

function matrixFromInputs(owner) {
  const value = (cell) => Number($(`[data-matrix="${owner}"][data-cell="${cell}"]`).value);
  return [[value('00'), value('01')], [value('10'), value('11')]];
}

const solutionTabs = $$('.solution-tabs [role="tab"]');
let solutionTimers = [];

function clearSolutionTimers() {
  solutionTimers.forEach((timer) => window.clearTimeout(timer));
  solutionTimers = [];
}

function runSolutionSteps(steps) {
  clearSolutionTimers();
  const instant = reducedMotion || document.body.classList.contains('motion-paused');
  steps.forEach((step, index) => {
    if (instant || index === 0) step();
    else solutionTimers.push(window.setTimeout(step, index * 650));
  });
}

function activateSolutionLens(name, focusTab = true) {
  const activeTab = solutionTabs.find((button) => button.dataset.solution === name);
  if (!activeTab) return;
  solutionTabs.forEach((button) => {
    const selected = button === activeTab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  $$('.solution-panel').forEach((panel) => {
    const selected = panel.id === `solution-${name}`;
    panel.hidden = !selected;
    panel.classList.toggle('panel-enter', selected);
  });
  clearSolutionTimers();
  if (focusTab) activeTab.focus();
}

solutionTabs.forEach((button, index) => {
  button.addEventListener('click', () => activateSolutionLens(button.dataset.solution, false));
  button.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const shift = event.key === 'ArrowRight' ? 1 : -1;
    const next = solutionTabs[(index + shift + solutionTabs.length) % solutionTabs.length];
    activateSolutionLens(next.dataset.solution);
  });
});

function resetNashTrace() {
  $$('[data-payoff-cell]').forEach((cell) => cell.classList.remove('row-best', 'column-best', 'equilibrium-cell'));
  $$('#nash-steps span').forEach((step) => step.classList.remove('active', 'complete'));
}

function updateNash() {
  try {
    const analysis = analyzePureNash(matrixFromInputs('row'), matrixFromInputs('column'));
    const rowNames = ['Cooperate', 'Defect'];
    const columnNames = ['Cooperate', 'Defect'];
    $('#nash-result').textContent = analysis.equilibria.length
      ? `Pure Nash: ${analysis.equilibria.map(([row, column]) => `(${rowNames[row]}, ${columnNames[column]})`).join('; ')}`
      : 'No pure Nash equilibrium; inspect mixed strategies.';
    $('#nash-result').classList.remove('result-updated');
    requestAnimationFrame(() => $('#nash-result').classList.add('result-updated'));
    return analysis;
  } catch (error) {
    $('#nash-result').textContent = error.message;
    return null;
  }
}

function traceNash() {
  resetNashTrace();
  const analysis = updateNash();
  if (!analysis) return;
  const selectCells = (cells, className) => cells.forEach(([row, column]) => {
    $(`[data-payoff-cell="${row}${column}"]`).classList.add(className);
  });
  const step = (name) => $(`[data-nash-step="${name}"]`);
  runSolutionSteps([
    () => { step('row').classList.add('active'); selectCells(analysis.rowBestCells, 'row-best'); },
    () => { step('row').classList.replace('active', 'complete'); step('column').classList.add('active'); selectCells(analysis.columnBestCells, 'column-best'); },
    () => { step('column').classList.replace('active', 'complete'); step('equilibrium').classList.add('active', 'complete'); selectCells(analysis.equilibria, 'equilibrium-cell'); },
  ]);
}

$('#trace-nash').addEventListener('click', traceNash);
$$('[data-matrix]').forEach((input) => input.addEventListener('input', () => {
  clearSolutionTimers();
  resetNashTrace();
  updateNash();
}));

const numberFrom = (selector) => Number($(selector).value);
const payoffText = ([first, second]) => `(${first}, ${second})`;

function sequentialInput() {
  const value = (name) => Number($(`[data-selten="${name}"]`).value);
  return {
    out: [value('out-entrant'), value('out-incumbent')],
    fight: [value('fight-entrant'), value('fight-incumbent')],
    accommodate: [value('accommodate-entrant'), value('accommodate-incumbent')],
  };
}

function resetSeltenVisual() {
  $$('.entry-tree .tree-edge, .entry-tree .tree-node, .entry-tree .terminal').forEach((element) => element.classList.remove('active', 'candidate', 'chosen', 'dimmed'));
}

function describeSequentialSolution(result) {
  return `SPNE: ${result.profiles.map((profile) => `Entrant ${profile.entrant}; Incumbent ${profile.incumbent} after entry → ${profile.outcome} ${payoffText(profile.payoffs)}`).join(' | ')}`;
}

function markSequentialSolution(result) {
  const entrantActions = new Set(result.profiles.map((profile) => profile.entrant));
  result.incumbentBestActions.forEach((action) => $(`[data-tree-edge="${action.toLowerCase()}"]`).classList.add('chosen'));
  if (entrantActions.has('Stay out')) {
    $('[data-tree-edge="out"]').classList.add('chosen');
    $('[data-terminal="out"]').classList.add('chosen');
  }
  if (entrantActions.has('Enter')) {
    $('[data-tree-edge="enter"]').classList.add('chosen');
    result.profiles.filter((profile) => profile.entrant === 'Enter').forEach((profile) => {
      $(`[data-terminal="${profile.outcome.toLowerCase()}"]`).classList.add('chosen');
    });
  }
}

function solveSelten(animate = true) {
  try {
    const result = solveSequentialEntry(sequentialInput());
    $('#selten-payoff-out').textContent = payoffText(result.terminals['Stay out']);
    $('#selten-payoff-fight').textContent = payoffText(result.terminals.Fight);
    $('#selten-payoff-accommodate').textContent = payoffText(result.terminals.Accommodate);
    resetSeltenVisual();
    if (!animate) {
      markSequentialSolution(result);
      $('#selten-result').textContent = describeSequentialSolution(result);
      return result;
    }
    runSolutionSteps([
      () => {
        $('[data-tree-node="incumbent"]').classList.add('active');
        result.incumbentBestActions.forEach((action) => $(`[data-tree-edge="${action.toLowerCase()}"]`).classList.add('candidate'));
        $('#selten-result').textContent = `Step 1: after entry, the incumbent compares ${result.terminals.Fight[1]} with ${result.terminals.Accommodate[1]}.`;
      },
      () => {
        $('[data-tree-node="entrant"]').classList.add('active');
        markSequentialSolution(result);
        $('#selten-result').textContent = 'Step 2: the entrant anticipates that credible continuation and compares it with staying out.';
      },
      () => { $('#selten-result').textContent = describeSequentialSolution(result); },
    ]);
    return result;
  } catch (error) {
    $('#selten-result').textContent = error.message;
    return null;
  }
}

$('#solve-selten').addEventListener('click', () => solveSelten(true));
$$('[data-selten]').forEach((input) => input.addEventListener('input', () => {
  clearSolutionTimers();
  solveSelten(false);
}));

function bayesianInput() {
  return {
    probabilityTough: numberFrom('#harsanyi-prior') / 100,
    entrantOut: numberFrom('#bayes-out'),
    entrantIfFight: numberFrom('#bayes-entry-fight'),
    entrantIfAccommodate: numberFrom('#bayes-entry-accommodate'),
    toughFight: numberFrom('#bayes-tough-fight'),
    toughAccommodate: numberFrom('#bayes-tough-accommodate'),
    weakFight: numberFrom('#bayes-weak-fight'),
    weakAccommodate: numberFrom('#bayes-weak-accommodate'),
  };
}

function resetHarsanyiVisual() {
  $$('.type-tree .nature-node, .type-tree .type-card, .type-tree .type-edge, .type-tree .entrant-decision').forEach((element) => element.classList.remove('active', 'chosen'));
}

function expectedText([minimum, maximum]) {
  return Math.abs(maximum - minimum) < 1e-9 ? minimum.toFixed(2) : `[${minimum.toFixed(2)}, ${maximum.toFixed(2)}]`;
}

function describeBayesianSolution(result) {
  return `Type strategy: Tough → ${result.typeBestActions.Tough.join(' or ')}; Weak → ${result.typeBestActions.Weak.join(' or ')}. Expected entry payoff = ${expectedText(result.expectedEntryRange)} versus stay out = ${result.entrantOut.toFixed(2)}. Entrant: ${result.entrantRecommendation}.`;
}

function writeBayesianLabels(result) {
  $('#harsanyi-prior-output').textContent = result.probabilityTough.toFixed(2);
  $('#harsanyi-tough-prob').textContent = `p = ${result.probabilityTough.toFixed(2)}`;
  $('#harsanyi-weak-prob').textContent = `1 − p = ${result.probabilityWeak.toFixed(2)}`;
  $('#harsanyi-tough-action').textContent = `Action: ${result.typeBestActions.Tough.join(' or ')}`;
  $('#harsanyi-weak-action').textContent = `Action: ${result.typeBestActions.Weak.join(' or ')}`;
  $('#harsanyi-entrant-action').textContent = `Entrant: ${result.entrantRecommendation}`;
}

function markBayesianSolution(result) {
  writeBayesianLabels(result);
  $$('[data-type-edge], .type-card').forEach((element) => element.classList.add('chosen'));
  $('[data-type-node="entrant"]').classList.add('chosen');
}

function solveHarsanyi(animate = true) {
  try {
    const result = solveBayesianEntry(bayesianInput());
    resetHarsanyiVisual();
    $('#harsanyi-prior-output').textContent = result.probabilityTough.toFixed(2);
    $('#harsanyi-tough-prob').textContent = `p = ${result.probabilityTough.toFixed(2)}`;
    $('#harsanyi-weak-prob').textContent = `1 − p = ${result.probabilityWeak.toFixed(2)}`;
    if (!animate) {
      markBayesianSolution(result);
      $('#harsanyi-result').textContent = describeBayesianSolution(result);
      return result;
    }
    runSolutionSteps([
      () => { $('[data-type-node="nature"]').classList.add('active'); $('#harsanyi-result').textContent = 'Step 1: Nature draws the incumbent’s private type using the common prior.'; },
      () => { $$('[data-type-edge], .type-card').forEach((element) => element.classList.add('chosen')); writeBayesianLabels(result); $('#harsanyi-result').textContent = 'Step 2: specify a best action for every possible type—not only the realized type.'; },
      () => { $('[data-type-node="entrant"]').classList.add('chosen'); $('#harsanyi-result').textContent = describeBayesianSolution(result); },
    ]);
    return result;
  } catch (error) {
    $('#harsanyi-result').textContent = error.message;
    return null;
  }
}

$('#solve-harsanyi').addEventListener('click', () => solveHarsanyi(true));
$('#sample-harsanyi').addEventListener('click', () => {
  const result = solveHarsanyi(false);
  if (!result) return;
  const type = Math.random() < result.probabilityTough ? 'Tough' : 'Weak';
  const token = $('#harsanyi-token');
  token.classList.remove('to-tough', 'to-weak');
  void token.getBoundingClientRect();
  token.classList.add(`to-${type.toLowerCase()}`);
  $('#harsanyi-sample').textContent = `Nature drew ${type}; this type chooses ${result.typeBestActions[type].join(' or ')}. The strategy still had to specify both types.`;
});
$('#harsanyi-prior').addEventListener('input', () => solveHarsanyi(false));
$$('.bayes-controls input').forEach((input) => input.addEventListener('input', () => solveHarsanyi(false)));

const AUCTION_INITIAL_VALUES = [0.92, 0.73, 0.55, 0.31];
const AUCTION_INITIAL_BIDS = [0.69, 0.55, 0.41, 0.23];
const AUCTION_INITIAL_BUDGETS = [1.5, 1.5, 1.5, 1.5];

function renderAuctionInputs(values = AUCTION_INITIAL_VALUES, bids = AUCTION_INITIAL_BIDS, budgets = AUCTION_INITIAL_BUDGETS) {
  $('#auction-bidder-inputs').innerHTML = values.map((value, index) => `
    <tr>
      <td><strong>Bidder ${index + 1}</strong></td>
      <td><input data-auction-input="value" data-bidder="${index}" type="number" min="0" max="2" step="0.01" value="${Number(value).toFixed(2)}" aria-label="Bidder ${index + 1} value or signal"></td>
      <td><input data-auction-input="bid" data-bidder="${index}" type="number" min="0" max="2" step="0.01" value="${Number(bids[index]).toFixed(2)}" aria-label="Bidder ${index + 1} manual bid"></td>
      <td><input data-auction-input="budget" data-bidder="${index}" type="number" min="0" max="2" step="0.01" value="${Number(budgets[index]).toFixed(2)}" aria-label="Bidder ${index + 1} budget cap"></td>
    </tr>`).join('');
}

function auctionVector(kind) {
  return $$(`[data-auction-input="${kind}"]`).map((input) => Number(input.value));
}

function updateAuctionControlState() {
  const common = $('#auction-environment').value === 'common';
  const manual = $('#auction-behavior').value === 'manual';
  $('#auction-common-value').disabled = !common;
  $('#auction-value-heading').textContent = common ? 'Private signal sᵢ' : 'Private value vᵢ';
  $$('[data-auction-input="bid"]').forEach((input) => { input.disabled = !manual; });
}

function renderAuctionDefinition(format) {
  const definition = classifyAuction(format);
  $('#auction-definition').innerHTML = `
    <div><b>Game class</b><span>${escapeHtml(definition.timing)}</span><small>${escapeHtml(definition.information)} · ${escapeHtml(definition.representation)}</small></div>
    <div><b>Solution concept</b><span>${escapeHtml(definition.solution)}</span><small>${escapeHtml(definition.benchmark)}</small></div>
    <div><b>Rule + intuition</b><span>${escapeHtml(definition.rule)}</span><small>${escapeHtml(definition.intuition)}</small></div>`;
  $$('[data-auction-format]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.auctionFormat === format)));
  $('#auction-format-select').value = format;
}

function auctionProfile() {
  const format = $('#auction-format-select').value;
  const values = auctionVector('value');
  const budgets = auctionVector('budget');
  const riskAversion = Number($('#auction-risk').value);
  const isCommon = $('#auction-environment').value === 'common';
  let bids;
  let strategyLabel;
  if ($('#auction-behavior').value === 'manual') {
    bids = auctionVector('bid');
    strategyLabel = 'manual or observed bids';
  } else if (isCommon) {
    bids = [...values];
    strategyLabel = 'signal-bidding heuristic (not an equilibrium claim)';
  } else {
    bids = benchmarkBids(values, format, { riskAversion });
    strategyLabel = riskAversion > 0 && ['first-price', 'dutch'].includes(format)
      ? `illustrative CRRA benchmark with ρ = ${riskAversion.toFixed(2)}`
      : 'risk-neutral benchmark strategy';
  }
  return {
    format,
    values,
    bids,
    budgets,
    reserve: Number($('#auction-reserve').value),
    commonValue: isCommon ? Number($('#auction-common-value').value) : null,
    strategyLabel,
    isCommon,
  };
}

function outcomeMetric(label, value, note) {
  return `<article><b>${escapeHtml(label)}</b><span>${escapeHtml(String(value))}</span><small>${escapeHtml(note)}</small></article>`;
}

function renderAuctionOutcome() {
  try {
    const profile = auctionProfile();
    const outcome = runAuction(profile);
    const largest = Math.max(1, ...outcome.values, ...outcome.effectiveBids);
    $('#auction-bidder-stage').innerHTML = outcome.values.map((value, index) => `
      <article class="auction-bidder ${outcome.winner === index ? 'winner' : ''}">
        <strong class="bidder-name">Bidder ${index + 1}</strong>
        <span class="bidder-status">${outcome.winner === index ? 'WINNER' : outcome.sold ? 'LOSER' : 'NO SALE'}</span>
        <div class="auction-meter" aria-hidden="true"><i class="value-bar" style="height:${Math.max(2, (value / largest) * 100)}%"></i><i class="bid-bar" style="height:${Math.max(2, (outcome.effectiveBids[index] / largest) * 100)}%"></i></div>
        <dl><dt>${profile.isCommon ? 'Signal' : 'Value'}</dt><dd>${formatMetric(value)}</dd><dt>Bid</dt><dd>${formatMetric(outcome.effectiveBids[index])}</dd><dt>Payment</dt><dd>${formatMetric(outcome.payments[index])}</dd><dt>Utility</dt><dd>${formatMetric(outcome.utilities[index])}</dd></dl>
      </article>`).join('');

    const definition = classifyAuction(outcome.format);
    const winnerText = outcome.sold ? `Bidder ${outcome.winner + 1}` : 'No bidder';
    const payment = outcome.sold ? outcome.payments[outcome.winner] : 0;
    $('#auction-narrative').innerHTML = `<strong>${escapeHtml(definition.shortName)} result.</strong> ${winnerText} ${outcome.sold ? `wins and the winner pays ${formatMetric(payment)}` : 'clears the reserve'}. The submitted profile uses ${escapeHtml(profile.strategyLabel)}. ${outcome.format === 'all-pay' ? `Losing bidders pay ${formatMetric(outcome.loserPayments)} in total.` : ''}`;
    $('#auction-metrics').innerHTML = [
      outcomeMetric('Seller revenue', formatMetric(outcome.revenue), 'Sum of payments'),
      outcomeMetric('Allocative efficiency', `${formatMetric(outcome.allocativeEfficiency * 100, 1)}%`, 'Realized / feasible welfare'),
      outcomeMetric('Winner', winnerText, outcome.winnerIsHighestValue ? 'Highest listed value' : 'Not highest listed value'),
      outcomeMetric('Loser burden', formatMetric(outcome.loserPayments), 'Payments by non-winners'),
      outcomeMetric('Ex-post IR', outcome.exPostIndividualRationality ? 'Pass' : 'Fails', 'No realized utility below zero'),
      outcomeMetric('Budget balance', outcome.weakBudgetBalance ? 'Pass' : 'Fails', 'No mechanism deficit'),
    ].join('');

    const regret = outcome.maximumRegret;
    let interpretation = 'Positive realized regret does not refute BNE: Bayesian equilibrium maximizes expected utility before rival types are known.';
    if (outcome.format === 'second-price' && !profile.isCommon && $('#auction-behavior').value === 'benchmark') {
      interpretation = regret < 1e-6
        ? 'Truthful bidding has zero realized unilateral regret here, consistent with DSIC.'
        : 'Check the private-value assumptions or constraints before interpreting the DSIC benchmark.';
    } else if (outcome.format === 'english' && !profile.isCommon && $('#auction-behavior').value === 'benchmark') {
      interpretation = 'The code implements the IPV outcome; PBE additionally requires sequentially rational stay/exit choices and beliefs along the price history.';
    }
    $('#auction-equilibrium-check').innerHTML = `<strong>Unilateral-deviation diagnostic:</strong> maximum ex-post regret = ${formatMetric(regret)}. ${escapeHtml(interpretation)}`;
    $$('.auction-sequence span').forEach((step) => step.classList.add('active'));
    return outcome;
  } catch (error) {
    $('#auction-narrative').textContent = error.message;
    return null;
  }
}

function loadAuctionBenchmark() {
  const values = auctionVector('value');
  const format = $('#auction-format-select').value;
  const common = $('#auction-environment').value === 'common';
  const bids = common ? values : benchmarkBids(values, format, { riskAversion: Number($('#auction-risk').value) });
  $$('[data-auction-input="bid"]').forEach((input, index) => { input.value = bids[index].toFixed(3); });
  $('#auction-behavior').value = common ? 'manual' : 'benchmark';
  updateAuctionControlState();
  renderAuctionOutcome();
}

function renderRevenueExperiment() {
  const bidderCount = Number($('#revenue-bidders').value);
  $('#revenue-bidders-output').textContent = String(bidderCount);
  const result = revenueEquivalenceExperiment({ bidderCount, samples: 6000, seed: 206 });
  const labels = { 'first-price': 'First price', 'second-price': 'Second price', english: 'English', dutch: 'Dutch', 'all-pay': 'All pay' };
  $('#revenue-bars').innerHTML = Object.entries(result.estimates).map(([format, estimate]) => `
    <div class="revenue-bar-row"><span>${labels[format]}</span><div class="revenue-bar-track" style="--theory-position:${result.theoreticalRevenue * 100}%"><i style="width:${Math.min(100, estimate * 100)}%"></i></div><strong>${estimate.toFixed(3)}</strong></div>`).join('');
  const largestGap = Math.max(...Object.values(result.estimates).map((estimate) => Math.abs(estimate - result.theoreticalRevenue)));
  $('#revenue-note').textContent = `Gold marker = theoretical E[R] = (n − 1)/(n + 1) = ${result.theoreticalRevenue.toFixed(3)}. Largest simulation gap: ${largestGap.toFixed(3)}. Equality is in expectation under the stated benchmark.`;
}

function renderAuctionStress(name) {
  $$('[data-auction-stress]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.auctionStress === name)));
  const target = $('#auction-stress-result');
  if (name === 'behavior') {
    const values = [0.92, 0.73, 0.55, 0.31];
    const observedBids = [0.91, 0.79, 0.42, 0.35];
    const outcome = runAuction({ format: 'first-price', values, bids: observedBids });
    target.innerHTML = `<h4>Bounded behavior is evidence—not an insult</h4><p>Manual bids depart from the BNE benchmark: Bidder 2 overbids value (${observedBids[1]} &gt; ${values[1]}), while maximum realized regret is <strong>${formatMetric(outcome.maximumRegret)}</strong>.</p><p>Possible explanations include risk, misunderstanding, learning, framing, social motives, or simple error. A classroom round can generate hypotheses; it cannot establish population-level causes.</p>`;
  } else if (name === 'risk') {
    const values = [0.92, 0.73, 0.55, 0.31];
    const neutralBids = benchmarkBids(values, 'first-price');
    const riskBids = benchmarkBids(values, 'first-price', { riskAversion: 0.6 });
    const neutral = runAuction({ format: 'first-price', values, bids: neutralBids });
    const risk = runAuction({ format: 'first-price', values, bids: riskBids });
    target.innerHTML = `<h4>Risk aversion weakens revenue equivalence</h4><p>The illustrative CRRA benchmark raises the top first-price bid from <strong>${formatMetric(neutralBids[0])}</strong> to <strong>${formatMetric(riskBids[0])}</strong>; realized revenue changes from ${formatMetric(neutral.revenue)} to ${formatMetric(risk.revenue)} in this profile.</p><p>Re-derive the strategy for the chosen utility function. Do not transplant the risk-neutral formula unchanged.</p>`;
  } else if (name === 'common') {
    const diagnostic = winnerCurseDiagnostic({ signals: [0.90, 0.72, 0.63, 0.55], trueValue: 0.58 });
    target.innerHTML = `<h4>Winner's curse under a common value</h4><p>Bidder ${diagnostic.winner + 1} has the highest signal (${formatMetric(diagnostic.winnerSignal)}) but the realized common value is ${formatMetric(diagnostic.trueValue)}. Paying ${formatMetric(diagnostic.payments[diagnostic.winner])} produces utility <strong>${formatMetric(diagnostic.winnerProfit)}</strong>.</p><p>Winning selects the most optimistic signal. Rational bidding must condition on that selection effect and beliefs—not simply bid the raw signal.</p>`;
  } else if (name === 'resale') {
    const values = [0.95, 0.80, 0.45, 0.25];
    const outcome = runAuction({ format: 'first-price', values, bids: [0.50, 0.82, 0.33, 0.18] });
    const resale = resaleDiagnostic(outcome, values, { transactionCost: 0.04 });
    target.innerHTML = `<h4>Resale can repair—and reshape—the allocation</h4><p>The auction initially awards the item to Bidder ${outcome.winner + 1}; the highest value belongs to Bidder ${resale.finalOwner + 1}. A stylized resale at ${formatMetric(resale.resalePrice)} restores net welfare to ${formatMetric(resale.finalWelfare)} after transaction cost.</p><p><strong>Boundary:</strong> ${escapeHtml(resale.caution)} Anticipated bargaining power and delay can change the original bids and revenue.</p>`;
  } else if (name === 'collusion') {
    const diagnostic = collusionDiagnostic();
    target.innerHTML = `<h4>Unilateral deviations do not test coalitions</h4><p>Coordinated bid suppression lowers seller revenue from <strong>${formatMetric(diagnostic.baseline.revenue)}</strong> to <strong>${formatMetric(diagnostic.collusive.revenue)}</strong> in this illustration.</p><ul>${diagnostic.redFlags.map((flag) => `<li>${escapeHtml(flag)}</li>`).join('')}</ul><p>${escapeHtml(diagnostic.caution)}</p>`;
  } else {
    const audit = sellerCredibilityAudit({ values: [0.92, 0.73, 0.55, 0.31], bids: [0.92, 0.73, 0.55, 0.31], shillBid: 0.85 });
    target.innerHTML = `<h4>DSIC for bidders is not credibility for the seller</h4><p>The committed second-price payment is ${formatMetric(audit.officialPayment)}. An undisclosed shill bid raises the executed payment to <strong>${formatMetric(audit.executedPayment)}</strong>, an overcharge of ${formatMetric(audit.overcharge)}.</p><p>${escapeHtml(audit.reason)} Cryptographic commitments, independent logs, audits, and appeal rules address a different incentive problem from truthful bidder reporting.</p>`;
  }
}

renderAuctionInputs();
$$('[data-auction-format]').forEach((button) => button.addEventListener('click', () => {
  renderAuctionDefinition(button.dataset.auctionFormat);
  loadAuctionBenchmark();
}));
$('#auction-format-select').addEventListener('change', (event) => { renderAuctionDefinition(event.target.value); loadAuctionBenchmark(); });
$('#auction-environment').addEventListener('change', () => { updateAuctionControlState(); loadAuctionBenchmark(); });
$('#auction-behavior').addEventListener('change', () => { updateAuctionControlState(); renderAuctionOutcome(); });
$('#auction-risk').addEventListener('input', () => { $('#auction-risk-output').textContent = Number($('#auction-risk').value).toFixed(2); if ($('#auction-behavior').value === 'benchmark') renderAuctionOutcome(); });
$('#load-auction-benchmark').addEventListener('click', loadAuctionBenchmark);
$('#run-auction').addEventListener('click', renderAuctionOutcome);
$('#revenue-bidders').addEventListener('input', () => { $('#revenue-bidders-output').textContent = $('#revenue-bidders').value; });
$('#run-revenue-check').addEventListener('click', renderRevenueExperiment);
$$('[data-auction-stress]').forEach((button) => button.addEventListener('click', () => renderAuctionStress(button.dataset.auctionStress)));

renderAuctionDefinition('first-price');
updateAuctionControlState();
renderAuctionOutcome();
renderRevenueExperiment();
renderAuctionStress('behavior');

function checkAbstract() {
  const result = validateAbstract($('#abstract-input').value);
  const missing = [];
  if (!result.hasSecondSentence) missing.push('Add a complete second sentence.');
  if (result.hasSecondSentence && !result.startsWithPivot) missing.push('Begin sentence two with “However” or “Yet.”');
  if (result.hasSecondSentence && !result.namesGap) missing.push('Name what is unknown, limited, unresolved, or underexplored.');
  $('#abstract-result').innerHTML = result.passes
    ? `<div class="diagnosis-card"><b>Gap pivot detected</b><p>Your second sentence begins with a contrast and identifies a limitation. Now verify that the cited literature actually supports this gap.</p></div>`
    : `<div class="diagnosis-card error"><b>Revise sentence two</b><ul>${missing.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`;
}
$('#check-abstract').addEventListener('click', checkAbstract);

let generatedPrompt = '';
$('#make-prompt').addEventListener('click', () => {
  const claim = $('#claim-input').value.trim() || '[insert provisional contribution]';
  const dimensions = $$('#dimension-checks input:checked').map((input) => input.value);
  generatedPrompt = `ROLE: Act as a skeptical literature-search assistant, not a novelty certifier.

PROVISIONAL CLAIM
${claim}

SEARCH TASK
Identify 8–12 plausibly close peer-reviewed papers across economics, computer science, and behavioral science. Search independently along these claimed dimensions: ${dimensions.join(', ') || '[select dimensions]'}.

FOR EACH CANDIDATE, RETURN
1. Full title, authors, venue, year, and DOI or stable publisher URL.
2. Which dimensions overlap, using only: research question; economic model; computational method; behavioral evidence; application setting; validation and boundaries.
3. A short paraphrase of the evidence supporting each overlap and the exact section/page to inspect.
4. A reason the candidate may falsify or narrow the provisional claim.
5. “UNVERIFIED” beside any metadata or content you cannot confirm.

DO NOT
- State that the project is novel.
- Invent citations, quotations, results, or page numbers.
- Treat different terminology as proof of a different contribution.

FINAL OUTPUT
Rank the three closest candidates and propose the narrowest contribution that might remain. End with a checklist requiring a human to open every source, verify metadata and evidence, record counterexamples, and revise or withdraw the claim.`;
  $('.prompt-output pre').textContent = generatedPrompt;
  $('.prompt-output').hidden = false;
});
$('#copy-prompt').addEventListener('click', async (event) => {
  try {
    await navigator.clipboard.writeText(generatedPrompt);
    event.currentTarget.textContent = 'Copied';
  } catch {
    event.currentTarget.textContent = 'Select text to copy';
  }
});

const tabButtons = $$('.persona-tabs [role="tab"]');
function activatePersona(name) {
  tabButtons.forEach((button) => {
    const selected = button.dataset.persona === name;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  $$('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== name; });
}
tabButtons.forEach((button, index) => {
  button.addEventListener('click', () => activatePersona(button.dataset.persona));
  button.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const shift = event.key === 'ArrowRight' ? 1 : -1;
    const next = tabButtons[(index + shift + tabButtons.length) % tabButtons.length];
    activatePersona(next.dataset.persona);
    next.focus();
  });
});

function renderPreferenceTable() {
  $('#student-preferences').innerHTML = SCHOOL_CHOICE_SCENARIO.students.map((student) => `
    <div class="preference-row"><b>${escapeHtml(student)}</b><span>${SCHOOL_CHOICE_SCENARIO.preferences[student].map((school, index) => `${index + 1}. ${escapeHtml(school)}`).join(' · ')}</span></div>`).join('');
}

function createMatchingNodes() {
  $('#student-nodes').innerHTML = SCHOOL_CHOICE_SCENARIO.students.map((student) => `<div class="match-node" data-student="${escapeHtml(student)}">${escapeHtml(student)}<small>student</small></div>`).join('');
  $('#school-nodes').innerHTML = SCHOOL_CHOICE_SCENARIO.schools.map((school) => `<div class="match-node school" data-school="${escapeHtml(school)}">${escapeHtml(school)}<small>capacity ${SCHOOL_CHOICE_SCENARIO.capacities[school]}</small></div>`).join('');
}

const runs = {
  boston: runBoston(SCHOOL_CHOICE_SCENARIO),
  deferred: runDeferredAcceptance(SCHOOL_CHOICE_SCENARIO),
};
let mechanism = 'boston';
let historyIndex = 1;
let playTimer = null;

function nodeCenter(node, canvas) {
  const rect = node.getBoundingClientRect();
  const origin = canvas.getBoundingClientRect();
  return { x: rect.left - origin.left + rect.width / 2, y: rect.top - origin.top + rect.height / 2 };
}

function linkPath(student, school, className) {
  const canvas = $('#matching-canvas');
  const from = nodeCenter($(`[data-student="${student}"]`), canvas);
  const to = nodeCenter($(`[data-school="${school}"]`), canvas);
  const midpoint = (from.x + to.x) / 2;
  return `<path pathLength="1" class="match-line ${className}" d="M ${from.x} ${from.y} C ${midpoint} ${from.y}, ${midpoint} ${to.y}, ${to.x} ${to.y}"/>`;
}

function drawMatchingLines(step) {
  const svg = $('#matching-lines');
  const canvas = $('#matching-canvas');
  const rect = canvas.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  const applicationLines = Object.entries(step.applications || {}).flatMap(([school, students]) => students.map((student) => linkPath(student, school, 'application')));
  const assignmentLines = Object.entries(step.byStudent).filter(([, school]) => school).map(([student, school]) => linkPath(student, school, 'assignment'));
  svg.innerHTML = [...applicationLines, ...assignmentLines].join('');
}

function renderHistoryStep() {
  const run = runs[mechanism];
  const step = run.history[historyIndex];
  const story = describeMatchingRound(SCHOOL_CHOICE_SCENARIO, run, historyIndex, mechanism);
  $('#round-counter').textContent = `ROUND ${step.round}`;
  $('#round-title').textContent = step.label;
  $('#round-applications').innerHTML = `
    <div class="round-flow">
      <section><span>1 · PROPOSE →</span><p>${story.proposals.map(escapeHtml).join('<br>')}</p></section>
      <section><span>2 · SCHOOL DECIDES →</span><p>${story.decisions.map(escapeHtml).join('<br>')}</p></section>
      <section><span>3 · CONTINUE ↺</span><p>${escapeHtml(story.continuation)}</p></section>
    </div>`;
  SCHOOL_CHOICE_SCENARIO.students.forEach((student) => {
    const node = $(`[data-student="${student}"]`);
    node.dataset.status = story.status[student];
    node.classList.remove('status-updated');
    requestAnimationFrame(() => node.classList.add('status-updated'));
    $('small', node).textContent = story.status[student];
  });
  const final = historyIndex === run.history.length - 1;
  $('#next-round').disabled = final;
  $('#next-round').textContent = final ? 'Final allocation' : 'Next round →';
  if (final) stopPlayback();
  if (final) {
    const blocks = findBlockingPairs(SCHOOL_CHOICE_SCENARIO, run);
    $('#stability-result').innerHTML = blocks.length
      ? `<div class="stability unstable"><strong>Not stable in this example.</strong><br>Blocking pair: ${blocks.map(([student, school]) => `${escapeHtml(student)} + ${escapeHtml(school)}`).join(', ')}.</div>`
      : '<div class="stability"><strong>Stable in this example.</strong><br>No blocking pair was found.</div>';
  } else {
    $('#stability-result').innerHTML = '<p class="micro-note">Advance to the final state to run the blocking-pair check.</p>';
  }
  requestAnimationFrame(() => drawMatchingLines(step));
}

$('#next-round').addEventListener('click', () => {
  historyIndex = Math.min(historyIndex + 1, runs[mechanism].history.length - 1);
  renderHistoryStep();
});
$('#reset-match').addEventListener('click', () => { stopPlayback(); historyIndex = 0; renderHistoryStep(); });
$('#mechanism-select').addEventListener('change', (event) => {
  stopPlayback();
  mechanism = event.target.value;
  historyIndex = 1;
  renderHistoryStep();
});
window.addEventListener('resize', () => renderHistoryStep());

function stopPlayback() {
  window.clearInterval(playTimer);
  playTimer = null;
  $('#play-rounds').textContent = '▶ Play rounds';
  $('#play-rounds').setAttribute('aria-pressed', 'false');
}

$('#play-rounds').addEventListener('click', () => {
  if (playTimer) return stopPlayback();
  if (historyIndex === runs[mechanism].history.length - 1) historyIndex = 0;
  $('#play-rounds').textContent = '❚❚ Pause';
  $('#play-rounds').setAttribute('aria-pressed', 'true');
  renderHistoryStep();
  playTimer = window.setInterval(() => {
    historyIndex += 1;
    renderHistoryStep();
  }, 2200);
});

function allocationText(run) {
  return SCHOOL_CHOICE_SCENARIO.students.map((student) => `${student} → ${run.byStudent[student] || 'unmatched'}`).join('<br>');
}

$('#run-comparison').addEventListener('click', () => {
  const strategicScenario = structuredClone(SCHOOL_CHOICE_SCENARIO);
  strategicScenario.preferences.Bo = ['Aurora', 'Beacon', 'Cedar'];
  const strategicBoston = runBoston(strategicScenario);
  const bostonBlocks = findBlockingPairs(SCHOOL_CHOICE_SCENARIO, runs.boston);
  $('#comparison-content').innerHTML = `
    <table class="comparison-table">
      <thead><tr><th>Check</th><th>Boston</th><th>Student-proposing DA</th></tr></thead>
      <tbody>
        <tr><th>Final allocation</th><td>${allocationText(runs.boston)}</td><td>${allocationText(runs.deferred)}</td></tr>
        <tr><th>Acceptance status</th><td>Final each round</td><td>Tentative until proposals end</td></tr>
        <tr><th>Blocking-pair test</th><td>${bostonBlocks.length ? 'Fails: Bo + Aurora' : 'Passes in this example'}</td><td>Passes in this example</td></tr>
        <tr><th>Reporting stress test</th><td>With true preferences Beacon ≻ Aurora ≻ Cedar, Bo receives Cedar. Reporting Aurora first gives Bo Aurora, which Bo truly prefers to Cedar.</td><td>Truthful reporting is a dominant strategy for students in the standard student-proposing DA model.</td></tr>
      </tbody>
    </table>
    <p class="comparison-note"><strong>Computation is a counterexample generator, not a general proof.</strong> One manipulation disproves strategy-proofness for Boston. One stable run does not prove DA’s general stability or strategy-proofness; connect the simulation to the formal results and their assumptions.</p>
    <p class="micro-note">Strategic-report check: ${allocationText(strategicBoston)}</p>`;
  $('#comparison-dialog').showModal();
});
$('.dialog-close').addEventListener('click', () => $('#comparison-dialog').close());
$('#comparison-dialog').addEventListener('click', (event) => {
  if (event.target === $('#comparison-dialog')) $('#comparison-dialog').close();
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const motionButton = $('#motion-toggle');
motionButton.addEventListener('click', () => {
  const paused = document.body.classList.toggle('motion-paused');
  motionButton.textContent = paused ? 'Resume motion' : 'Pause motion';
  motionButton.setAttribute('aria-pressed', String(paused));
  if (paused) {
    stopPlayback();
    clearSolutionTimers();
  }
});

const revealTargets = $$('.chapter-heading, .panel, .lineage, .handoff');
revealTargets.forEach((target) => target.dataset.reveal = '');
if (!reducedMotion && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('reveal-enabled');
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.12 });
  revealTargets.forEach((target) => observer.observe(target));
} else {
  revealTargets.forEach((target) => target.classList.add('revealed'));
}

updateNash();
solveSelten(false);
solveHarsanyi(false);
renderDiagnosis();
checkAbstract();
renderPreferenceTable();
createMatchingNodes();
renderHistoryStep();
