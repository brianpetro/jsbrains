/**
 * @file test_acc.js
 * @description Integration-level tests for results_acc and furthest_acc using AVA.
 *
 * To run:
 *   npx ava test_acc.js
 */

import test from 'ava';
import { results_acc, furthest_acc } from './results_acc.js';

/**
 * Builds a fresh accumulator object.
 * @returns {{results: Set<any>, min: number, minResult: any, max: number, maxResult: any}}
 */
function build_acc() {
  return {
    results: new Set(),
    min: Infinity,
    minResult: null,
    max: -Infinity,
    maxResult: null
  };
}

test('results_acc: adds items when below capacity', t => {
  const acc = build_acc();
  const ct = 3;

  results_acc(acc, { score: 10 }, ct);
  results_acc(acc, { score: 5 }, ct);

  t.is(acc.results.size, 2, 'Should add all items when below capacity');
  t.deepEqual([...acc.results], [{ score: 10 }, { score: 5 }]);
});

test('results_acc: does not add new item if its score <= current min when at capacity', t => {
  const acc = build_acc();
  const ct = 3;

  // Fill to capacity
  results_acc(acc, { score: 10 }, ct);
  results_acc(acc, { score: 8 }, ct);
  results_acc(acc, { score: 6 }, ct);

  // Make sure min and minResult are correct
  t.is(acc.results.size, 3);
  t.not(acc.min, Infinity);
  t.not(acc.minResult, null);

  // Attempt to add item with score <= min
  const oldMin = acc.min;
  results_acc(acc, { score: oldMin }, ct);

  t.is(acc.results.size, 3, 'Should not add an item with score equal to the current min');
});

test('results_acc: replaces min item if new score is larger than current min when at capacity', t => {
  const acc = build_acc();
  const ct = 3;

  // Fill to capacity
  results_acc(acc, { score: 10 }, ct);
  results_acc(acc, { score: 8 }, ct);
  results_acc(acc, { score: 6 }, ct);

  t.is(acc.results.size, 3);

  // The current min is 6
  // Add a new item with a bigger score than 6
  results_acc(acc, { score: 9 }, ct);

  // Ensure we still have exactly 3 results
  t.is(acc.results.size, 3, 'Should remain at capacity');
  // The new min should not be the old min (6)
  t.false([...acc.results].some((item) => item.score === 6), 'Should have removed the old min item');
});

test('furthest_acc: adds items when below capacity', t => {
  const acc = build_acc();
  const ct = 3;

  furthest_acc(acc, { score: 10 }, ct);
  furthest_acc(acc, { score: 20 }, ct);

  t.is(acc.results.size, 2, 'Should add all items when below capacity');
  t.deepEqual([...acc.results], [{ score: 10 }, { score: 20 }]);
});

test('furthest_acc: does not add new item if its score >= current max when at capacity', t => {
  const acc = build_acc();
  const ct = 3;

  // Fill to capacity
  furthest_acc(acc, { score: 5 }, ct);
  furthest_acc(acc, { score: 10 }, ct);
  furthest_acc(acc, { score: 15 }, ct);

  // Attempt to add item with score >= max
  const oldMax = acc.max;
  furthest_acc(acc, { score: oldMax }, ct);

  t.is(acc.results.size, 3, 'Should not add an item when new score >= current max');
});

test('furthest_acc: replaces max item if new score is smaller than current max when at capacity', t => {
  const acc = build_acc();
  const ct = 3;

  // Fill to capacity
  furthest_acc(acc, { score: 5 }, ct);
  furthest_acc(acc, { score: 10 }, ct);
  furthest_acc(acc, { score: 15 }, ct);

  t.is(acc.results.size, 3);

  // The current max is 15
  // Add a new item with a smaller score
  furthest_acc(acc, { score: 7 }, ct);

  // Ensure we still have exactly 3 results
  t.is(acc.results.size, 3, 'Should remain at capacity');
  // The old max (15) should be removed
  t.false([...acc.results].some((item) => item.score === 15), 'Should have removed the old max item');
});
