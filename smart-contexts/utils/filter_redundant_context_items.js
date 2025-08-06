export function filter_redundant_context_items(items = []) {
  const parents = new Set();
  for (const { key } of items) {
    if (!key.includes('#')) parents.add(key);
  }
  return items.filter(({ key }) => {
    if (!key.includes('#')) return true;
    const base = key.split('#')[0];
    return !parents.has(base);
  });
}

export default filter_redundant_context_items;
