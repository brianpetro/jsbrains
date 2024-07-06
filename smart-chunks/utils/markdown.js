const { is_list_item } = require("./is_list_item");
const { is_heading } = require("./is_heading");

function update_acc(acc, line, file_breadcrumbs, file_path, index) {
  if (is_heading(line)) {
    update_acc_for_heading(acc, line, file_breadcrumbs, file_path, index);
  } else if (is_list_item(line)) {
    update_acc_for_list_item(acc, line, file_breadcrumbs);
  } else if (is_content_line(line)) {
    update_acc_for_content_line(acc, line, file_breadcrumbs);
  }
}
function update_acc_for_heading(acc, line, file_breadcrumbs, file_path, index) {
  acc.curr_level = get_heading_level(line);
  acc.current_headers = acc.current_headers.filter(header => header.level < acc.curr_level);
  acc.current_headers.push({ header: line.replace(/#/g, '').trim(), level: acc.curr_level });
  acc.start_line = index;
  init_curr(acc, file_breadcrumbs);
  acc.block_headings = "#" + acc.current_headers.map(header => header.header).join('#');
  acc.block_path = file_path + acc.block_headings;
  acc.curr_heading = line.replace(/#/g, '').trim();
  acc.curr_line = index;
}
function update_acc_for_content_line(acc, line, file_breadcrumbs) {
  if (!acc.curr.includes("\n")) {
    init_curr(acc, file_breadcrumbs);
  }
  if (line.trim().length === 0) return;
  acc.curr += "\n" + line;
}
function update_acc_for_list_item(acc, line, file_breadcrumbs) {
  if (!acc.curr.includes("\n")) {
    init_curr(acc, file_breadcrumbs);
  }
  acc.curr += "\n" + line;
}
function handle_duplicate_headings(acc) {
  let heading_key = `${acc.block_headings}`;
  let count = 1;

  while (acc.block_headings_list.includes(heading_key)) {
    heading_key = `${acc.block_headings}{${count}}`;
    count++;
  }

  acc.block_headings_list.push(heading_key);
  acc.block_path = acc.file_path + heading_key;
}
function init_curr(acc, file_breadcrumbs) {
  const bc = [file_breadcrumbs];
  if (acc.current_headers.length > 0) {
    bc.push(acc.current_headers.map(header => header.header).join(' > '));
  }
  acc.curr = bc.join(': ') + ":";
}

function is_content_line(line) {
  return !is_list_item(line) && !is_heading(line) && line.trim().length > 0 && line.trim() !== '---';
}

function convert_file_path_to_breadcrumbs(file_path) {
  return file_path.replace('.md', '').split('/').map(crumb => crumb.trim()).filter(crumb => crumb !== '').join(' > ');
}

function get_heading_level(line) {
  return line.split('#').length - 1;
}

function initialize_acc(file_path, file_breadcrumbs) {
  return {
    block_headings: '#',
    block_headings_list: [],
    block_path: file_path + "#",
    curr: file_breadcrumbs,
    current_headers: [],
    blocks: [],
    log: [],
    start_line: 0,
    curr_line: 0,
    curr_heading: null,
    file_path: file_path,
  };
}

function finalize_output(output, file_path) {
  const { block_headings, block_headings_list, block_path, curr, current_headers, ...final_output } = output;
  return { ...final_output, file_path: file_path };
}
  
function store_front_matter_block(acc, front_matter, index, opts) {
  const { embed_input_min_chars } = opts;
  const text = (front_matter.includes('\r\n') ? front_matter.replace(/\r\n/g, '\n') : front_matter).trim();
  const embed_input_len = text.split('\n').slice(1).join('\n').trim().length;
  if (embed_input_len < embed_input_min_chars) {
    acc.log.push(`Skipping frontmatter block: ${embed_input_len} characters shorter than min length ${embed_input_min_chars}`);
    return;
  }
  acc.blocks.push({
    text,
    path: acc.block_path,
    length: embed_input_len,
    heading: null,
    lines: [0, index],
  });
}
  
function should_process_block(acc, line, opts) {
  const { embed_input_max_chars, multi_heading_blocks } = opts;
  return !acc.curr_level || !multi_heading_blocks || get_heading_level(line) <= acc.curr_level || acc.curr.length > embed_input_max_chars;
}

function process_and_store_block(acc, opts) {
  const { embed_input_max_chars, embed_input_min_chars } = opts;
  if (!acc.curr.includes("\n")) {
    acc.log.push(`Skipping empty block: ${acc.curr}`);
    return;
  }
  if (acc.curr.length > embed_input_max_chars) {
    acc.curr = acc.curr.substring(0, embed_input_max_chars);
  }
  acc.curr = acc.curr.trim();
  
  const text = (acc.curr.includes('\r\n') ? acc.curr.replace(/\r\n/g, '\n') : acc.curr).trim();
  const block_length = text.split('\n').slice(1).join('\n').trim().length;

  if (block_length < embed_input_min_chars) {
    acc.log.push(`Skipping block shorter than min length: ${acc.curr}`);
    return;
  }
  

  acc.blocks.push({
    path: acc.block_path,
    heading: acc.curr_heading,
    length: block_length,
    lines: [acc.start_line, acc.curr_line],
    text,
  });

  acc.curr = "";
  acc.start_line = acc.curr_line + 1;
}
  
exports.handle_duplicate_headings = handle_duplicate_headings;
exports.update_acc = update_acc;
exports.is_content_line = is_content_line;
exports.convert_file_path_to_breadcrumbs = convert_file_path_to_breadcrumbs;
exports.get_heading_level = get_heading_level;
exports.initialize_acc = initialize_acc;
exports.finalize_output = finalize_output;
exports.store_front_matter_block = store_front_matter_block;
exports.should_process_block = should_process_block;
exports.process_and_store_block = process_and_store_block;