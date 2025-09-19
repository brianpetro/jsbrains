export function compare(item, to_item, params={}) {
  const {
    algo = (a, b) => ({ is_equal: a === b }),
  } = params;
  if (typeof algo !== 'function') return { item: to_item, error: 'Invalid comparison function' };
  return {
    item: to_item,
    ...(algo(item, to_item) || { error: 'Comparison function did not return a result' })
  };
}
