#!/usr/bin/env node

/**
 * @fileoverview
 * This script sets up a variety of Markdown note files to test the SmartSources Markdown adapter and Block parser.
 * It creates a structured folder with multiple Markdown files, each containing different patterns and quirks to ensure
 * comprehensive integration testing of parsing, importing, block extraction, and CRUD operations.
 *
 * Directory structure:
 * test/test-content/variations/
 * ├── frontmatter_note.md
 * ├── nested_headings.md
 * ├── code_blocks.md
 * ├── no_headings.md
 * ├── only_lists.md
 * ├── repeated_headings.md
 * ├── mixed_content.md
 * ├── large_note.md
 * ├── empty_note.md
 * ├── special_chars_headings.md
 * └── frontmatter_complex.md
 */

"use strict";

/**
 * @typedef {import('fs')} fs
 */

import fs from "fs";
import path from "path";

/**
 * @description Creates a directory if it does not already exist.
 * @param {string} dir_path The directory path to create.
 */
function ensure_dir_exists(dir_path) {
  if (!fs.existsSync(dir_path)) {
    fs.mkdirSync(dir_path, { recursive: true });
  }
}

/**
 * @description Writes a file with the given content.
 * @param {string} file_path The file path where the content should be written.
 * @param {string} content The content to write to the file.
 */
function write_file(file_path, content) {
  fs.writeFileSync(file_path, content, { encoding: "utf8" });
}

/**
 * @description Appends content to a file.
 * @param {string} file_path The file path to append to.
 * @param {string} content The content to append.
 */
function append_to_file(file_path, content) {
  fs.appendFileSync(file_path, content, { encoding: "utf8" });
}

// Base directory
const base_dir = path.join("test", "test-content", "variations");
ensure_dir_exists(base_dir);

///////////////////////////////////////////////
// 1. Note with frontmatter and headings
///////////////////////////////////////////////
write_file(
  path.join(base_dir, "frontmatter_note.md"),
  `---
title: "Test Frontmatter"
date: 2024-01-01
tags: [test, markdown, frontmatter]
---

# Heading 1

Some introductory content.

## Heading 2

More content under heading 2.

### Heading 3

Deeper level heading content.
`
);

// Integration test notes:
// - Test that frontmatter is parsed as a block (#---frontmatter---) and can be updated/destroyed.
// - Verify that headings and subheadings are correctly extracted as blocks.
// - Check that outlinks (if any) are parsed.
// - Confirm block CRUD operations (block_read, block_update, block_destroy) against frontmatter or headings.
// - Ensure that removing or rewriting frontmatter updates AJSON correctly.

///////////////////////////////////////////////
// 2. Note with deeply nested headings
///////////////////////////////////////////////
write_file(
  path.join(base_dir, "nested_headings.md"),
  `# Level 1

## Level 2

### Level 3

#### Level 4

##### Level 5

###### Level 6

Content at the deepest heading level.
`
);

// Integration test notes:
// - Verify that up to six levels of headings are correctly identified as blocks.
// - Check how block removal or updates propagate when dealing with deeply nested headings.
// - Test that parse_markdown_blocks does not break with extreme heading nesting.
// - Validate that rewriting minimal files after import preserves heading structure.

///////////////////////////////////////////////
// 3. Note with code blocks
///////////////////////////////////////////////
write_file(
  path.join(base_dir, "code_blocks.md"),
  `# Code Blocks Test

Here is some code:

\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\`

## Another Heading

\`\`\`bash
echo "test"
\`\`\`

`
);

// Integration test notes:
// - Confirm that code blocks are treated as normal content lines and not misinterpreted as headings.
// - Verify block extraction does not fail due to code fences.
// - Test block updates within code fenced areas (append, update content inside code blocks).
// - Ensure code blocks do not cause JSON parse errors in AJSON.

///////////////////////////////////////////////
// 4. Note with no headings at all
///////////////////////////////////////////////
write_file(
  path.join(base_dir, "no_headings.md"),
  `This file has no headings.

Just plain text.

Even multiple lines of it.

`
);

// Integration test notes:
// - Ensure that when no headings are present, a single root-level block (#) is created.
// - Test CRUD on the root block content.
// - Verify searching and embedding still works with a no-heading scenario.
// - Confirm rewriting minimal file still works with no headings.

///////////////////////////////////////////////
// 5. Note with only lists
///////////////////////////////////////////////
write_file(
  path.join(base_dir, "only_lists.md"),
  `- First item
  - Nested item
- Second item

- Third item
  - Another nested level
    - Deeply nested
`
);

// Integration test notes:
// - Ensure lists are converted into blocks as content blocks under root.
// - Check that each top-level list item creates a separate sub-block.
// - Validate block_destroy removes only that item’s lines.
// - Confirm that updates to list items reflect in AJSON.

///////////////////////////////////////////////
// 6. Note with repeated headings
///////////////////////////////////////////////
write_file(
  path.join(base_dir, "repeated_headings.md"),
  `# Repeated
Content under the first occurrence.

# Repeated
Second occurrence of the same heading text.

## Repeated
Subheading also repeated multiple times.

## Repeated
Another subheading with the same name.
`
);

// Integration test notes:
// - Verify that repeated headings get suffixed with [2], [3], etc. for top-level duplicates.
// - Check that block references to repeated headings are stable.
// - Ensure import/export is correct and stable for repeated heading names.
// - Test block removal of one repeated heading does not affect others incorrectly.

///////////////////////////////////////////////
// 7. Note with mixed content (frontmatter, code, lists, headings)
///////////////////////////////////////////////
write_file(
  path.join(base_dir, "mixed_content.md"),
  `---
title: Mixed Content Test
---

# Main Heading

Some intro text.

- A list item
- Another list item

\`\`\`python
print("Hello")
\`\`\`

## Subheading

More text under subheading.
`
);

// Integration test notes:
// - Test complex scenario: frontmatter + headings + lists + code blocks all in one file.
// - Confirm block parsing remains correct with multiple content types.
// - Test partial updates: removing list block, updating code block content, rewriting frontmatter.
// - Validate stable AJSON after multiple round-trip import/export cycles.

///////////////////////////////////////////////
// 8. Large note
///////////////////////////////////////////////
write_file(
  path.join(base_dir, "large_note.md"),
  `# Large Note

`
);

for (let i = 1; i <= 200; i++) {
  append_to_file(
    path.join(base_dir, "large_note.md"),
    `Paragraph line ${i} with some content to increase note size.\n`
  );
}

append_to_file(path.join(base_dir, "large_note.md"), `## Another Heading\n`);

for (let i = 1; i <= 200; i++) {
  append_to_file(
    path.join(base_dir, "large_note.md"),
    `Another big paragraph block line ${i}.\n`
  );
}

// Integration test notes:
// - Tests performance and correctness with large file sizes.
// - Validate that line references remain stable after large content changes.
// - Check block updates and deletions still function at scale.
// - Ensure no memory or JSON parse issues with large content.

///////////////////////////////////////////////
// 9. Empty note
///////////////////////////////////////////////
write_file(
  path.join(base_dir, "empty_note.md"),
  `

`
);

// Integration test notes:
// - Confirm that an empty file still imports without errors.
// - Verify that no blocks are created (or a root block) and that CRUD ops handle empty gracefully.
// - Check that saving after load doesn't create malformed AJSON.

///////////////////////////////////////////////
// 10. Headings with special characters
///////////////////////////////////////////////
write_file(
  path.join(base_dir, "special_chars_headings.md"),
  `# Heading with $Special_Char

## Heading With Spaces and (Parentheses)

### Heading_with_underscores_and_$variables

Content under tricky headings.
`
);

// Integration test notes:
// - Ensure special characters in headings do not break block keys.
// - Validate that AJSON keys are properly JSON-stringified and remain stable across imports.
// - Check CRUD operations on these special heading blocks.

///////////////////////////////////////////////
// 11. Complex frontmatter with lists, nested data
///////////////////////////////////////////////
write_file(
  path.join(base_dir, "frontmatter_complex.md"),
  `---
title: Complex Frontmatter
authors:
  - name: Alice
    role: Editor
  - name: Bob
    role: Reviewer
metadata:
  tags: [complex, nested, frontmatter]
  version: 2
---

# Main Content

This note tests complex nested frontmatter.
`
);

// Integration test notes:
// - Test parsing and rewriting of complex, nested frontmatter data structures.
// - Confirm block_update on frontmatter accurately replaces nested YAML.
// - Validate block_destroy can remove frontmatter entirely and rewrite file.
// - Ensure stable keys and JSON parse logic in AJSON after complex frontmatter import.

///////////////////////////////////////////////
console.log(`All test notes have been created in ${base_dir}.`);
console.log("Use these notes to run integration tests on SmartSources Markdown adapter and block parser.");