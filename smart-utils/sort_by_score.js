export function sort_by_score(a, b) {
  const epsilon = 1e-9; // Small threshold for float comparison
  const score_diff = a.score - b.score;
  
  if (Math.abs(score_diff) < epsilon) return 0;
  return score_diff > 0 ? -1 : 1;
}

export function sort_by_score_descending(a, b) {
  return sort_by_score(a, b);
}

export function sort_by_score_ascending(a, b) {
  return sort_by_score(a, b) * -1;
}