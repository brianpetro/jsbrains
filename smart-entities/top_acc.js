export function top_acc(_acc, item, ct = 10) {
  if (_acc.items.size < ct) {
    _acc.items.add(item);
  } else if (item.sim > _acc.min) {
    _acc.items.add(item);
    _acc.items.delete(_acc.minItem);
    _acc.minItem = Array.from(_acc.items).reduce((min, curr) => (curr.sim < min.sim ? curr : min));
    _acc.min = _acc.minItem.sim;
  }
}
