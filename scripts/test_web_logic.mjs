import assert from 'node:assert/strict';
import {
  SCHOOL_CHOICE_SCENARIO,
  analyzePureNash,
  classifyGame,
  describeMatchingRound,
  findBlockingPairs,
  findPureNash,
  runBoston,
  runDeferredAcceptance,
  solveBayesianEntry,
  solveSequentialEntry,
  validateAbstract,
} from '../web/logic.js';
import {
  benchmarkBid,
  benchmarkBids,
  classifyAuction,
  collusionDiagnostic,
  resaleDiagnostic,
  revenueEquivalenceExperiment,
  runAuction,
  sellerCredibilityAudit,
  winnerCurseDiagnostic,
} from '../web/auction-logic.js';

const invalid = classifyGame({ players: [{ name: 'One', strategies: ['Act'] }] });
assert.equal(invalid.valid, false);
assert.equal(invalid.problems.length, 2);

const players = [
  { name: 'Entrant', strategies: ['In', 'Out'] },
  { name: 'Incumbent', strategies: ['Fight', 'Accommodate'] },
];
assert.equal(classifyGame({ players }).lens, 'Nash');
assert.equal(classifyGame({ players, sequential: true, observedMoves: true }).lens, 'Selten');
assert.equal(classifyGame({ players, privateInformation: true }).lens, 'Harsanyi');

assert.deepEqual(findPureNash([[3, 0], [5, 1]], [[3, 5], [0, 1]]), [[1, 1]]);
assert.deepEqual(findPureNash([[1, -1], [-1, 1]], [[-1, 1], [1, -1]]), []);
assert.deepEqual(analyzePureNash([[3, 0], [5, 1]], [[3, 5], [0, 1]]), {
  rowBestCells: [[1, 0], [1, 1]],
  columnBestCells: [[0, 1], [1, 1]],
  equilibria: [[1, 1]],
});

const sequential = solveSequentialEntry();
assert.deepEqual(sequential.incumbentBestActions, ['Accommodate']);
assert.deepEqual(sequential.profiles, [{ entrant: 'Enter', incumbent: 'Accommodate', outcome: 'Accommodate', payoffs: [2, 1] }]);
const deterred = solveSequentialEntry({ out: [1, 2], fight: [-1, 3], accommodate: [2, 1] });
assert.equal(deterred.profiles[0].entrant, 'Stay out');
assert.equal(deterred.profiles[0].incumbent, 'Fight');

const bayesian = solveBayesianEntry();
assert.deepEqual(bayesian.typeBestActions, { Tough: ['Fight'], Weak: ['Accommodate'] });
assert.ok(Math.abs(bayesian.expectedEntryRange[0] - 0.8) < 1e-9);
assert.equal(bayesian.entrantRecommendation, 'Enter');
assert.equal(solveBayesianEntry({ probabilityTough: 0.8 }).entrantRecommendation, 'Stay out');

assert.equal(validateAbstract('Institutions allocate scarce goods. However, existing work leaves the behavioral gap unresolved. We test a mechanism.').passes, true);
assert.equal(validateAbstract('Institutions allocate scarce goods. We build a mechanism.').passes, false);

const boston = runBoston(SCHOOL_CHOICE_SCENARIO);
const deferred = runDeferredAcceptance(SCHOOL_CHOICE_SCENARIO);
assert.equal(boston.byStudent.Bo, 'Cedar');
assert.equal(deferred.byStudent.Bo, 'Aurora');
assert.deepEqual(findBlockingPairs(SCHOOL_CHOICE_SCENARIO, boston), [['Bo', 'Aurora']]);
assert.deepEqual(findBlockingPairs(SCHOOL_CHOICE_SCENARIO, deferred), []);
const bostonRoundOne = describeMatchingRound(SCHOOL_CHOICE_SCENARIO, boston, 1, 'boston');
assert.deepEqual(bostonRoundOne.proposals, ['Chen → Aurora', 'Dara → Aurora', 'Amina → Beacon', 'Bo → Beacon']);
assert.match(bostonRoundOne.decisions.join(' '), /FINAL accept Amina/);
assert.match(bostonRoundOne.continuation, /Permanently assigned and out: Amina, Chen/);
const deferredRoundTwo = describeMatchingRound(SCHOOL_CHOICE_SCENARIO, deferred, 2, 'deferred');
assert.match(deferredRoundTwo.decisions.join(' '), /tentatively hold Bo; reject\/release Chen/);
assert.match(deferredRoundTwo.continuation, /Rejected or displaced and proposing next: Chen/);

assert.equal(classifyAuction('first-price').solution, 'Bayesian Nash equilibrium (BNE)');
assert.match(classifyAuction('english').solution, /Perfect Bayesian equilibrium/);
assert.match(classifyAuction('second-price').solution, /DSIC/);
assert.ok(Math.abs(benchmarkBid(0.8, 4, 'first-price') - 0.6) < 1e-12);
assert.ok(Math.abs(benchmarkBid(0.8, 4, 'all-pay') - 0.3072) < 1e-12);

const auctionValues = [0.92, 0.73, 0.55, 0.31];
const firstPrice = runAuction({
  format: 'first-price',
  values: auctionValues,
  bids: benchmarkBids(auctionValues, 'first-price'),
});
assert.equal(firstPrice.winner, 0);
assert.ok(Math.abs(firstPrice.revenue - 0.69) < 1e-12);
assert.equal(firstPrice.winnerIsHighestValue, true);

const vickrey = runAuction({ format: 'second-price', values: auctionValues, bids: auctionValues });
assert.equal(vickrey.winner, 0);
assert.ok(Math.abs(vickrey.payments[0] - 0.73) < 1e-12);
assert.ok(vickrey.maximumRegret < 1e-9);

const allPay = runAuction({
  format: 'all-pay',
  values: auctionValues,
  bids: benchmarkBids(auctionValues, 'all-pay'),
});
assert.ok(allPay.loserPayments > 0);
assert.equal(allPay.exPostIndividualRationality, false);

const revenueCheck = revenueEquivalenceExperiment({ bidderCount: 4, samples: 6000, seed: 206 });
assert.ok(Math.abs(revenueCheck.theoreticalRevenue - 0.6) < 1e-12);
Object.values(revenueCheck.estimates).forEach((estimate) => assert.ok(Math.abs(estimate - 0.6) < 0.025));

const curse = winnerCurseDiagnostic({ signals: [0.9, 0.72, 0.63, 0.55], trueValue: 0.58 });
assert.equal(curse.winnerCurse, true);
assert.ok(curse.winnerProfit < 0);

const inefficient = runAuction({
  format: 'first-price',
  values: [0.95, 0.8, 0.45, 0.25],
  bids: [0.5, 0.82, 0.33, 0.18],
});
const resale = resaleDiagnostic(inefficient, [0.95, 0.8, 0.45, 0.25], { transactionCost: 0.04 });
assert.equal(resale.trade, true);
assert.equal(resale.finalOwner, 0);

const collusion = collusionDiagnostic();
assert.ok(collusion.revenueLoss > 0);
assert.ok(collusion.collusive.revenue < collusion.baseline.revenue);

const credibility = sellerCredibilityAudit({ values: auctionValues, bids: auctionValues, shillBid: 0.85 });
assert.equal(credibility.changed, true);
assert.ok(Math.abs(credibility.overcharge - 0.12) < 1e-12);

console.log('Web logic checks passed: game triage, equilibrium labs, auction formats, revenue equivalence, stress tests, abstract gap, matching paths, and stability.');
