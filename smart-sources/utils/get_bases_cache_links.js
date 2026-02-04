import { get_markdown_links } from "./get_markdown_links.js";

/**
 * Extract links from Bases cache entries for embedded Bases links.
 *
 * @param {Object} params
 * @param {import('../smart_source.js').SmartSource} params.source
 * @param {Array<{title:string,target:string,line?:number,embedded?:boolean}>} [params.links=[]]
 * @param {Record<string, { markdown_table?: string }>} [params.cache]
 * @returns {Array<{title:string,target:string,line?:number,embedded?:boolean}>}
 */
export function get_bases_cache_links({ source, links = [], cache } = {}) {
  // console.log('get_bases_cache_links called with source:', source?.key, 'links:', links.length, 'cache items:', cache ? Object.keys(cache).length : 'none');
  if (!source || !Array.isArray(links) || !links.length) return [];
  const cache_items = cache || source?.env?.bases_caches?.items;
  if (!cache_items) return [];
  const source_key = source?.key || source?.path;
  if (!source_key) return [];

  return links.flatMap(link => {
    if (!link?.embedded) return [];
    if (typeof link.target !== 'string' || !link.target.includes('.base')) return [];
    const cache_key = `${source_key}#${link.target}`;
    const markdown_table = get_bases_markdown_table(cache_items?.[cache_key]);
    if (!markdown_table) return [];
    return get_bases_table_links({ markdown_table, line_override: link.line });
  });
}

/**
 * Extract links from Bases cache entries for base file sources.
 *
 * @param {Object} params
 * @param {import('../smart_source.js').SmartSource} params.source
 * @param {Record<string, { markdown_table?: string }>} [params.cache]
 * @returns {Array<{title:string,target:string,line?:number,embedded?:boolean,bases_row?:number}>}
 */
export function get_bases_file_links({ source, cache } = {}) {
  if (!source || typeof source !== 'object') return [];
  const cache_items = cache || source?.env?.bases_caches?.items;
  if (!cache_items) return [];
  const source_key = source?.key || source?.path;
  if (!source_key) return [];
  const markdown_table = get_bases_markdown_table(cache_items?.[source_key]);
  if (!markdown_table) return [];
  return get_bases_table_links({ markdown_table });
}

/**
 * Normalize a bases cache item into a markdown table string.
 *
 * @param {Object} cache_item
 * @returns {string}
 */
function get_bases_markdown_table(cache_item) {
  if (!cache_item) return '';
  if (typeof cache_item.markdown_table === 'string') return cache_item.markdown_table;
  if (typeof cache_item.markdown_table === 'function') return cache_item.markdown_table();
  if (typeof cache_item?.data?.markdown_table === 'string') return cache_item.data.markdown_table;
  return '';
}

/**
 * Parse bases markdown table links and assign bases_row offsets.
 *
 * @param {Object} params
 * @param {string} params.markdown_table
 * @param {number} [params.line_override]
 * @returns {Array<{title:string,target:string,line?:number,embedded?:boolean,bases_row?:number}>}
 */
function get_bases_table_links({ markdown_table, line_override } = {}) {
  if (!markdown_table) return [];
  const table_links = get_markdown_links(markdown_table);
  if (!table_links.length) return [];
  return table_links.map(table_link => ({
    ...table_link,
    line: typeof line_override === 'number' ? line_override : table_link.line,
    bases_row: table_link.line - 2, // Adjust for table header rows
  }));
}

export default get_bases_cache_links;
