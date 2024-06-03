const { is_list_item, is_nested_list_item, is_top_level_list_item } = require("./is_list_item");
const { is_heading } = require("./is_heading");

function is_end_of_block(lines, index, opts) {
  const line = lines[index];
  if (line.length > opts.min_length_for_single_line_blocks) return true;
  const next_line = lines[index + 1];
  if (typeof next_line === 'undefined') return true;
  if (is_heading(next_line)) return true;
  if (is_nested_list_item(line) && is_top_level_list_item(next_line)) return true;
  if (next_line.length > opts.min_length_for_single_line_blocks) return true;
  if (next_line.trim() === '---') return true;
  const next_next_line = lines[index + 2];
  if (!next_next_line) return false;
  if (is_list_item(line) && is_top_level_list_item(next_line) && is_nested_list_item(next_next_line)) return true;
  return false;
}
exports.is_end_of_block = is_end_of_block;

