import { sort_by_score } from "../utils/sort_by_score.js";
/**
 * Finds connections relevant to this entity based on provided parameters.
 * @async
 * @param {Object} [params={}] - Parameters for finding connections.
 * @returns {Array<{item:Object, score:number}>} An array of result objects with score and item.
 */
export async function find_connections(params = {}) {
  const filter_opts = this.prepare_find_connections_filter_opts(params);
  const limit = params.filter?.limit
    || params.limit // DEPRECATED: for backwards compatibility
    || this.env.settings.smart_view_filter?.results_limit
    || 10;
  const cache_key = this.key + JSON.stringify(params); // no objects/instances in cache key
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