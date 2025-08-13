export function compare(item, to_item, compare_fn = (a, b) => ({ is_equal: a === b })) {
  if (typeof compare_fn !== 'function') return { item, error: 'Invalid comparison function' };
  return {
    item,
    ...(compare_fn(item, to_item) || { error: 'Comparison function did not return a result' })
  };
}
