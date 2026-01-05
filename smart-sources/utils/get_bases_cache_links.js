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
    const markdown_table = cache_items?.[cache_key]?.markdown_table;
    if (!markdown_table) return [];
    const table_links = get_markdown_links(markdown_table);
    if (!table_links.length) return [];
    return table_links.map(table_link => ({
      ...table_link,
      line: link.line,
      bases_row: table_link.line - 2, // Adjust for table header rows
    }));
  });
}

export default get_bases_cache_links;
