/**
 * Accumulate top-k (highest score) results in _acc.results.
 * @param {Object} _acc
 * @param {Set}   _acc.results  - The set of accumulated results so far.
 * @param {number} _acc.min     - The currently known minimum score in the set.
 * @param {Object} _acc.minResult - The result object with the min score.
 * @param {Object} result       - { item: <item>, score: <number> }.
 * @param {number} [ct=10]      - The maximum number of results to keep.
 * 
 * NOTE:  Caller should initialize _acc as:
 *        { results: new Set(), min: Number.POSITIVE_INFINITY, minResult: null }
 */
export function results_acc(_acc, result, ct = 10) {
  // If under capacity, just add:
  if (_acc.results.size < ct) {
    _acc.results.add(result);

    // Once we reach capacity, figure out the min so we know the threshold
    if (_acc.results.size === ct && _acc.min === Number.POSITIVE_INFINITY) {
      let { minScore, minObj } = find_min(_acc.results);
      _acc.min = minScore;
      _acc.minResult = minObj;
    }
  }
  // If already at capacity, only add if score is bigger than the known min
  else if (result.score > _acc.min) {
    _acc.results.add(result);
    // Remove the old min
    _acc.results.delete(_acc.minResult);

    // Recalculate the new min in the set
    let { minScore, minObj } = find_min(_acc.results);
    _acc.min = minScore;
    _acc.minResult = minObj;
  }
}

/**
 * Accumulate top-k (lowest score) results in _acc.results.
 * @param {Object} _acc
 * @param {Set}   _acc.results  - The set of accumulated results so far.
 * @param {number} _acc.max     - The currently known maximum score in the set.
 * @param {Object} _acc.maxResult - The result object with the max score.
 * @param {Object} result       - { item: <item>, score: <number> }.
 * @param {number} [ct=10]      - The maximum number of results to keep.
 * 
 * NOTE:  Caller should initialize _acc as:
 *        { results: new Set(), max: Number.NEGATIVE_INFINITY, maxResult: null }
 */
export function furthest_acc(_acc, result, ct = 10) {
  // If under capacity, just add:
  if (_acc.results.size < ct) {
    _acc.results.add(result);

    // Once we reach capacity, figure out the max so we know the threshold
    if (_acc.results.size === ct && _acc.max === Number.NEGATIVE_INFINITY) {
      let { maxScore, maxObj } = find_max(_acc.results);
      _acc.max = maxScore;
      _acc.maxResult = maxObj;
    }
  }
  // If at capacity, only add if score is smaller than the known max
  else if (result.score < _acc.max) {
    _acc.results.add(result);
    // Remove the old max
    _acc.results.delete(_acc.maxResult);

    // Recalculate the new max in the set
    let { maxScore, maxObj } = find_max(_acc.results);
    _acc.max = maxScore;
    _acc.maxResult = maxObj;
  }
}

/**
 * Helper to find the item with the smallest .score in a set of results
 * @param {Set} results - A set of objects like { item, score }
 * @returns {{ minScore: number, minObj: object }}
 */
function find_min(results) {
  let minScore = Number.POSITIVE_INFINITY;
  let minObj = null;
  for (const obj of results) {
    if (obj.score < minScore) {
      minScore = obj.score;
      minObj = obj;
    }
  }
  return { minScore, minObj };
}

/**
 * Helper to find the item with the largest .score in a set of results
 * @param {Set} results - A set of objects like { item, score }
 * @returns {{ maxScore: number, maxObj: object }}
 */
function find_max(results) {
  let maxScore = Number.NEGATIVE_INFINITY;
  let maxObj = null;
  for (const obj of results) {
    if (obj.score > maxScore) {
      maxScore = obj.score;
      maxObj = obj;
    }
  }
  return { maxScore, maxObj };
}
