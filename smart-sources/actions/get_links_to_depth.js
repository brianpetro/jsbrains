/**
 * @file get_links_to_depth.js
 * @module actions/get_links_to_depth
 * @description
 * Breadth-first traversal over cached link data, returning an array of
 * `{ depth, item }` objects where `item` is a `SmartSource` instance and
 * `depth` is the hop-count from the starting source.
 *
 * The function is pure: it never reads from disk or mutates entities.
 *
 * Notes:
 * - OUTLINK expansion skips Bases-embed generated links for non-root nodes.
 *   A link is treated as "from a Bases embed" when `link.bases_row` exists
 *   and is a finite number.
 *
 * @example
 * ```js
 * import { get_links_to_depth, LINK_DIRECTIONS } from "smart-sources/actions/get_links_to_depth.js";
 *
 * const graph = await get_links_to_depth(start, 2, {
 *   direction: LINK_DIRECTIONS.BOTH,
 *   include_self: true,
 * });
 * // => [ { depth:0, item:start }, { depth:1, item:neighbour1 }, ... ]
 * ```
 */

/**
 * Direction enum for clarity.
 * @readonly
 * @enum {string}
 */
export const LINK_DIRECTIONS = /** @type {const} */ ({
  OUT: "out",
  IN: "in",
  BOTH: "both",
});

/**
 * True if an outlink should be excluded because it came from a Bases embed
 * AND the current node is not the root (depth > 0).
 *
 * Detection rule:
 * - `bases_row` exists on the link object AND is a finite number.
 *
 * @param {any} link
 * @param {number} source_depth
 * @returns {boolean}
 */
function should_exclude_bases_embed_outlink(link, source_depth) {
  if (typeof source_depth !== "number" || source_depth <= 0) return false;
  if (!link || typeof link !== "object") return false;

  if (!Object.prototype.hasOwnProperty.call(link, "bases_row")) return false;

  return Number.isFinite(link.bases_row);
}

/**
 * Collect linked sources up to a chosen depth.
 *
 * @param {SmartSource} target_source                 - Root SmartSource.
 * @param {number}      [max_depth=1]                 - Max hops to follow.
 * @param {Object}      [opts={}]                     - Extra options.
 * @param {"out"|"in"|"both"} [opts.direction="out"]  - Which link direction(s).
 * @param {boolean}     [opts.include_self=false]     - Include root in results.
 * @returns {Promise<Array<{ depth:number, item:SmartSource }>>}
 */
export function get_links_to_depth(
  target_source,
  max_depth = 1,
  {
    direction = LINK_DIRECTIONS.OUT,
    include_self = false,
  } = {},
) {
  if (!target_source || typeof target_source !== "object" || !target_source.collection) {
    // throw new TypeError("Invalid target_source supplied to get_links_to_depth()");
    return [];
  }

  const collection = target_source.collection;      // SmartSources instance
  const links_map = collection.links || {};         // { inlinkPath: { srcPath:true } }

  /** @type {Set<string>} */
  const visited = new Set();                        // Dedup by key
  /** @type {Array<{ depth:number, item:SmartSource }>} */
  const results = [];

  /**
   * Enqueue neighbour if unseen.
   * @param {SmartSource|undefined|null} src
   * @param {number} d - depth of neighbour
   */
  const enqueue = (src, d) => {
    if (!src) return;
    if (visited.has(src.key)) return;
    visited.add(src.key);
    queue.push({ src, depth: d });
    results.push({ depth: d, item: src });
  };

  /** @type {Array<{ src:SmartSource, depth:number }>} */
  const queue = [{ src: target_source, depth: 0 }];

  if (include_self) {
    visited.add(target_source.key);
    results.push({ depth: 0, item: target_source });
  }

  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;

    const current_depth = current.depth;
    if (current_depth >= max_depth) continue;

    const next_depth = current_depth + 1;

    // ------ OUTLINKS ------
    if (direction === LINK_DIRECTIONS.OUT || direction === LINK_DIRECTIONS.BOTH) {
      const outlinks = Array.isArray(current.src.outlinks) ? current.src.outlinks : [];
      for (const link of outlinks) {
        if (should_exclude_bases_embed_outlink(link, current_depth)) {
          continue;
        }
        enqueue(collection.get(link.key), next_depth);
      }
    }

    // ------ INLINKS ------
    if (direction === LINK_DIRECTIONS.IN || direction === LINK_DIRECTIONS.BOTH) {
      const inlink_paths = Object.keys(links_map[current.src.path] || {});
      for (const p of inlink_paths) {
        enqueue(collection.get(p), next_depth);
      }
    }
  }

  return results;
}
