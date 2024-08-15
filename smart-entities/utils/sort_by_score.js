export function sort_by_score(a, b) {
  const epsilon = 1e-9; // Small threshold for float comparison
  const score_diff = a.score - b.score;
  
  if (Math.abs(score_diff) < epsilon) return 0;
  return score_diff > 0 ? -1 : 1;
}