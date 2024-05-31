class MarkdownAdapter {
  static get defaults() {
    return {
      excluded_headings: null,
      embed_input_max_chars: 1000,
      embed_input_min_chars: 50,
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
    const file_breadcrumbs = this.file_path_to_breadcrumbs(file_path) + ": ";
    const output = content.split('\n').reduce((acc, line, i, arr) => {
      if(this.is_heading(line) && (!acc.curr_level || !this.opts.multi_heading_blocks || (this.heading_level(line) <= acc.curr_level) || (acc.curr.length > this.opts.embed_input_max_chars))){
        this.output_block(acc);
        acc.curr_level = this.heading_level(line);
        acc.current_headers = acc.current_headers.filter(header => header.level < acc.curr_level);
        acc.current_headers.push({ header: line.replace(/#/g, '').trim(), level: acc.curr_level });
        acc.start_line = i;
        acc.curr = file_breadcrumbs;
        acc.curr += acc.current_headers.map(header => header.header).join(' > ');
        acc.block_headings = "#" + acc.current_headers.map(header => header.header).join('#');
        this.handle_duplicate_headings(acc);
        acc.block_headings_list.push(acc.block_headings);
        acc.block_path = file_path + acc.block_headings;
        acc.curr_heading = line.replace(/#/g, '').trim();
        return acc;
      }
      if(this.is_content_line(line)){
        if(acc.curr.indexOf("\n") === -1) acc.curr += ":";
        acc.curr += "\n" + line;
        acc.curr_line = i;
      }
      if (i === arr.length - 1) this.output_block(acc);
      return acc;
    }, { block_headings: '', block_headings_list: [], block_path: file_path + "#", curr: file_breadcrumbs, current_headers: [], blocks: [], log: [], start_line: 0, curr_line: 0, curr_heading: null });
    return {
      ...output,
      file_path: file_path,
      block_headings: undefined,
      block_headings_list: undefined,
      block_path: undefined,
      curr: undefined,
      current_headers: undefined,
    };
  }

  file_path_to_breadcrumbs(file_path) {
    return file_path.replace('.md', '').split('/').map(crumb => crumb.trim()).filter(crumb => crumb !== '').join(' > ');
  }

  is_heading(line) {
    return line.startsWith('#') && (['#', ' '].indexOf(line[1]) > -1);
  }

  heading_level(line) {
    return line.split('#').length - 1;
  }

  is_content_line(line) {
    if (['- ', '- [ ] '].indexOf(line) > -1) return false;
    return true;
  }

  handle_duplicate_headings(acc) {
    if (!acc.block_headings_list.includes(acc.block_headings)) return;
    let count = 1;
    const uniqueHeadings = new Set(acc.block_headings_list);
    while (uniqueHeadings.has(`${acc.block_headings}{${count}}`)) { count++; }
    acc.block_headings = `${acc.block_headings}{${count}}`;
  }

  output_block(acc) {
    const { embed_input_max_chars, embed_input_min_chars } = this.opts;
    if(acc.curr.indexOf("\n") === -1) return acc.log.push(`Skipping empty block: ${acc.curr}`);
    if(!this.validate_heading(acc.block_headings)) return acc.log.push(`Skipping excluded heading: ${acc.block_headings}`);
    if(acc.curr.length > embed_input_max_chars) acc.curr = acc.curr.substring(0, embed_input_max_chars);
    const breadcrumbs_length = acc.curr.indexOf("\n") + 1;
    const block_length = acc.curr.length - breadcrumbs_length;
    if(block_length < embed_input_min_chars) return acc.log.push(`Skipping block shorter than min length: ${acc.curr}`);
    if(this.opts.skip_blocks_with_headings_only){
      const block_lines = acc.curr.split('\n');
      const block_headings = block_lines.slice(1).filter(line => this.is_heading(line));
      if(block_headings.length === block_lines.length - 1) return acc.log.push(`Skipping block with only headings: ${acc.curr}`);
    }
    acc.blocks.push({
      text: acc.curr.trim(),
      path: acc.block_path,
      length: block_length,
      heading: acc.curr_heading,
      lines: [acc.start_line, acc.curr_line],
    });
  }

  validate_heading(headings) {
    return !!!this.opts.excluded_headings?.some(exclusion => headings.indexOf(exclusion) > -1);
  }
}

exports.MarkdownAdapter = MarkdownAdapter;

