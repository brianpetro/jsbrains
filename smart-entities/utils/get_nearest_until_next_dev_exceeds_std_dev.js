// // IN DEVELOPMENT (Collection.retrieve(strategy, opts))
// get retrieve_nearest_strategy() {
//   return [
//     get_top_k_by_sim,
//   ];
// }
// get retrieve_context_strategy() {
//   return [
//     get_top_k_by_sim,
//     get_nearest_until_next_dev_exceeds_std_dev,
//     sort_by_len_adjusted_similarity,
//   ];
// }
// get nearest until next deviation exceeds std dev
function get_nearest_until_next_dev_exceeds_std_dev(nearest) {
  if (nearest.length === 0) return []; // return empty array if no items

  // get std dev of similarity
  const sims = nearest.map((n) => n.score);
  const mean = sims.reduce((a, b) => a + b) / sims.length;
  let std_dev = Math.sqrt(sims.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / sims.length);
  // slice where next item deviation is greater than std_dev
  let slice_i = 0;
  while (slice_i < nearest.length) {
    const next = nearest[slice_i + 1];
    if (next) {
      const next_dev = Math.abs(next.score - nearest[slice_i].score);
      if (next_dev > std_dev) {
        if (slice_i < 3) std_dev = std_dev * 1.5;
        else break;
      }
    }
    slice_i++;
  }
  // select top results
  nearest = nearest.slice(0, slice_i + 1);
  return nearest;
}
