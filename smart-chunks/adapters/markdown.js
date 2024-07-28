const { is_end_of_block } = require("../utils/is_end_of_block");
const {
  handle_duplicate_headings,
  update_acc,
  is_content_line,
  convert_file_path_to_breadcrumbs,
  get_heading_level,
  initialize_acc,
  finalize_output,
  store_front_matter_block,
  should_process_block,
  process_and_store_block
} = require("../utils/markdown");
const { extract_links } = require("../utils/extract_links");

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
      const content = (typeof entity.content === 'string' ? entity.content : await entity.get_content()).replace(/\r\n/g, '\n'); // replace windows line breaks with unix
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
            handle_duplicate_headings(acc);
            store_front_matter_block(acc, front_matter, index, this.opts);
            acc.start_line = index + 1;
          }
        } else if (in_front_matter) {
          front_matter += line + '\n';
        } else {
          update_acc(acc, line, file_breadcrumbs, file_path, index);
          if (is_end_of_block(lines, index, this.opts) && should_process_block(acc, line, this.opts)) {
            handle_duplicate_headings(acc);
            process_and_store_block(acc, this.opts);
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

      acc.outlinks = extract_links(content);
      return finalize_output(acc, file_path);
    } catch (error) {
      console.error("Error parsing markdown content:", entity.file_path, error);
      throw error;
    }
  }
}

exports.MarkdownAdapter = MarkdownAdapter;