/**
 * SmartMarkdown is a class designed to parse and manipulate markdown content
 * based on specified configurations. It provides functionalities to extract
 * specific blocks of text based on heading paths, handle exclusions of certain
 * headings, and manage the size of text blocks according to maximum and minimum
 * character limits.
 */
class SmartMarkdown {
  /**
   * Returns the default configuration for the SmartMarkdown parser.
   * @returns {Object} Default configuration settings.
   */
  static get defaults() {
    return {
      excluded_headings: null, // comma separated list of headings to exclude
      embed_input_max_chars: 1000, // max length of block
      embed_input_min_chars: 10, // min length of block
      skip_blocks_with_headings_only: false, // skip blocks that only contain headings
    };
  }
  /**
   * Creates an instance of SmartMarkdown with the given configuration.
   * @param {Object} config - User-defined configuration settings.
   */
  constructor(config) {
    this.config = {...SmartMarkdown.defaults, ...config};
  }
  /**
   * Retrieves the list of headings to be excluded from parsing, if any.
   * @returns {Array|null} An array of headings to exclude, or null if none.
   */
  get excluded_headings() { (this.config.excluded_headings?.length) ? this.config.excluded_headings.split(",").map((header) => header.trim()) : null; }
  /**
   * Analyzes the markdown content to extract metadata about each heading.
   * @param {string} content - The markdown content to analyze.
   * @returns {Array} An array of objects containing metadata about each heading.
   */  
  // WIP
  get_headings_meta(content) {
    return content.split('\n').reduce((acc, line, line_i, lines) => {
      if (!this.is_heading(line)) return acc;
      const chars_until_next_heading = lines.slice(line_i + 1).findIndex(line => this.is_heading(line));
      const heading_level = line.split('#').length - 1;
      const heading_text = line.replace(/#/g, '').trim();
      acc.push = { line_i, heading_level, heading_text, chars_until_next_heading };
      return acc;
    }, []);
  }

  // v1
  // get block from path
  /**
   * Extracts a specific block of markdown based on a heading path.
   * @param {string} block_path - The path to the block, specified as a series of headings.
   * @param {string} markdown - The markdown content to parse.
   * @param {Object} opts - Options for block extraction, such as character limits per line.
   * @returns {string} The extracted block of markdown text.
   */
  get_block_from_path(block_path, markdown, opts={}){
    // if block_path ends with # and only one # then returns content prior to first heading
    if(block_path.endsWith('#') && block_path.split('#').length === 2) return markdown.split('#')[0];
    if(!this.validate_block_path(block_path)) return markdown;
    const {
      chars_per_line = null,
      max_chars = this.config.embed_input_max_chars,
      min_chars = this.config.embed_input_min_chars,
    } = opts;
    const block = [];
    const block_headings = block_path.split("#").slice(1);
    let currentHeaders = [];
    let begin_line = 0;
    let is_code = false;
    let char_count = 0;
    let heading_occurrence = 0;
    let occurrence_count = 0;
    if(block_headings[block_headings.length-1].indexOf('{') > -1) {
      heading_occurrence = parseInt(block_headings[block_headings.length-1].split('{')[1].replace('}', '')); // get the occurrence number
      block_headings[block_headings.length-1] = block_headings[block_headings.length-1].split('{')[0]; // remove the occurrence from the last heading
    }
    const lines = markdown.split('\n');
    let block_heading_level = 0;
    // FIND HEADING
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if(line.indexOf('```') === 0) is_code = !is_code; // if line begins with three backticks then toggle is_code
      if(is_code) continue; // if is_code is true then add line with preceding tab and continue
      if(['- ', '- [ ] '].indexOf(line) > -1) continue; // skip if line is empty bullet or checkbox
      if (!this.is_heading(line)) continue; // skip if line is not a heading
      block_heading_level = this.heading_level(line); // get the heading 'level'
      const heading_text = line.replace(/#/g, '').trim(); // get the heading text
      const heading_index = block_headings.indexOf(heading_text);
      if (heading_index < 0) continue; // continue if heading text is not in block_headings
      if (currentHeaders.length !== heading_index) continue; // if currentHeaders.length !== heading_index then we have a mismatch
      currentHeaders.push(heading_text); // push the heading text to the currentHeaders array
      if (currentHeaders.length === block_headings.length) { // if currentHeaders.length === block_headings.length then we have a match
        if(heading_occurrence === 0){
          begin_line = i + 1;
          break; // break out of loop
        }
        if(occurrence_count === heading_occurrence){
          begin_line = i + 1;
          break; // break out of loop
        }
        occurrence_count++; // increment occurrence_count
        currentHeaders.pop(); // reset currentHeaders
        continue;
      }
    }
    // BUILD BLOCK
    if (begin_line === 0) return ''; // if no begin_line then heading not found
    is_code = false; // iterate through lines starting at begin_line
    for (let i = begin_line; i < lines.length; i++) {
      let line = lines[i];
      // if(line.trim().length === 0) continue; // if line is empty, skip // DO: make this configurable
      if(this.is_heading(line) && (this.heading_level(line) <= block_heading_level)) break; // if line is a heading and heading_level is less than or equal to block_heading_level, break
      // validate/format
      if (chars_per_line && (line.length > chars_per_line)) line = line.slice(0, chars_per_line) + "..."; // limit length of line to N characters
      if (line.startsWith("```")) is_code = !is_code; // if line is a code block, skip
      block.push(line); // add line to block
      char_count += line.length; // increment char_count
      if(max_chars && (char_count > max_chars)){
        const diff = char_count - max_chars;
        block[block.length-1] = block[block.length-1].slice(0, block[block.length-1].length - diff) + "...";
        break; // break if char_count is greater than max_chars
      }
      if(max_chars && (max_chars - char_count < 10)) break; // break if max_chars - char_count is less than threshold
    }
    if (is_code) block.push("```"); // close code block if open
    return block.join("\n").trim();
  }
  /**
   * Parses the markdown content and organizes it into structured blocks based on headings.
   * @param {Object} params - Parameters containing content and optional file path.
   * @returns {Object} An object containing parsed blocks and other metadata.
   */
  parse({ content, file_path='' }) {
    // const file_breadcrumbs = this.file_path_to_breadcrumbs(file_path) + ": "; // add ":" to indicate beginning of heading breadcrumbs
    const file_breadcrumbs = this.file_path_to_breadcrumbs(file_path); // add ":" to indicate beginning of heading breadcrumbs
    // if is excalidraw file, block for 'Text Elements' heading only
    if(file_path.endsWith('.excalidraw.md')) {
      const excalidraw_block = this.get_block_from_path(file_path + "#Text Elements", content).replace('\n%%', '');
      return {
        blocks: [
          {
            text: excalidraw_block,
            path: file_path + "#Text Elements",
            length: excalidraw_block.length,
            heading: "Text Elements",
          }
        ],
        log: [],
      };
    }

    const output = content.split('\n') // split the markdown into lines
      .reduce((acc, line, i, arr) => {
        // if line is a heading or last line
        if(this.is_heading(line) && (!acc.curr_level || !this.config.multi_heading_blocks || (this.heading_level(line) <= acc.curr_level) || (acc.curr.length > this.config.embed_input_max_chars))){
          this.output_block(acc);
          acc.curr_level = this.heading_level(line); // get the heading 'level'
          acc.current_headers = acc.current_headers.filter(header => header.level < acc.curr_level); // remove any headers from the current headers array that are higher than the current header level
          acc.current_headers.push({ header: line.replace(/#/g, '').trim(), level: acc.curr_level }); // add header and level to current headers array, trim the header to remove "#" and any trailing spaces
          acc.start_line = i; // set the start line
          acc.curr = file_breadcrumbs; // initialize the block breadcrumbs with file.path the current headers
          if(acc.current_headers.length > 0) acc.curr += ": " + acc.current_headers.map(header => header.header).join(' > ');
          acc.block_headings = "#" + acc.current_headers.map(header => header.header).join('#');
          this.handle_duplicate_headings(acc);
          acc.block_headings_list.push(acc.block_headings);
          acc.block_path = file_path + acc.block_headings;
          acc.curr_heading = line.replace(/#/g, '').trim();
          return acc;
        }
        // if line is not a heading, add line to current block
        if(this.is_content_line(line)){
          if(acc.curr.indexOf("\n") === -1) acc.curr += ":"; // add ":" to indicate end of heading breadcrumbs
          acc.curr += "\n" + line; // filter out empty lines and bullets
          acc.curr_line = i; // set the current line
        }
        if (i === arr.length - 1) this.output_block(acc); // if last line, output the block
        return acc;
      }, { block_headings: '', block_headings_list: [], block_path: file_path + "#", curr: file_breadcrumbs, current_headers: [], blocks: [], log: [], start_line: 0, curr_line: 0, curr_heading: null })
    ;
    return {
      ...output,
      file_path,
      // remove properties that are exclusive to the reduce function
      block_headings: undefined,
      block_headings_list: undefined,
      block_path: undefined,
      curr: undefined,
      current_headers: undefined,
    };
  }
  /**
   * Handles duplicate headings by appending a unique identifier to the heading path.
   * @param {Object} acc - The accumulator object used in reduce function.
   */
  // if block_headings is already in block_headings_list then add a number to the end
  handle_duplicate_headings(acc) {
    if (!acc.block_headings_list.includes(acc.block_headings)) return; // if block_headings is not in block_headings_list then return
    let count = 1;
    const uniqueHeadings = new Set(acc.block_headings_list);
    while (uniqueHeadings.has(`${acc.block_headings}{${count}}`)) { count++; }
    acc.block_headings = `${acc.block_headings}{${count}}`;
  }
  /**
   * Outputs the current block into the structured blocks array after validation.
   * @param {Object} acc - The accumulator object used in reduce function.
   */
  // push the current block to the blocks array
  output_block(acc) {
    const { embed_input_max_chars, embed_input_min_chars } = this.config;
    if(acc.curr.indexOf("\n") === -1) return acc.log.push(`Skipping empty block: ${acc.curr}`); // indicated by no newlines in block
    if(!this.validate_heading(acc.block_headings)) return acc.log.push(`Skipping excluded heading: ${acc.block_headings}`);
    if(acc.curr.length > embed_input_max_chars) acc.curr = acc.curr.substring(0, embed_input_max_chars); // trim block to max length
    const text = acc.curr.replace(/\r\n/g, '\n').trim();
    const pcs = text.split('\n');
    const block_length = pcs.slice(1).join('\n').trim().length;
    const breadcrumbs_length = acc.curr.indexOf("\n") + 1; // breadcrumbs length (first line of block)
    // const block_length = acc.curr.length - breadcrumbs_length;
    if(block_length < embed_input_min_chars) return acc.log.push(`Skipping block shorter than min length: ${acc.curr}`); // skip if block is shorter than min length
    if(this.config.skip_blocks_with_headings_only){ // skip if all lines are headings (except first line which is breadcrumbs)
      const block_lines = text.split('\n');
      const block_headings = block_lines.slice(1).filter(line => this.is_heading(line));
      if(block_headings.length === block_lines.length - 1) return acc.log.push(`Skipping block with only headings: ${acc.curr}`);
    }
    acc.blocks.push({
      text,
      path: acc.block_path,
      length: block_length,
      heading: acc.curr_heading,
      lines: [acc.start_line, acc.curr_line],
    }); // add block to blocks array
  }
  /**
   * Determines if a line of text should be considered as content.
   * @param {string} line - The line of text to evaluate.
   * @returns {boolean} True if the line is content, false otherwise.
   */
  is_content_line(line) {
    // if (line === '') return false; // skip if line is empty // DO: make this configurable
    if (['- ', '- [ ] '].indexOf(line) > -1) return false; // skip if line is empty bullet or checkbox
    return true;
  }
  /**
   * Converts a file path to a breadcrumb string format.
   * @param {string} file_path - The file path to convert.
   * @returns {string} The breadcrumb string.
   */
  file_path_to_breadcrumbs(file_path) { return file_path.replace('.md', '').split('/').map(crumb => crumb.trim()).filter(crumb => crumb !== '').join(' > '); } // remove .md file extension and convert file_path to breadcrumb formatting
  /**
   * Determines the level of a heading based on the number of '#' characters.
   * @param {string} line - The heading line to evaluate.
   * @returns {number} The level of the heading.
   */  
  heading_level(line) { return line.split('#').length - 1; }
  /**
   * Checks if a line is a heading.
   * @param {string} line - The line to check.
   * @returns {boolean} True if the line is a heading, false otherwise.
   * @param {string} line - The line to check.
   * @returns {boolean} True if the line is a heading, false otherwise.
  */
  is_heading(line) { return line.startsWith('#') && (['#', ' '].indexOf(line[1]) > -1); } // check if line is a heading (starts with # and second character is space or # indicating not a tag)
  /**
   * Validates if the block path is correctly formatted to include at least one heading.
   * @param {string} block_path - The block path to validate.
   * @returns {boolean} True if the block path is valid, false otherwise.
   */
  validate_block_path(block_path) { return block_path.indexOf("#") > -1; } // validate block_path contains at least one "#"
  /**
   * Validates a heading against the list of excluded headings.
   * @param {string} headings - The heading to validate.
   * @returns {boolean} True if the heading is not excluded, false if it is.
   */  
  validate_heading(headings) { return !!!this.excluded_headings?.some(exclusion => headings.indexOf(exclusion) > -1); } // validate heading against excluded headings

}
exports.SmartMarkdown = SmartMarkdown;