const { is_list_item, is_nested_list_item, is_top_level_list_item } = require("../utils/is_list_item");
const { is_end_of_block } = require("../utils/is_end_of_block");
const { is_heading } = require("../utils/is_heading");

class MarkdownAdapter {
  static get defaults() {
    return {
      excluded_headings: null,
      embed_input_max_chars: 1000,
      embed_input_min_chars: 10,
      skip_blocks_with_headings_only: false,
      multi_heading_blocks: false,
      min_length_for_single_line_blocks: 300,
    };
  }

  constructor(main) {
    this.main = main;
    this.env = main.env;
    this.opts = { ...MarkdownAdapter.defaults, ...main.opts };
  }

  async parse(entity) {
    try {
      const content = typeof entity.content === 'string' ? entity.content : await entity.get_content();
      const file_path = entity.file_path;
      const file_breadcrumbs = convert_file_path_to_breadcrumbs(file_path);
      const acc = initialize_acc(file_path, file_breadcrumbs);

      const lines = content.split('\n');
      let in_front_matter = false;
      let front_matter = file_breadcrumbs + ":\n";

      lines.reduce((acc, line, index) => {
        acc.curr_line = index;
        if ((in_front_matter || index === 0) && line.trim() === '---') {
          in_front_matter = !in_front_matter;
          if (!in_front_matter) {
            this.handle_duplicate_headings(acc);
            this.store_front_matter_block(acc, front_matter, index);
            acc.start_line = index + 1;
          }
        } else if (in_front_matter) {
          front_matter += line + '\n';
        } else {
          this.update_acc(acc, line, file_breadcrumbs, file_path, index);
          if (is_end_of_block(lines, index, this.opts) && this.should_process_block(acc, line)) {
            this.handle_duplicate_headings(acc);
            this.process_and_store_block(acc);
          }
        }
        if (line.trim() === '---') {
          acc.start_line = index + 1;
          acc.curr_heading = null;
          acc.block_headings = "#";
          acc.block_path = file_path + "#";
          acc.current_headers = [];
        }
        return acc;
      }, acc);

      return finalize_output(acc, file_path);
    } catch (error) {
      console.error("Error parsing markdown content:", error);
      throw error;
    }
  }

  store_front_matter_block(acc, front_matter, index) {
    const text = (front_matter.includes('\r\n') ? front_matter.replace(/\r\n/g, '\n') : front_matter).trim();
    const embed_input_len = text.split('\n').slice(1).join('\n').trim().length;
    if (embed_input_len < this.opts.embed_input_min_chars) {
      acc.log.push(`Skipping frontmatter block: ${embed_input_len} characters shorter than min length ${this.opts.embed_input_min_chars}`);
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

  should_process_block(acc, line) {
    const { embed_input_max_chars, multi_heading_blocks } = this.opts;
    return !acc.curr_level || !multi_heading_blocks || get_heading_level(line) <= acc.curr_level || acc.curr.length > embed_input_max_chars;
  }

  process_and_store_block(acc) {
    const { embed_input_max_chars, embed_input_min_chars } = this.opts;
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

  update_acc(acc, line, file_breadcrumbs, file_path, index) {
    if (is_heading(line)) {
      this.update_acc_for_heading(acc, line, file_breadcrumbs, file_path, index);
    } else if (is_list_item(line)) {
      this.update_acc_for_list_item(acc, line, file_breadcrumbs);
    } else if (is_content_line(line)) {
      this.update_acc_for_content_line(acc, line, file_breadcrumbs);
    }
  }

  update_acc_for_heading(acc, line, file_breadcrumbs, file_path, index) {
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

  update_acc_for_content_line(acc, line, file_breadcrumbs) {
    if (!acc.curr.includes("\n")) {
      init_curr(acc, file_breadcrumbs);
    }
    if (line.trim().length === 0) return;
    acc.curr += "\n" + line;
  }

  update_acc_for_list_item(acc, line, file_breadcrumbs) {
    if (!acc.curr.includes("\n")) {
      init_curr(acc, file_breadcrumbs);
    }
    acc.curr += "\n" + line;
  }

  handle_duplicate_headings(acc) {
    let heading_key = `${acc.block_headings}`;
    let count = 1;

    while (acc.block_headings_list.includes(heading_key)) {
      heading_key = `${acc.block_headings}{${count}}`;
      count++;
    }

    acc.block_headings_list.push(heading_key);
    acc.block_path = acc.file_path + heading_key;
  }
}
function init_curr(acc, file_breadcrumbs) {
  const bc = [file_breadcrumbs];
  if (acc.current_headers.length > 0) {
    bc.push(acc.current_headers.map(header => header.header).join(' > '));
  }
  acc.curr = bc.join(': ') + ":";
}

// Utility functions

function convert_file_path_to_breadcrumbs(file_path) {
  return file_path.replace('.md', '').split('/').map(crumb => crumb.trim()).filter(crumb => crumb !== '').join(' > ');
}

function get_heading_level(line) {
  return line.split('#').length - 1;
}

function is_content_line(line) {
  return !is_list_item(line) && !is_heading(line) && line.trim().length > 0 && line.trim() !== '---';
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

exports.MarkdownAdapter = MarkdownAdapter;