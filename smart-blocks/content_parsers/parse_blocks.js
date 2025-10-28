import { get_markdown_links } from "smart-sources/utils/get_markdown_links.js";
import { get_line_range } from "smart-sources/utils/get_line_range.js";
import { parse_markdown_blocks } from "../parsers/markdown.js";
import { murmur_hash_32_alphanumeric } from "smart-utils/create_hash.js";
/**
 * @method parse_blocks
 * @description Imports blocks for a given source by parsing the content. Delegates parsing to a parser
 * depending on the source.file_type (e.g., parse_blocks for .md).
 * @param {SmartSource} source The source whose blocks are to be imported.
 * @param {string} content The raw content of the source file.
 * @returns {Promise<void>}
 */
export function parse_blocks(source, content) {
  let {blocks: blocks_obj, task_lines, tasks, codeblock_ranges} = parse_markdown_blocks(content);
  const last_read_at =  source.data.last_read?.at || Date.now();
  for (const [sub_key, line_range] of Object.entries(blocks_obj)) {
    // if (sub_key === '#' || sub_key.startsWith('#---frontmatter')) continue;
    const block_key = source.key + sub_key;
    const existing_block = source.block_collection.get(block_key);
    const block_content = get_line_range(content, line_range[0], line_range[1]);
    if(
      existing_block
      && existing_block.lines[0] === line_range[0]
      && existing_block.lines[1] === line_range[1]
      && existing_block.size === block_content.length
      && existing_block.vec
    ){
      continue;
    }
    const block_outlinks = get_markdown_links(block_content);
    const block_data = {
      key: block_key,
      lines: line_range,
      size: block_content.length,
      outlinks: block_outlinks,
      last_read: {
        at: last_read_at,
        hash: murmur_hash_32_alphanumeric(block_content),
      },
    };
    // Check hash AFTER building new data since lines updated
    // if no lines change than continues above
    if(!existing_block || (existing_block?.data.last_read?.hash !== block_data.last_read.hash)) {
      // prevent premature save by not using create_or_update
      const new_item = new source.block_collection.item_type(source.env, block_data);
      source.block_collection.set(new_item);
    }else{
      existing_block.data = {
        ...existing_block.data,
        ...block_data, // overwrites lines, last_read
      }
    }
  }
  
  clean_and_update_source_blocks(source, blocks_obj, task_lines, tasks, codeblock_ranges);
  
  // Queue embedding for blocks that should be embedded but are not yet embedded
  // MUST LOOP AFTER creating all blocks because should_embed logic checks adjecent blocks
  for (const block of source.blocks) {
    if(!block.vec) {
      block.queue_embed(); // only queues if should_embed
    }
  }
}

/**
 * Remove blocks that are no longer present in the parsed block data.
 * This ensures that after re-importing a source, stale blocks are cleaned up.
 * 
 * @param {SmartSource} source - The source that was re-imported.
 * @param {Object} blocks_obj - The newly parsed blocks object.
 * @param {Array} task_lines - The newly parsed task lines.
 * @param {Object} tasks - The newly parsed tasks object.
 */
function clean_and_update_source_blocks(source, blocks_obj, task_lines=[], tasks={}, codeblock_ranges={}) {
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
  source.data.task_lines = task_lines;
  source.data.tasks = tasks;
  source.data.codeblock_ranges = codeblock_ranges;
  source.queue_save();
}