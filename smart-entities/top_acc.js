// export function top_acc(_acc, item, ct = 10) {
//   if (_acc.items.size < ct) {
//     _acc.items.add(item);
//   } else if (item.sim > _acc.min) {
//     _acc.items.add(item);
//     _acc.items.delete(_acc.minItem);
//     _acc.minItem = Array.from(_acc.items).reduce((min, curr) => (curr.sim < min.sim ? curr : min));
//     _acc.min = _acc.minItem.sim;
//   }
// }

export function results_acc(_acc, result, ct = 10) {
  if (_acc.results.size < ct) {
    _acc.results.add(result);
  } else if (result.score > _acc.min) {
    _acc.results.add(result);
    _acc.results.delete(_acc.minResult);
    _acc.minResult = Array.from(_acc.results).reduce((min, curr) => (curr.score < min.score ? curr : min));
    _acc.min = _acc.minResult.score;
  }
}
