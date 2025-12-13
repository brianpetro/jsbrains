import { sort_by_score } from "smart-utils/sort_by_score.js";
import { murmur_hash_32_alphanumeric } from "smart-utils/create_hash.js";

const FRONTMATTER_SUFFIX = '---frontmatter---';

const to_array = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => typeof entry === 'string' ? entry.trim() : '')
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === 'string') {
    const parts = value.includes(',') ? value.split(',') : [value];
    return parts
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  return [];
};

const merge_settings_with_params = (entity, params = {}) => ({
  ...(entity.env.settings.smart_view_filter || {}),
  ...params,
  entity,
});

const remove_limit_fields = (filter_opts) => {
  const next = { ...filter_opts };
  if (typeof next.limit !== 'undefined') delete next.limit;
  if (next.filter) {
    next.filter = { ...next.filter };
    if (typeof next.filter.limit !== 'undefined') delete next.filter.limit;
  }
  return next;
};

const apply_frontmatter_exclusion = (filter_opts) => {
  if (!filter_opts.exclude_frontmatter_blocks) return filter_opts;
  const next = { ...filter_opts };
  const suffixes = Array.isArray(next.exclude_key_ends_with_any)
    ? [...next.exclude_key_ends_with_any]
    : [];
  suffixes.push(FRONTMATTER_SUFFIX);
  next.exclude_key_ends_with_any = suffixes;
  return next;
};

const append_entity_filters = (filter_opts, entity) => {
  if (!entity) return filter_opts;
  const next = { ...filter_opts };
  let exclude_starts = Array.isArray(next.exclude_key_starts_with_any)
    ? [...next.exclude_key_starts_with_any]
    : [];
  if (typeof next.exclude_key_starts_with === 'string') {
    exclude_starts.push(next.exclude_key_starts_with);
    delete next.exclude_key_starts_with;
  }
  const entity_key = entity.source_key || entity.key;
  if (entity_key) exclude_starts.push(entity_key);
  if (next.exclude_inlinks && Array.isArray(entity.inlinks) && entity.inlinks.length) {
    exclude_starts = [...exclude_starts, ...entity.inlinks];
  }
  if (next.exclude_outlinks && Array.isArray(entity.outlinks) && entity.outlinks.length) {
    exclude_starts = [...exclude_starts, ...entity.outlinks.map(o => o.key)];
  }
  if (exclude_starts.length) next.exclude_key_starts_with_any = exclude_starts;

  if (next.exclude_filter) {
    const exclude_values = to_array(next.exclude_filter);
    const current = Array.isArray(next.exclude_key_includes_any)
      ? [...next.exclude_key_includes_any]
      : [];
    next.exclude_key_includes_any = [...current, ...exclude_values];
  }

  if (next.include_filter) {
    const include_values = to_array(next.include_filter);
    const current = Array.isArray(next.key_includes_any)
      ? [...next.key_includes_any]
      : [];
    next.key_includes_any = [...current, ...include_values];
  }

  return next;
};

/**
 * Normalizes filter options for the find_connections action.
 * Combines smart view settings with params and derives include/exclude filters based on the entity.
 * @param {Object} entity - The SmartEntity instance invoking the action.
 * @param {Object} [params={}] - Parameters passed to find_connections.
 * @returns {Object} Normalized filter options ready for nearest lookups.
 */
const create_find_connections_filter_opts = (entity, params = {}) => {
  const merged = merge_settings_with_params(entity, params);
  const without_limits = remove_limit_fields(merged);
  const with_frontmatter = apply_frontmatter_exclusion(without_limits);
  return append_entity_filters(with_frontmatter, entity);
};

/**
 * Finds connections relevant to this entity based on provided parameters.
 * @async
 * @param {Object} [params={}] - Parameters for finding connections.
 * @returns {Array<{item:Object, score:number}>} An array of result objects with score and item.
 */
async function find_connections(params = {}) {
  const limit = params.filter?.limit
    || params.limit // DEPRECATED: for backwards compatibility
    || this.env.settings.smart_view_filter?.results_limit
    || 10;
  const filter_opts = create_find_connections_filter_opts(this, params);
  if (params.filter?.limit) delete params.filter.limit;
  if (params.limit) delete params.limit;
  const cache_key = this.key + murmur_hash_32_alphanumeric(JSON.stringify({ ...filter_opts, entity: null })); // no objects/instances in cache key
  if (!this.env.connections_cache) this.env.connections_cache = {};
  if (!this.env.connections_cache[cache_key]) {
    const connections = (await this.nearest(filter_opts))
      .sort(sort_by_score)
      .slice(0, limit);
    this.connections_to_cache(cache_key, connections);
  }
  return this.connections_from_cache(cache_key);
}
find_connections.action_type = "connections";
export { find_connections, create_find_connections_filter_opts };