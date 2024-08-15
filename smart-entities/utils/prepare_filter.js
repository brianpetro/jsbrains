export function prepare_filter(env, entity, params = {}) {
  const {
    filter = {}, exclude_filter, include_filter, exclude_inlinks, exclude_outlinks,
  } = params;
  filter.exclude_key_starts_with = entity.key; // exclude current entity

  // include/exclude filters
  if (exclude_filter) {
    if (filter.exclude_key_starts_with) {
      filter.exclude_key_starts_with_any = [filter.exclude_key_starts_with];
      delete filter.exclude_key_starts_with;
    } else if (!Array.isArray(filter.exclude_key_starts_with_any)) filter.exclude_key_starts_with_any = [];
    if (typeof exclude_filter === "string") filter.exclude_key_starts_with_any.push(exclude_filter);
    else if (Array.isArray(exclude_filter)) filter.exclude_key_starts_with_any.push(...exclude_filter);
  }
  if (include_filter) {
    if (!Array.isArray(filter.key_starts_with_any)) filter.key_starts_with_any = [];
    if (typeof include_filter === "string") filter.key_starts_with_any.push(include_filter);
    else if (Array.isArray(include_filter)) filter.key_starts_with_any.push(...include_filter);
  }
  // exclude inlinks
  if (exclude_inlinks && env.links[entity.data.path]) {
    if (!Array.isArray(filter.exclude_key_starts_with_any)) filter.exclude_key_starts_with_any = [];
    filter.exclude_key_starts_with_any.push(...Object.keys(env.links[entity.data.path] || {}));
  }
  // exclude outlinks
  if (exclude_outlinks && env.links[entity.data.path]) {
    if (!Array.isArray(filter.exclude_key_starts_with_any)) filter.exclude_key_starts_with_any = [];
    filter.exclude_key_starts_with_any.push(...entity.outlink_paths);
  }
  return filter;
}
