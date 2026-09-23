const FORMAT_KEYS = ['first-price', 'second-price', 'english', 'dutch', 'all-pay'];

export const AUCTION_FORMATS = Object.freeze({
  'first-price': Object.freeze({
    shortName: 'First price',
    fullName: 'First-price sealed-bid auction',
    timing: 'Static / simultaneous',
    information: 'Incomplete information',
    representation: 'Bayesian normal form',
    solution: 'Bayesian Nash equilibrium (BNE)',
    rule: 'The highest bidder wins and pays their own bid.',
    benchmark: 'For risk-neutral symmetric bidders with independent Uniform[0,1] values: b(v) = ((n - 1) / n)v.',
    intuition: 'Bid shading trades a larger profit margin against a lower probability of winning.',
  }),
  'second-price': Object.freeze({
    shortName: 'Second price',
    fullName: 'Second-price / Vickrey auction',
    timing: 'Static / simultaneous',
    information: 'Incomplete information',
    representation: 'Direct mechanism',
    solution: 'Dominant-strategy incentive compatibility (DSIC; therefore also BNE)',
    rule: 'The highest bidder wins and pays the second-highest bid.',
    benchmark: 'Truthful bidding b(v) = v is weakly dominant under the standard private-value assumptions.',
    intuition: 'Underbidding can lose a profitable win; overbidding can create a loss.',
  }),
  english: Object.freeze({
    shortName: 'English',
    fullName: 'English ascending auction',
    timing: 'Dynamic / sequential',
    information: 'Incomplete information with an observed price history',
    representation: 'Extensive form with information sets and beliefs',
    solution: 'Perfect Bayesian equilibrium (PBE) / sequential rationality',
    rule: 'The price rises until only one bidder remains.',
    benchmark: 'With independent private values, stay while price p < v and exit at p = v.',
    intuition: 'Dropout prices reveal information; under IPV, the winner pays approximately the second-highest value.',
  }),
  dutch: Object.freeze({
    shortName: 'Dutch',
    fullName: 'Dutch descending auction',
    timing: 'Dynamic / sequential',
    information: 'Incomplete information',
    representation: 'Stopping game in extensive form',
    solution: 'PBE; outcome-equivalent to first price under the benchmark',
    rule: 'A public price falls until the first bidder stops the clock.',
    benchmark: 'Under the standard benchmark, stop at p(v) = ((n - 1) / n)v.',
    intuition: 'Choosing a stopping price is strategically equivalent to submitting a sealed first-price bid.',
  }),
  'all-pay': Object.freeze({
    shortName: 'All pay',
    fullName: 'All-pay auction / contest',
    timing: 'Static / simultaneous',
    information: 'Incomplete information',
    representation: 'Bayesian normal form in which every bid is paid',
    solution: 'Bayesian Nash equilibrium (BNE)',
    rule: 'The highest bidder wins, but every bidder pays their bid.',
    benchmark: 'For risk-neutral Uniform[0,1] values: b(v) = ((n - 1) / n)v^n.',
    intuition: 'Losing is costly, so the model fits effort contests and rent seeking as well as monetary auctions.',
  }),
});

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be numeric.`);
  return number;
}

function boundedNumber(value, lower, upper, label) {
  const number = finiteNumber(value, label);
  if (number < lower || number > upper) throw new RangeError(`${label} must be between ${lower} and ${upper}.`);
  return number;
}

function formatDefinition(format) {
  if (!FORMAT_KEYS.includes(format)) throw new RangeError(`Unknown auction format: ${format}.`);
  return AUCTION_FORMATS[format];
}

export function classifyAuction(format) {
  return { format, ...formatDefinition(format) };
}

function numericVector(values, label, expectedLength = null) {
  if (!Array.isArray(values) || values.length < 2) throw new TypeError(`${label} must contain at least two entries.`);
  if (expectedLength !== null && values.length !== expectedLength) {
    throw new RangeError(`${label} must contain ${expectedLength} entries.`);
  }
  return values.map((value, index) => {
    const number = finiteNumber(value, `${label} ${index + 1}`);
    if (number < 0) throw new RangeError(`${label} ${index + 1} cannot be negative.`);
    return number;
  });
}

function budgetVector(values, expectedLength) {
  if (!Array.isArray(values) || values.length !== expectedLength) {
    throw new RangeError(`Budgets must contain ${expectedLength} entries.`);
  }
  return values.map((value, index) => {
    const number = Number(value);
    if ((!Number.isFinite(number) && number !== Number.POSITIVE_INFINITY) || number < 0) {
      throw new RangeError(`Budget ${index + 1} must be non-negative or Infinity.`);
    }
    return number;
  });
}

export function benchmarkBid(value, bidderCount, format, { riskAversion = 0 } = {}) {
  const valuation = Math.max(0, finiteNumber(value, 'Value'));
  const n = Math.trunc(finiteNumber(bidderCount, 'Bidder count'));
  if (n < 2) throw new RangeError('Bidder count must be at least two.');
  const rho = boundedNumber(riskAversion, 0, 0.95, 'Risk-aversion coefficient');
  formatDefinition(format);
  if (format === 'second-price' || format === 'english') return valuation;
  if (format === 'first-price' || format === 'dutch') return ((n - 1) / (n - rho)) * valuation;
  return ((n - 1) / n) * (valuation ** n);
}

export function benchmarkBids(values, format, options = {}) {
  const cleanValues = numericVector(values, 'Values');
  return cleanValues.map((value) => benchmarkBid(value, cleanValues.length, format, options));
}

function chooseWinner(bids, reserve) {
  const highest = Math.max(...bids);
  if (highest + Number.EPSILON < reserve) return null;
  return bids.findIndex((bid) => Math.abs(bid - highest) < 1e-12);
}

function coreOutcome({ format, values, bids, reserve = 0, budgets = null, commonValue = null }) {
  formatDefinition(format);
  const cleanValues = numericVector(values, 'Values');
  const cleanBids = numericVector(bids, 'Bids', cleanValues.length);
  const cleanBudgets = budgets === null
    ? Array(cleanValues.length).fill(Number.POSITIVE_INFINITY)
    : budgetVector(budgets, cleanValues.length);
  const floor = Math.max(0, finiteNumber(reserve, 'Reserve price'));
  const effectiveBids = cleanBids.map((bid, index) => Math.min(bid, cleanBudgets[index]));
  const winner = chooseWinner(effectiveBids, floor);
  const payments = Array(cleanValues.length).fill(0);

  if (format === 'all-pay') {
    effectiveBids.forEach((bid, index) => { payments[index] = bid; });
  } else if (winner !== null && (format === 'first-price' || format === 'dutch')) {
    payments[winner] = effectiveBids[winner];
  } else if (winner !== null) {
    const rivalBids = effectiveBids.filter((_, index) => index !== winner);
    payments[winner] = Math.max(floor, Math.max(0, ...rivalBids));
  }

  const itemValues = commonValue === null
    ? cleanValues
    : Array(cleanValues.length).fill(Math.max(0, finiteNumber(commonValue, 'Common value')));
  const utilities = payments.map((payment, index) => (winner === index ? itemValues[index] : 0) - payment);
  const efficientOwner = cleanValues.indexOf(Math.max(...cleanValues));
  const efficientWelfare = winner === null ? 0 : Math.max(...itemValues);
  const realizedWelfare = winner === null ? 0 : itemValues[winner];
  const revenue = payments.reduce((sum, payment) => sum + payment, 0);
  const loserPayments = payments.reduce((sum, payment, index) => sum + (index === winner ? 0 : payment), 0);
  const sold = winner !== null;

  return {
    format,
    sold,
    winner,
    efficientOwner,
    values: cleanValues,
    itemValues,
    submittedBids: cleanBids,
    effectiveBids,
    budgets: cleanBudgets,
    reserve: floor,
    payments,
    utilities,
    revenue,
    realizedWelfare,
    efficientWelfare,
    allocativeEfficiency: efficientWelfare > 0 ? realizedWelfare / efficientWelfare : 1,
    winnerIsHighestValue: winner === null ? false : winner === efficientOwner,
    loserPayments,
    loserPaymentShare: revenue > 0 ? loserPayments / revenue : 0,
    exPostIndividualRationality: utilities.every((utility) => utility >= -1e-9),
    weakBudgetBalance: revenue >= -1e-9,
  };
}

function bestResponseForBidder(profile, bidder) {
  const baseline = profile.utilities[bidder];
  const rivalMaximum = Math.max(0, ...profile.effectiveBids.filter((_, index) => index !== bidder));
  const budget = profile.budgets[bidder];
  const finiteBudget = Number.isFinite(budget) ? budget : Number.POSITIVE_INFINITY;
  const upper = Math.min(
    finiteBudget,
    Math.max(1.2, profile.values[bidder] * 1.25, rivalMaximum * 1.2, profile.reserve * 1.2),
  );
  const candidates = new Set([0, profile.submittedBids[bidder], profile.values[bidder], rivalMaximum, rivalMaximum + 1e-4]);
  for (let step = 0; step <= 120; step += 1) candidates.add((upper * step) / 120);

  let bestBid = profile.submittedBids[bidder];
  let bestUtility = baseline;
  [...candidates].filter((bid) => bid >= 0 && bid <= upper + 1e-12).forEach((candidate) => {
    const bids = [...profile.submittedBids];
    bids[bidder] = candidate;
    const counterfactual = coreOutcome({
      format: profile.format,
      values: profile.values,
      bids,
      reserve: profile.reserve,
      budgets: profile.budgets,
      commonValue: profile.itemValues.every((value) => value === profile.itemValues[0]) ? profile.itemValues[0] : null,
    });
    if (counterfactual.utilities[bidder] > bestUtility + 1e-10) {
      bestUtility = counterfactual.utilities[bidder];
      bestBid = candidate;
    }
  });
  return {
    bidder,
    currentBid: profile.submittedBids[bidder],
    currentUtility: baseline,
    bestBid,
    bestUtility,
    regret: Math.max(0, bestUtility - baseline),
  };
}

export function runAuction(input) {
  const profile = coreOutcome(input);
  const bestResponses = profile.values.map((_, bidder) => bestResponseForBidder(profile, bidder));
  return {
    ...profile,
    bestResponses,
    maximumRegret: Math.max(...bestResponses.map((entry) => entry.regret)),
  };
}

function lcg(seed) {
  let state = Math.trunc(seed) >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function revenueEquivalenceExperiment({ bidderCount = 4, samples = 6000, seed = 206 } = {}) {
  const n = Math.trunc(finiteNumber(bidderCount, 'Bidder count'));
  const repetitions = Math.trunc(finiteNumber(samples, 'Sample count'));
  if (n < 2 || n > 20) throw new RangeError('Bidder count must be between 2 and 20.');
  if (repetitions < 100 || repetitions > 100000) throw new RangeError('Sample count must be between 100 and 100000.');
  const random = lcg(seed);
  const formats = ['first-price', 'second-price', 'english', 'dutch', 'all-pay'];
  const totals = Object.fromEntries(formats.map((format) => [format, 0]));
  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    const values = Array.from({ length: n }, () => random());
    formats.forEach((format) => {
      const bids = benchmarkBids(values, format);
      totals[format] += coreOutcome({ format, values, bids }).revenue;
    });
  }
  const estimates = Object.fromEntries(formats.map((format) => [format, totals[format] / repetitions]));
  const theoreticalRevenue = (n - 1) / (n + 1);
  return { bidderCount: n, samples: repetitions, seed, theoreticalRevenue, estimates };
}

export function winnerCurseDiagnostic({ signals, trueValue, format = 'first-price' }) {
  const cleanSignals = numericVector(signals, 'Signals');
  const common = Math.max(0, finiteNumber(trueValue, 'True common value'));
  const bids = [...cleanSignals];
  const outcome = coreOutcome({ format, values: cleanSignals, bids, commonValue: common });
  const winnerSignal = outcome.winner === null ? null : cleanSignals[outcome.winner];
  const winnerProfit = outcome.winner === null ? 0 : outcome.utilities[outcome.winner];
  return {
    ...outcome,
    signals: cleanSignals,
    trueValue: common,
    winnerSignal,
    winnerOverestimate: winnerSignal === null ? 0 : winnerSignal - common,
    winnerProfit,
    winnerCurse: winnerProfit < 0,
  };
}

export function resaleDiagnostic(outcome, values, { transactionCost = 0.05, sellerShare = 0.5 } = {}) {
  const cleanValues = numericVector(values, 'Values');
  const cost = Math.max(0, finiteNumber(transactionCost, 'Transaction cost'));
  const share = boundedNumber(sellerShare, 0, 1, 'Seller bargaining share');
  if (!outcome?.sold || outcome.winner === null) {
    return { trade: false, reason: 'No initial allocation exists to resell.' };
  }
  const efficientOwner = cleanValues.indexOf(Math.max(...cleanValues));
  if (efficientOwner === outcome.winner) {
    return { trade: false, reason: 'The highest-value bidder already owns the item.', efficientOwner };
  }
  const grossGain = cleanValues[efficientOwner] - cleanValues[outcome.winner];
  const netGain = grossGain - cost;
  if (netGain <= 0) {
    return { trade: false, reason: 'Transaction cost exhausts the gains from trade.', efficientOwner, grossGain, netGain };
  }
  const resalePrice = cleanValues[outcome.winner] + share * netGain;
  return {
    trade: true,
    initialOwner: outcome.winner,
    finalOwner: efficientOwner,
    grossGain,
    transactionCost: cost,
    netGain,
    resalePrice,
    finalWelfare: cleanValues[efficientOwner] - cost,
    caution: 'This is an ex-post bargaining diagnostic, not a PBE with anticipated resale.',
  };
}

export function collusionDiagnostic({ values = [0.95, 0.88, 0.62, 0.45], coalition = [0, 1, 2] } = {}) {
  const cleanValues = numericVector(values, 'Values');
  const members = [...new Set(coalition.map((member) => Math.trunc(member)))]
    .filter((member) => member >= 0 && member < cleanValues.length);
  if (members.length < 2) throw new RangeError('A coalition must contain at least two valid bidders.');
  const baselineBids = benchmarkBids(cleanValues, 'first-price');
  const baseline = coreOutcome({ format: 'first-price', values: cleanValues, bids: baselineBids });
  const designated = members.reduce((best, member) => (cleanValues[member] > cleanValues[best] ? member : best), members[0]);
  const outside = baselineBids
    .map((bid, bidder) => ({ bid, bidder }))
    .filter(({ bidder }) => !members.includes(bidder))
    .sort((a, b) => b.bid - a.bid)[0];
  const collusiveBids = [...baselineBids];
  members.forEach((member) => { collusiveBids[member] = member === designated ? (outside?.bid ?? 0) + 0.01 : 0.01; });
  const collusive = coreOutcome({ format: 'first-price', values: cleanValues, bids: collusiveBids });
  return {
    coalition: members,
    designated,
    baseline,
    collusive,
    revenueLoss: baseline.revenue - collusive.revenue,
    redFlags: ['Unusually low losing bids among linked identities', 'Repeated designated-winner rotation', 'Side payments or communication outside the platform'],
    caution: 'A flag is not proof. Credible detection requires repeated-auction logs and benign-alternative checks.',
  };
}

export function sellerCredibilityAudit({ values, bids, reserve = 0, shillBid }) {
  const official = coreOutcome({ format: 'second-price', values, bids, reserve });
  const fake = Math.max(0, finiteNumber(shillBid, 'Shill bid'));
  if (!official.sold || official.winner === null) {
    return { official, shillBid: fake, changed: false, reason: 'No legitimate winning bid cleared the reserve.' };
  }
  const winningBid = official.effectiveBids[official.winner];
  if (fake >= winningBid) {
    return {
      official,
      shillBid: fake,
      changed: true,
      executedPayment: null,
      reason: 'The undisclosed shill would displace the legitimate winner or force a failed sale.',
    };
  }
  const officialPayment = official.payments[official.winner];
  const executedPayment = Math.max(officialPayment, fake);
  return {
    official,
    shillBid: fake,
    changed: executedPayment > officialPayment + 1e-12,
    officialPayment,
    executedPayment,
    overcharge: executedPayment - officialPayment,
    reason: executedPayment > officialPayment
      ? 'The hidden shill raises the price above the committed second-price rule.'
      : 'The shill does not change this profile, but undisclosed seller participation still violates the commitment.',
  };
}

export function formatMetric(value, digits = 3) {
  return Number(value).toFixed(digits).replace(/\.?0+$/, '');
}
