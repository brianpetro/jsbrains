/**
 * @file get_links_to_depth.js
 * @module actions/get_links_to_depth
 * @description
 * Breadth‑first traversal over cached link data, returning an array of
 * `{ depth, item }` objects where `item` is a `SmartSource` instance and
 * `depth` is the hop‑count from the starting source.
 *
 * The function is pure: it never reads from disk or mutates entities.
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
 * Collect linked sources up to a chosen depth.
 *
 * @param {SmartSource} target_source                 – Root SmartSource.
 * @param {number}      [max_depth=1]                 – Max hops to follow.
 * @param {Object}      [opts={}]                     – Extra options.
 * @param {"out"|"in"|"both"} [opts.direction="out"] – Which link direction(s).
 * @param {boolean}     [opts.include_self=false]     – Include root in results.
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
  const links_map  = collection.links || {};        // { inlinkPath: { srcPath:true } }

  /** @type {Set<string>} */
  const visited = new Set();                        // Dedup by key
  /** @type {Array<{ depth:number, item:SmartSource }>} */
  const results = [];

  /**
   * Enqueue neighbour if unseen.
   * @param {SmartSource|undefined|null} src
   * @param {number} d – depth of neighbour
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
    if (current.depth >= max_depth) continue;
    const nextDepth = current.depth + 1;

    // ------ OUTLINKS ------
    if (direction === LINK_DIRECTIONS.OUT || direction === LINK_DIRECTIONS.BOTH) {
      for (const link of current.src.outlinks) {
        enqueue(collection.get(link.key), nextDepth);
      }
    }

    // ------ INLINKS ------
    if (direction === LINK_DIRECTIONS.IN || direction === LINK_DIRECTIONS.BOTH) {
      const inlink_paths = Object.keys(links_map[current.src.path] || {});
      for (const p of inlink_paths) {
        enqueue(collection.get(p), nextDepth);
      }
    }
  }

  return results;
}
