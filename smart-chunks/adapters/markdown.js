class MarkdownAdapter {
  static get defaults() {
    return {
      excluded_headings: null,
      embed_input_max_chars: 1000,
      embed_input_min_chars: 10,
      skip_blocks_with_headings_only: false,
      multi_heading_blocks: false,
    };
  }

  constructor(main) {
    this.main = main;
    this.env = main.env;
    this.opts = { ...MarkdownAdapter.defaults, ...main.opts };
  }

  async parse(entity) {
    const content = await entity.get_content();
    const file_path = entity.file_path;
    const file_breadcrumbs = convert_file_path_to_breadcrumbs(file_path);
    const acc = initialize_acc(file_path, file_breadcrumbs);

    const lines = content.split('\n');
    let in_front_matter = false;
    let front_matter = '';

    lines.reduce((acc, line, index, array) => {
      acc.curr_line = index;
      if ((in_front_matter || index === 0) && (line.trim() === '---')) {
        if (!in_front_matter) {
          in_front_matter = true;
          front_matter = file_breadcrumbs + ":\n";
        } else {
          in_front_matter = false;
          this.store_front_matter_block(acc, front_matter, index);
          acc.start_line = index + 1;
        }
      } else if (in_front_matter) {
        front_matter += line + '\n';
      } else if (is_list_item(line)) {
        this.update_acc_for_list_item(acc, line, file_breadcrumbs);
      } else if (is_content_line(line)) {
        this.update_acc_for_content_line(acc, line, file_breadcrumbs);
      }else if(is_heading(line)) {
        this.update_acc_for_heading(acc, line, file_breadcrumbs, file_path, index);
      }
      if (is_end_of_block(lines, index) && this.should_process_block(acc, line)) {
        this.handle_duplicate_headings(acc);
        this.process_and_store_block(acc);
      }
      return acc;
    }, acc);

    return finalize_output(acc, file_path);
  }


  store_front_matter_block(acc, front_matter, index) {
    acc.blocks.push({
      text: front_matter.trim(),
      path: acc.block_path,
      length: front_matter.length,
      heading: null,
      lines: [0, index],
    });
  }

  should_process_block(acc, line) {
    return !acc.curr_level || !this.opts.multi_heading_blocks || (get_heading_level(line) <= acc.curr_level) || (acc.curr.length > this.opts.embed_input_max_chars);
  }

  process_and_store_block(acc) {
    const { embed_input_max_chars, embed_input_min_chars } = this.opts;
    if (acc.curr.indexOf("\n") === -1) {
      acc.log.push(`Skipping empty block: ${acc.curr}`);
      return;
    }
    if (acc.curr.length > embed_input_max_chars) {
      acc.curr = acc.curr.substring(0, embed_input_max_chars);
    }
    acc.curr = acc.curr.trim();

    const pcs = acc.curr.split('\n');
    const block_length = pcs.slice(1).join('\n').trim().length;

    if (block_length < embed_input_min_chars) {
      acc.log.push(`Skipping block shorter than min length: ${acc.curr}`);
      return;
    }

    acc.blocks.push({
      text: acc.curr.trim(),
      path: acc.block_path,
      length: block_length,
      heading: acc.curr_heading,
      lines: [acc.start_line, acc.curr_line],
    });

    acc.curr = "";
    acc.start_line = acc.curr_line + 1;
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
    if (acc.curr.indexOf("\n") === -1) {
      init_curr(acc, file_breadcrumbs);
    }
    if(line.trim().length === 0) return;
    acc.curr += "\n" + line;
  }
  update_acc_for_list_item(acc, line, file_breadcrumbs) {
    if (acc.curr.indexOf("\n") === -1) {
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
    // acc.block_headings = heading_key;
    acc.block_path = acc.file_path + heading_key;
  }
}
function is_end_of_block(lines, index) {
  const line = lines[index];
  const next_line = lines[index + 1];
  if(typeof next_line === 'undefined') return true;
  if(is_heading(next_line)) return true;
  if(is_nested_list_item(line) && is_top_level_list_item(next_line)) return true;
  const next_next_line = lines[index + 2];
  if(!next_next_line) return false;
  if(is_list_item(line) && is_top_level_list_item(next_line) && is_nested_list_item(next_next_line)) return true;
  return false;
}
exports.is_end_of_block = is_end_of_block;

function init_curr(acc, file_breadcrumbs) {
  const bc = [file_breadcrumbs];
  if(acc.current_headers.length > 0) {
    bc.push(acc.current_headers.map(header => header.header).join(' > '));
  }
  acc.curr = bc.join(': ') + ":";
}

// Utility functions

function convert_file_path_to_breadcrumbs(file_path) {
  return file_path.replace('.md', '').split('/').map(crumb => crumb.trim()).filter(crumb => crumb !== '').join(' > ');
}
function is_heading(line) {
  return line.startsWith('#') && (['#', ' '].includes(line[1]));
}
function get_heading_level(line) {
  return line.split('#').length - 1;
}
function is_content_line(line) {
  return !is_list_item(line) && !is_heading(line) && line.trim().length > 0;
}
function is_list_item(line) {
  const check_string = line.trim();
  return check_string.startsWith('- ') || check_string.startsWith('* ') || check_string.startsWith('+ ') || check_string.startsWith('- [ ] ') || check_string.startsWith('- [x] ');
}
function is_nested_list_item(line) {
  return (line.startsWith(' ') || line.startsWith('\t')) && is_list_item(line);
}
function is_top_level_list_item(line) {
  if(is_nested_list_item(line)) return false;
  return is_list_item(line);
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
    file_path: file_path
  };
}

function finalize_output(output, file_path) {
  const { block_headings, block_headings_list, block_path, curr, current_headers, ...final_output } = output;
  return { ...final_output, file_path: file_path };
}

exports.MarkdownAdapter = MarkdownAdapter;
