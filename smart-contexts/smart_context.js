/**
 * smart_context.js
 * 
 * @fileoverview
 * Provides the SmartContext class and its updated implementation based on the 
 * latest specs, including the new `respect_exclusions()` method that relies on 
 * `parse_blocks` logic from `smart-blocks/parsers/markdown.js`.
 */

import { CollectionItem } from 'smart-collections';
import { build_context } from './utils/build_context.js';
import { respect_exclusions } from './utils/respect_exclusions.js';
import { murmur_hash_32_alphanumeric } from '../../../advanced-env/utils/create_hash.js';

/**
 * @class SmartContext
 * @extends CollectionItem
 * @classdesc Represents a single contextual set of references or file paths relevant to a user flow,
 * with updated methods to handle excluded headings logic.
 */
export class SmartContext extends CollectionItem {
  /**
   * Default data structure when creating a new SmartContext.
   * @static
   * @readonly
   */
  static get defaults() {
    return {
      data: {
        key: '',
        items: {},
      },
    };
  }

  /**
   * compile(opts = {})
   * - merges collection-level settings with provided opts
   * - loads item content
   * - follows links if link_depth>0
   * - excludes headings
   * - calls build_context
   * @async
   * @param {Object} opts - Additional options that override the collection settings.
   * @returns {Promise<Object>} The result from build_context (e.g. { context, stats }).
   */
  async compile(opts = {}) {
    const merged = {
      items: {},
      links: {},
      ...this.collection.settings,
      ...opts,
    };
    await this.process_items(merged);

    if(merged.link_depth > 0) await this.process_links(merged);

    // 4) Exclusions or parse blocks if desired
    await respect_exclusions(merged);

    // 5) Finally, call build_context
    const result = await build_context(merged);
    return result;
  }

  async get_ref(key){
    if(key.endsWith('.md')) return this.env.smart_sources.get(key)
    else if(key.includes('#')) return this.env.smart_blocks.get(key)
    return null;
  }
  async process_items(merged){
    // 2) Add this.data.items{} into merged.items as item_refs
    for (const [key_or_path, flag] of Object.entries(this.data.items || {})) {
      let ref = await this.get_ref(key_or_path);
      let content = null;
      if(ref) {
        content = await ref?.read();
      }else{
        // try to get content from direct read
        content = await this.env.fs.read(key_or_path);
      }
      if(!content) {
        console.warn(`Smart Context: No content found for ${key_or_path}`);
        continue;
      }
      merged.items[key_or_path] = content;
    }
  }
  async process_links(merged){
    let links = merged.links || {};
    const max_depth = merged.link_depth;
    for(const item_key of Object.keys(merged.items)){
      const item_ref = await this.get_ref(item_key);
      if(!item_ref) continue;
      if(item_ref.outdated){
        await item_ref.import(); // updates outlinks property
      }
      const outlinks = await this.build_links_object_from_keys(item_ref.outlinks, 'OUTLINK', 1);
      this.merge_links_object(links, item_key, outlinks);
      if(merged.inlinks){
        const inlinks = await this.build_links_object_from_keys(item_ref.inlinks, 'INLINK', 1);
        this.merge_links_object(links, item_key, inlinks);
      }

      for(let curr_depth = 1; curr_depth <= max_depth; curr_depth++){
        const link_keys = Object.keys(links).filter(link_key => links[link_key].depth.includes(curr_depth));
        for(const link_key of link_keys){
          const link_ref = await this.get_ref(link_key);
          if(!link_ref) continue;
          const link_outlinks = await this.build_links_object_from_keys(
            link_ref.outlinks.filter(l => l !== item_key),
            'OUTLINK',
            curr_depth + 1
          );
          this.merge_links_object(links, item_key, link_outlinks);
          if(merged.inlinks){
            const link_inlinks = await this.build_links_object_from_keys(
              link_ref.inlinks.filter(l => l !== item_key),
              'INLINK',
              curr_depth + 1
            );
            this.merge_links_object(links, item_key, link_inlinks);
          }
        }
      }
    }
    merged.links = links;
  }
  merge_links_object(links_obj, item_key, links_array){
    links_array.forEach(link => {
      let direction = 'to';
      if(link.type === 'INLINK') direction = 'from';
      if(!links_obj[link.link_key]){
        links_obj[link.link_key] = {
          content: link.content,
          type: [link.type],
          depth: [link.depth],
        }
        links_obj[link.link_key][direction] = [item_key];
      }else{
        links_obj[link.link_key][direction].push(item_key);
        links_obj[link.link_key].type.push(link.type);
        links_obj[link.link_key].depth.push(link.depth);
      }
    });
  }

  async build_links_object_from_keys(keys, link_type = 'OUTLINK', depth = 1){
    const links = [];
    for(const link_key of keys){
      const link_ref = await this.get_ref(link_key);
      if(link_ref) {
        const content = await link_ref.read();
        links.push({link_key, content, type: link_type, depth});
      }else{
        // links.push({link_key, content: '', type: 'MISSING', depth});
      }
    }
    return links;
  }

  /**
   * A key for the context, typically user-defined or auto from items. 
   * Falls back to murmur hash if none set.
   * @readonly
   */
  get key() {
    if (this.data.key) return this.data.key;
    const str = JSON.stringify(this.data.items || {});
    return murmur_hash_32_alphanumeric(str);
  }
}
