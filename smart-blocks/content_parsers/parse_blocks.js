import { get_markdown_links } from "smart-sources/utils/get_markdown_links.js";
import { get_line_range } from "smart-sources/utils/get_line_range.js";
import { parse_markdown_blocks } from "../parsers/markdown.js";
/**
 * @method parse_blocks
 * @description Imports blocks for a given source by parsing the content. Delegates parsing to a parser
 * depending on the source.file_type (e.g., parse_blocks for .md).
 * @async
 * @param {SmartSource} source The source whose blocks are to be imported.
 * @param {string} content The raw content of the source file.
 * @returns {Promise<void>}
 */
export async function parse_blocks(source, content) {
  if(source.file_type === 'md') {
    let blocks_obj = parse_markdown_blocks(content);
    for (const [sub_key, line_range] of Object.entries(blocks_obj)) {
      // if (sub_key === '#' || sub_key.startsWith('#---frontmatter')) continue;
      const block_key = source.key + sub_key;
      const block_content = get_line_range(content, line_range[0], line_range[1]);
      const block_outlinks = get_markdown_links(block_content);
      const block_data = {
        key: block_key,
        lines: line_range,
        size: block_content.length,
        outlinks: block_outlinks,
      };
      // prevent premature save by not using create_or_update
      const new_item = new source.block_collection.item_type(source.env, block_data);
      // blocks.push(this.create_or_update(block_data));
      new_item.queue_embed();
      source.block_collection.set(new_item);
    }
    // await Promise.all(blocks);
    clean_and_update_source_blocks(source, blocks_obj);
  }
}

/**
 * Remove blocks that are no longer present in the parsed block data.
 * This ensures that after re-importing a source, stale blocks are cleaned up.
 * 
 * @param {SmartSource} source - The source that was re-imported.
 * @param {Object} blocks_obj - The newly parsed blocks object.
 */
function clean_and_update_source_blocks(source, blocks_obj) {
  const current_block_keys = new Set(Object.keys(blocks_obj).map(sk => source.key + sk));
  const blocks = source.blocks;
  for(let i = 0; i < blocks.length; i++){
    if(!current_block_keys.has(blocks[i].key)){
      blocks[i].deleted = true;
      blocks[i].queue_save(); 
    }
  }
  // Update source data with new blocks
  source.data.blocks = blocks_obj;
  source.queue_save();
}