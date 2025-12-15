/**
 * Parses a Markdown string and returns a flat mapping of heading-like keys to their start and end line numbers.
 * This includes special handling for:
 * - Multiple occurrences of the same top-level heading (e.g. "# Overview[2]")
 * - Subheadings (nested headings are joined in the key with additional "#" characters)
 * - Frontmatter demarcated by "---" as a special heading: "#---frontmatter---"
 * - Code blocks delimited by triple backticks (```), which ignore headings found within
 * - Top-level list items treated as sub-blocks under their parent heading (customizable with `opts.line_keys`)
 *
 * The returned object keys reflect the path of headings (or list items) in the document, and
 * each value is an array of two numbers: the starting line and the ending line for that key's content.
 *
 * @function parse_markdown_blocks
 * @param {string} markdown - The complete Markdown text to parse.
 * @param {Object} [opts={}] - Parsing options
 * @param {number} [opts.start_index=1] - The line index to treat as line 1
 * @param {boolean} [opts.line_keys=false] - If true, top-level list items get a key based on the line's first 30 characters instead of a sequence number
 * @returns {Object.<string, [number, number]>} A mapping of string keys (representing headings or sub-blocks)
 *   to an array of two numbers indicating the inclusive start and end line indices (1-based) in the Markdown text.
 *   The returned object exposes a non-enumerable `task_lines` array of line numbers containing markdown tasks.
 *
 * @example
 * {
 *   "#Top-Level Heading": [1, 6],
 *   "#Top-Level Heading##Level 3 Heading": [3, 6],
 *   "#Another Top-Level Heading": [7, 18],
 *   // ...
 * }
 */
export function parse_markdown_blocks(markdown, opts={}) {
  const { start_index = 1, line_keys = false } = opts;
  const lines = markdown.split('\n');
  const LIST_KEY_WORD_LEN = opts.list_key_word_len || 10;

  // The final result object mapping block-keys to line ranges: [start_line, end_line].
  const result = {};

  // Stack tracking the open headings (as objects with `level`, `title`, `key`).
  const heading_stack = [];

  // Stores the line range ([start, end]) for each heading or sub-block key.
  const heading_lines = {};

  // For tracking multiple occurrences of top-level headings.
  const heading_counts = {};

  // For tracking the count of sub-blocks under a given heading key (used to append "#{n}" to keys).
  const sub_block_counts = {};

  // For tracking duplicate subheadings under the same parent (appended as "#{x}" at the end).
  const subheading_counts = {};

  // Tracks markdown task line numbers.
  const task_lines = [];

  // Tracks incomplete markdown task line numbers.
  const tasks = {};

  // Tracks the currently open top-level list item block if any.
  let current_list_item = null;

  // Tracks the currently open content block if any (non-list content that follows a heading).
  let current_content_block = null;

  // Whether we are currently in the frontmatter section delimited by "---".
  let in_frontmatter = false;
  let frontmatter_started = false;

  // The root heading key for content that appears before any heading ("#" for top-level).
  const root_heading_key = '#';

  // Whether we are currently in a fenced code block delimited by triple backticks (```).
  let in_code_block = false;
  // track codeblock ranges
  const codeblock_ranges = [];
  let codeblock_start = null;

  // Initialize sub-block counts for the root heading key.
  sub_block_counts[root_heading_key] = 0;

  for (let i = 0; i < lines.length; i++) {
    const line_number = i + start_index;
    const line = lines[i];
    const trimmed_line = line.trim();

    // Handle frontmatter start/end demarcations.
    if (trimmed_line === '---') {
      if (!frontmatter_started && line_number === 1) {
        // Start of frontmatter.
        frontmatter_started = true;
        in_frontmatter = true;
        heading_lines['#---frontmatter---'] = [line_number, null];
        continue;
      } else if (in_frontmatter) {
        // End of frontmatter.
        in_frontmatter = false;
        heading_lines['#---frontmatter---'][1] = line_number;
        continue;
      }
    }

    // If we are within frontmatter lines, skip further processing.
    if (in_frontmatter) {
      continue;
    }

    // all tasks
    if (!in_code_block && /^[-*+]\s+\[(?: |x|X)\]/.test(trimmed_line)) {
      task_lines.push(line_number);
      // incomplete tasks
      if (/^[-*+]\s+\[ \]/.test(trimmed_line)) {
        if(!tasks.incomplete) tasks.incomplete = {all: [], top: []};
        tasks.incomplete.all.push(line_number);
      }
      // top-level incomplete tasks
      if (/^[-*+]\s+\[ \]/.test(line)) {
        tasks.incomplete.top.push(line_number);
      }
    }

    // Check for code block start/end using triple backticks.
    if (trimmed_line.startsWith('```')) {
      in_code_block = !in_code_block;
      // track codeblock ranges
      if(in_code_block && !codeblock_start) codeblock_start = line_number;
      else if(!in_code_block && codeblock_start){
        codeblock_ranges.push([codeblock_start, line_number]);
        codeblock_start = null;
      }

      // Include the code block line as part of the content for whichever block is open.
      if (!current_content_block) {
        // Start a new content block (or sub-block) if not already within one.
        const parent_key = heading_stack.length > 0
          ? heading_stack[heading_stack.length - 1].key
          : root_heading_key;

        if (parent_key === root_heading_key && !heading_lines[root_heading_key]) {
          // If no heading yet, root acts as heading for this code block.
          heading_lines[root_heading_key] = [line_number, null];
        }

        if (parent_key === root_heading_key) {
          // Directly under root heading
          current_content_block = { key: root_heading_key, start_line: line_number };
          // Possibly update the end line for the root heading key.
          if (
            heading_lines[root_heading_key][1] === null ||
            heading_lines[root_heading_key][1] < line_number
          ) {
            heading_lines[root_heading_key][1] = null; // Will set proper end later
          }
        } else {
          if (sub_block_counts[parent_key] === undefined) {
            sub_block_counts[parent_key] = 0;
          }
          sub_block_counts[parent_key] += 1;
          const n = sub_block_counts[parent_key];
          const key = `${parent_key}#{${n}}`;
          heading_lines[key] = [line_number, null];
          current_content_block = { key, start_line: line_number };
        }
      }
      continue;
    }

    // If not in code block, check for headings (lines starting with one or more "#" followed by space).
    const heading_match = trimmed_line.match(/^(#{1,6})\s*(.+)$/);
    if (heading_match && !in_code_block) {
      const level = heading_match[1].length; // Number of "#" is the heading level
      let title = heading_match[2].trim();

      // Pop headings from stack until the last heading has a smaller level than current.
      while (
        heading_stack.length > 0 &&
        heading_stack[heading_stack.length - 1].level >= level
      ) {
        const finished_heading = heading_stack.pop();
        if (heading_lines[finished_heading.key][1] === null) {
          heading_lines[finished_heading.key][1] = line_number - 1;
        }
      }

      // Close the root heading if open and we're now seeing a new top-level heading.
      if (
        heading_stack.length === 0 &&
        heading_lines[root_heading_key] &&
        heading_lines[root_heading_key][1] === null
      ) {
        heading_lines[root_heading_key][1] = line_number - 1;
      }

      // Close any open content block.
      if (current_content_block) {
        if (heading_lines[current_content_block.key][1] === null) {
          heading_lines[current_content_block.key][1] = line_number - 1;
        }
        current_content_block = null;
      }

      // Close any open list item.
      if (current_list_item) {
        if (heading_lines[current_list_item.key][1] === null) {
          heading_lines[current_list_item.key][1] = line_number - 1;
        }
        current_list_item = null;
      }

      // Determine the parent key based on the current heading stack.
      let parent_key = '';
      let parent_level = 0;
      if (heading_stack.length > 0) {
        parent_key = heading_stack[heading_stack.length - 1].key;
        parent_level = heading_stack[heading_stack.length - 1].level;
      } else {
        parent_key = ''; // This is a top-level heading with no parent
        parent_level = 0;
      }

      // If this is a top-level heading (stack empty), handle duplicates by appending [n].
      if (heading_stack.length === 0) {
        heading_counts[title] = (heading_counts[title] || 0) + 1;
        if (heading_counts[title] > 1) {
          title += `[${heading_counts[title]}]`;
        }
      } else {
        // Subheading under an existing parent heading; track duplicates similarly.
        if (!subheading_counts[parent_key]) {
          subheading_counts[parent_key] = {};
        }
        subheading_counts[parent_key][title] = (subheading_counts[parent_key][title] || 0) + 1;
        const count = subheading_counts[parent_key][title];
        if (count > 1) {
          title += `#{${count}}`;
        }
      }

      // The heading's effective level is the difference in nesting from its parent.
      const level_diff = level - parent_level;
      const hashes = '#'.repeat(level_diff);
      const key = parent_key + hashes + title;

      // Initialize the heading line range. End line is unknown yet (null).
      heading_lines[key] = [line_number, null];

      // Initialize sub-block count for this heading.
      sub_block_counts[key] = 0;

      // Push the new heading onto the stack.
      heading_stack.push({ level, title, key });

      continue;
    }

    // Check for top-level list items (no indentation, starting with "- ").
    const list_match = line.match(/^(\s*)([-*]|\d+\.) (.+)$/);
    if (list_match && !in_code_block) {
      const indentation = list_match[1].length;
      if (indentation === 0) {
        // Close any currently open list item.
        if (current_list_item) {
          if (heading_lines[current_list_item.key][1] === null) {
            heading_lines[current_list_item.key][1] = line_number - 1;
          }
          current_list_item = null;
        }

        // If the current content block is NOT the root heading, then close it.
        if (
          current_content_block &&
          current_content_block.key !== root_heading_key
        ) {
          if (heading_lines[current_content_block.key][1] === null) {
            heading_lines[current_content_block.key][1] = line_number - 1;
          }
          current_content_block = null;
        }

        // Determine the parent heading key.
        let parent_key = heading_stack.length > 0
          ? heading_stack[heading_stack.length - 1].key
          : root_heading_key;

        // If the parent is root, ensure the root heading range is initialized.
        if (parent_key === root_heading_key && !heading_lines[root_heading_key]) {
          heading_lines[root_heading_key] = [line_number, null];
        }

        // Increment sub-block count under the parent heading.
        if (sub_block_counts[parent_key] === undefined) {
          sub_block_counts[parent_key] = 0;
        }
        sub_block_counts[parent_key] += 1;
        const n = sub_block_counts[parent_key];

        let key;
        if (line_keys) {
          // Use the first N longest words of the list item content in the key (same order as in the line)
          const content_without_task = list_match[3].replace(/^\[(?: |x|X)\]\s*/, "");
          const words = get_longest_words_in_order(content_without_task, LIST_KEY_WORD_LEN);
          key = `${parent_key}#${words}`;
        } else {
          key = `${parent_key}#{${n}}`;
        }

        heading_lines[key] = [line_number, null];

        // Mark this as the current list item.
        current_list_item = { key, start_line: line_number };

        continue;
      }
      // Indented list items are assumed part of the current list item's content.
      if (current_list_item) {
        continue;
      }
    }

    // Ignore empty lines.
    if (trimmed_line === '') {
      continue;
    }

    // If none of the above conditions met, we're dealing with normal content lines.
    if (!current_content_block) {
      // If there's a list item open, close it; this content isn't part of that list item.
      if (current_list_item) {
        if (heading_lines[current_list_item.key][1] === null) {
          heading_lines[current_list_item.key][1] = line_number - 1;
        }
        current_list_item = null;
      }

      // Determine the parent heading key (or use root if none).
      let parent_key = heading_stack.length > 0
        ? heading_stack[heading_stack.length - 1].key
        : root_heading_key;

      // If content is under the root, make sure the root heading range is set.
      if (parent_key === root_heading_key) {
        if (!heading_lines[root_heading_key]) {
          heading_lines[root_heading_key] = [line_number, null];
        }
        if (
          heading_lines[root_heading_key][1] === null ||
          heading_lines[root_heading_key][1] < line_number
        ) {
          heading_lines[root_heading_key][1] = null; // Defer finalizing the end line
        }
        current_content_block = { key: root_heading_key, start_line: line_number };
      } else {
        // This is a sub-block of the last heading on the stack.
        if (sub_block_counts[parent_key] === undefined) {
          sub_block_counts[parent_key] = 0;
        }
        sub_block_counts[parent_key] += 1;
        const n = sub_block_counts[parent_key];
        const key = `${parent_key}#{${n}}`;
        heading_lines[key] = [line_number, null];
        current_content_block = { key, start_line: line_number };
      }
    }
    // We continue reading lines until something else (heading, list item, code block) closes this content block.
  }

  // After processing all lines, close any open headings, list items, or content blocks with the last line as their end.
  const total_lines = lines.length;
  while (heading_stack.length > 0) {
    const finished_heading = heading_stack.pop();
    if (heading_lines[finished_heading.key][1] === null) {
      heading_lines[finished_heading.key][1] = total_lines + start_index - 1;
    }
  }

  if (current_list_item) {
    if (heading_lines[current_list_item.key][1] === null) {
      heading_lines[current_list_item.key][1] = total_lines + start_index - 1;
    }
    current_list_item = null;
  }

  if (current_content_block) {
    if (heading_lines[current_content_block.key][1] === null) {
      heading_lines[current_content_block.key][1] = total_lines + start_index - 1;
    }
    current_content_block = null;
  }

  // If the root heading was opened but never closed, close it at the final line.
  if (heading_lines[root_heading_key] && heading_lines[root_heading_key][1] === null) {
    heading_lines[root_heading_key][1] = total_lines + start_index - 1;
  }

  // Build the final result object from heading_lines.
  for (const key in heading_lines) {
    result[key] = heading_lines[key];
  }

  return {blocks: result, task_lines, tasks, codeblock_ranges};
}

export function get_longest_words_in_order(line, n=3) {
  const words = line.split(/\s+/).sort((a, b) => b.length - a.length).slice(0, n);
  return words.sort((a, b) => line.indexOf(a) - line.indexOf(b)).join(' ');
}
