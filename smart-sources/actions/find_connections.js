import { sort_by_score } from "smart-utils/sort_by_score.js";
import {
  create_find_connections_filter_opts,
  find_connections as entities_find_connections,
} from "smart-entities/actions/find_connections.js";
import { murmur_hash_32_alphanumeric } from "smart-utils/create_hash.js";
/**
 * Finds connections relevant to this SmartSource based on provided parameters.
 * @async
 * @param {Object} [params={}] - Parameters for finding connections.
 * @param {boolean} [params.exclude_blocks_from_source_connections=false] - Whether to exclude block connections from source connections.
 * @returns {Array<SmartSource>} An array of relevant SmartSource entities.
 */
async function find_connections(params={}) {
  const filter_settings = this.env.settings.smart_view_filter;
  const exclude_blocks_from_source_connections = params.exclude_blocks_from_source_connections ?? filter_settings?.exclude_blocks_from_source_connections ?? false;
  const limit = params.filter?.limit
    || params.limit // DEPRECATED: for backwards compatibility
    || this.env.settings.smart_view_filter?.results_limit
    || 20
  ;
  let connections;
  if(this.block_collection.settings.embed_blocks && !exclude_blocks_from_source_connections) connections = [];
  else connections = await entities_find_connections.call(this, params);
  const filter_opts = create_find_connections_filter_opts(this, params);
  if(params.filter?.limit) delete params.filter.limit; // Remove to prevent limiting in initial filter (limit should happen after nearest for lookup)
  if(params.limit) delete params.limit; // Backwards compatibility
  if(!exclude_blocks_from_source_connections) {
    const cache_key = this.key + murmur_hash_32_alphanumeric(JSON.stringify({...filter_opts, entity: null})) + "_blocks";
    if(!this.env.connections_cache) this.env.connections_cache = {};
    if(!this.env.connections_cache[cache_key]){
      const nearest = (await this.env.smart_blocks.nearest(this.vec, filter_opts))
        .sort(sort_by_score)
        .slice(0, limit)
      ;
      this.connections_to_cache(cache_key, nearest);
    }
    connections = [
      ...connections,
      ...this.connections_from_cache(cache_key),
    ].sort(sort_by_score).slice(0, limit);
  }
  return connections;
}
find_connections.action_type = "connections";

export { find_connections };