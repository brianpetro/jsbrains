export function find_connections(env, params={}) {
  const {
    key,
    limit = 50,
  } = params;
  if(!env.connections_cache[key]){
    const entity = env.smart_sources.get(key) || env.smart_blocks.get(key);
    if(!entity) return {error: "Entity not found."};
    const filter = prepare_filter(env, entity, params);
    const entity_type = entity.source ? 'block' : 'source';
    const has_block_embeddings = !!env.smart_blocks.smart_embed;
    let results = [];
    // if is source, has block embeddings, and has blocks
    if(entity_type === 'source'){
      const sources = entity.nearest(filter);
      if(has_block_embeddings && entity.blocks.length){
        const blocks = env.smart_blocks.nearest(entity.median_block_vec, filter);
        results = blocks.concat(sources);
      }else{
        results = sources;
      }
    }else{
      results = entity.nearest(filter);
    }
    env.connections_cache[key] = results
      .sort(sort_by_score)
    ;
  }
  return env.connections_cache[key]
    .slice(0, limit) // limit to top N results
  ;
}
function prepare_filter(env, entity, params={}) {
  const {
    filter={},
    exclude_filter,
    include_filter,
    exclude_inlinks,
    exclude_outlinks,
  } = params;
  filter.exclude_key_starts_with = entity.key; // exclude current entity
  // include/exclude filters
  if (exclude_filter){
    if(filter.exclude_key_starts_with){
      filter.exclude_key_starts_with_any = [filter.exclude_key_starts_with];
      delete filter.exclude_key_starts_with;
    }else if(!Array.isArray(filter.exclude_key_starts_with_any)) filter.exclude_key_starts_with_any = [];
    if(typeof exclude_filter === "string") filter.exclude_key_starts_with_any.push(exclude_filter);
    else if(Array.isArray(exclude_filter)) filter.exclude_key_starts_with_any.push(...exclude_filter);
  }
  if (include_filter){
    if(!Array.isArray(filter.key_starts_with_any)) filter.key_starts_with_any = [];
    if(typeof include_filter === "string") filter.key_starts_with_any.push(include_filter);
    else if(Array.isArray(include_filter)) filter.key_starts_with_any.push(...include_filter);
  }
  // exclude inlinks
  if (exclude_inlinks && env.links[entity.data.path]) {
    if(!Array.isArray(filter.exclude_key_starts_with_any)) filter.exclude_key_starts_with_any = [];
    filter.exclude_key_starts_with_any.push(...Object.keys(env.links[entity.data.path] || {}));
  }
  // exclude outlinks
  if (exclude_outlinks && env.links[entity.data.path]) {
    if(!Array.isArray(filter.exclude_key_starts_with_any)) filter.exclude_key_starts_with_any = [];
    filter.exclude_key_starts_with_any.push(...entity.outlink_paths);
  }
  return filter;
}
// sort by item.score descending
function sort_by_score(a, b) {
  if (a.score === b.score) return 0;
  return (a.score > b.score) ? -1 : 1;
}

export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "Find Connections",
    "description": "Find connections to an entity.",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "UNUSED"
    }
  ],
  "paths": {
    "/find-connections": {
      "post": {
        "operationId": "find_connections",
        "summary": "Find connections to an entity.",
        "description": "Find connections to an entity.",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "key"
                ],
                "properties": {
                  "key": {
                    "$ref": "#/components/schemas/key"
                  },
                  "filter": {
                    "$ref": "#/components/schemas/filter"
                  },
                  "exclude_filter": {
                    "type": "string",
                    "description": "Exclude entities with keys starting with this value. May be a comma separated list."
                  },
                  "include_filter": {
                    "type": "string",
                    "description": "Include entities with keys starting with this value. May be a comma separated list."
                  },
                  "exclude_inlinks": {
                    "type": "boolean",
                    "description": "Whether to exclude inlinks."
                  },
                  "exclude_outlinks": {
                    "type": "boolean",
                    "description": "Whether to exclude outlinks."
                  }
                }
              }
            }
          }
        },
      }
    }
  },
  "components": {
    "schemas": {
      "key": {
        "type": "string",
        "description": "The key of the entity."
      },
      "filter": {
        "type": "object",
        "description": "The filter to apply.",
        "properties": {
          "exclude_key": {
            "type": "string",
            "description": "Exclude entities with this specific key."
          },
          "exclude_keys": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Exclude entities with keys matching any in this array."
          },
          "exclude_key_starts_with": {
            "type": "string",
            "description": "Exclude entities with keys starting with this value."
          },
          "exclude_key_starts_with_any": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Exclude entities with keys starting with any of these values."
          },
          "key_ends_with": {
            "type": "string",
            "description": "Include entities with keys ending with this value."
          },
          "key_starts_with": {
            "type": "string",
            "description": "Include entities with keys starting with this value."
          },
          "key_starts_with_any": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Include entities with keys starting with any of these values."
          }
        }
      }
    }
  }
};