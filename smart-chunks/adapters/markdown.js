class MarkdownAdapter {
  static get defaults() {
    return {
      excluded_headings: null,
      embed_input_max_chars: 1000,
      embed_input_min_chars: 10,
      skip_blocks_with_headings_only: false,
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
    const file_breadcrumbs = convert_file_path_to_breadcrumbs(file_path) + ": ";
    const accumulator = initialize_accumulator(file_path, file_breadcrumbs);

    content.split('\n').reduce((accumulator, line, index, array) => {
      if (is_heading(line) && this.should_process_block(accumulator, line)) {
        this.process_and_store_block(accumulator);
        this.update_accumulator_for_heading(accumulator, line, file_breadcrumbs, file_path, index);
        this.handle_duplicate_headings(accumulator);
      } else if (is_content_line(line)) {
        this.update_accumulator_for_content_line(accumulator, line, index);
      }

      if (index === array.length - 1) {
        this.process_and_store_block(accumulator);
      }
      
      return accumulator;
    }, accumulator);

    return finalize_output(accumulator, file_path);
  }

  should_process_block(accumulator, line) {
    return !accumulator.curr_level || !this.opts.multi_heading_blocks || (get_heading_level(line) <= accumulator.curr_level) || (accumulator.curr.length > this.opts.embed_input_max_chars);
  }

  process_and_store_block(accumulator) {
    const { embed_input_max_chars, embed_input_min_chars } = this.opts;
    if (accumulator.curr.indexOf("\n") === -1) {
      accumulator.log.push(`Skipping empty block: ${accumulator.curr}`);
      return;
    }
    if (!validate_heading(accumulator.block_headings, this.opts.excluded_headings)) {
      accumulator.log.push(`Skipping excluded heading: ${accumulator.block_headings}`);
      return;
    }
    if (accumulator.curr.length > embed_input_max_chars) {
      accumulator.curr = accumulator.curr.substring(0, embed_input_max_chars);
    }

    const breadcrumbs_length = accumulator.curr.indexOf("\n") + 1;
    const block_length = accumulator.curr.length - breadcrumbs_length;

    if (block_length < embed_input_min_chars) {
      accumulator.log.push(`Skipping block shorter than min length: ${accumulator.curr}`);
      return;
    }
    if (this.opts.skip_blocks_with_headings_only) {
      const block_lines = accumulator.curr.split('\n');
      const block_headings = block_lines.slice(1).filter(line => is_heading(line));
      if (block_headings.length === block_lines.length - 1) {
        accumulator.log.push(`Skipping block with only headings: ${accumulator.curr}`);
        return;
      }
    }

    accumulator.blocks.push({
      text: accumulator.curr.trim(),
      path: accumulator.block_path,
      length: block_length,
      heading: accumulator.curr_heading,
      lines: [accumulator.start_line, accumulator.curr_line],
    });
  }

  update_accumulator_for_heading(accumulator, line, file_breadcrumbs, file_path, index) {
    accumulator.curr_level = get_heading_level(line);
    accumulator.current_headers = accumulator.current_headers.filter(header => header.level < accumulator.curr_level);
    accumulator.current_headers.push({ header: line.replace(/#/g, '').trim(), level: accumulator.curr_level });
    accumulator.start_line = index;
    accumulator.curr = file_breadcrumbs + accumulator.current_headers.map(header => header.header).join(' > ');
    accumulator.block_headings = "#" + accumulator.current_headers.map(header => header.header).join('#');
    accumulator.block_path = file_path + accumulator.block_headings;
    accumulator.curr_heading = line.replace(/#/g, '').trim();
  }

  update_accumulator_for_content_line(accumulator, line, index) {
    if (accumulator.curr.indexOf("\n") === -1) {
      accumulator.curr += ":";
    }
    accumulator.curr += "\n" + line;
    accumulator.curr_line = index;
  }

  handle_duplicate_headings(accumulator) {
    let heading_key = `${accumulator.block_headings}`;
    let count = 1;

    while (accumulator.block_headings_list.includes(heading_key)) {
      heading_key = `${accumulator.block_headings.replace(/{\d+}$/, '')}{${count}}`;
      count++;
    }

    accumulator.block_headings_list.push(heading_key);
    accumulator.block_headings = heading_key;
    accumulator.block_path = accumulator.block_path.replace(/#.*/, '') + heading_key;
  }
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
  return !['- ', '- [ ] '].includes(line);
}

function validate_heading(headings, excluded_headings) {
  return !excluded_headings?.some(exclusion => headings.includes(exclusion));
}

function initialize_accumulator(file_path, file_breadcrumbs) {
  return {
    block_headings: '',
    block_headings_list: [],
    block_path: file_path + "#",
    curr: file_breadcrumbs,
    current_headers: [],
    blocks: [],
    log: [],
    start_line: 0,
    curr_line: 0,
    curr_heading: null
  };
}

function finalize_output(output, file_path) {
  const { block_headings, block_headings_list, block_path, curr, current_headers, ...final_output } = output;
  return { ...final_output, file_path: file_path };
}

exports.MarkdownAdapter = MarkdownAdapter;
