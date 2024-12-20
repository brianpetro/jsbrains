#!/usr/bin/env bash

# This script sets up a variety of Markdown note files to test the SmartSources Markdown adapter and Block parser.
# It creates a structured folder with multiple Markdown files, each containing different patterns and quirks to ensure
# comprehensive integration testing of parsing, importing, block extraction, and CRUD operations.

# Directory structure:
# test/test-content/variations/
# ├── frontmatter_note.md
# ├── nested_headings.md
# ├── code_blocks.md
# ├── no_headings.md
# ├── only_lists.md
# ├── repeated_headings.md
# ├── mixed_content.md
# ├── large_note.md
# ├── empty_note.md
# ├── special_chars_headings.md
# └── frontmatter_complex.md

set -e

BASE_DIR="test/test-content/variations"

# Create base directory
mkdir -p "$BASE_DIR"

#############################################
# 1. Note with frontmatter and headings
#############################################
cat > "$BASE_DIR/frontmatter_note.md" <<EOF
---
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
EOF

# Integration test notes:
# - Test that frontmatter is parsed as a block (#---frontmatter---) and can be updated/destroyed.
# - Verify that headings and subheadings are correctly extracted as blocks.
# - Check that outlinks (if any) are parsed.
# - Confirm block CRUD operations (block_read, block_update, block_destroy) against frontmatter or headings.
# - Ensure that removing or rewriting frontmatter updates AJSON correctly.

#############################################
# 2. Note with deeply nested headings
#############################################
cat > "$BASE_DIR/nested_headings.md" <<EOF
# Level 1

## Level 2

### Level 3

#### Level 4

##### Level 5

###### Level 6

Content at the deepest heading level.
EOF

# Integration test notes:
# - Verify that up to six levels of headings are correctly identified as blocks.
# - Check how block removal or updates propagate when dealing with deeply nested headings.
# - Test that markdown_to_blocks does not break with extreme heading nesting.
# - Validate that rewriting minimal files after import preserves heading structure.

#############################################
# 3. Note with code blocks
#############################################
cat > "$BASE_DIR/code_blocks.md" <<EOF
# Code Blocks Test

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

EOF

# Integration test notes:
# - Confirm that code blocks are treated as normal content lines and not misinterpreted as headings.
# - Verify block extraction does not fail due to code fences.
# - Test block updates within code fenced areas (append, update content inside code blocks).
# - Ensure code blocks do not cause JSON parse errors in AJSON.

#############################################
# 4. Note with no headings at all
#############################################
cat > "$BASE_DIR/no_headings.md" <<EOF
This file has no headings.

Just plain text.

Even multiple lines of it.

EOF

# Integration test notes:
# - Ensure that when no headings are present, a single root-level block (#) is created.
# - Test CRUD on the root block content.
# - Verify searching and embedding still works with a no-heading scenario.
# - Confirm rewriting minimal file still works with no headings.

#############################################
# 5. Note with only lists
#############################################
cat > "$BASE_DIR/only_lists.md" <<EOF
- First item
  - Nested item
- Second item

- Third item
  - Another nested level
    - Deeply nested
EOF

# Integration test notes:
# - Ensure lists are converted into blocks as content blocks under root.
# - Check that each top-level list item creates a separate sub-block.
# - Validate block_destroy removes only that item’s lines.
# - Confirm that updates to list items reflect in AJSON.

#############################################
# 6. Note with repeated headings
#############################################
cat > "$BASE_DIR/repeated_headings.md" <<EOF
# Repeated
Content under the first occurrence.

# Repeated
Second occurrence of the same heading text.

## Repeated
Subheading also repeated multiple times.

## Repeated
Another subheading with the same name.
EOF

# Integration test notes:
# - Verify that repeated headings get suffixed with [2], [3], etc. for top-level duplicates.
# - Check that block references to repeated headings are stable.
# - Ensure import/export is correct and stable for repeated heading names.
# - Test block removal of one repeated heading does not affect others incorrectly.

#############################################
# 7. Note with mixed content (frontmatter, code, lists, headings)
#############################################
cat > "$BASE_DIR/mixed_content.md" <<EOF
---
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
EOF

# Integration test notes:
# - Test complex scenario: frontmatter + headings + lists + code blocks all in one file.
# - Confirm block parsing remains correct with multiple content types.
# - Test partial updates: removing list block, updating code block content, rewriting frontmatter.
# - Validate stable AJSON after multiple round-trip import/export cycles.

#############################################
# 8. Large note
#############################################
cat > "$BASE_DIR/large_note.md" <<EOF
# Large Note

EOF

# Append a large amount of dummy content
for i in {1..200}; do
    echo "Paragraph line $i with some content to increase note size." >> "$BASE_DIR/large_note.md"
done

echo "## Another Heading" >> "$BASE_DIR/large_note.md"
for i in {1..200}; do
    echo "Another big paragraph block line $i." >> "$BASE_DIR/large_note.md"
done

# Integration test notes:
# - Tests performance and correctness with large file sizes.
# - Validate that line references remain stable after large content changes.
# - Check block updates and deletions still function at scale.
# - Ensure no memory or JSON parse issues with large content.

#############################################
# 9. Empty note
#############################################
cat > "$BASE_DIR/empty_note.md" <<EOF

EOF

# Integration test notes:
# - Confirm that an empty file still imports without errors.
# - Verify that no blocks are created (or a root block) and that CRUD ops handle empty gracefully.
# - Check that saving after load doesn't create malformed AJSON.

#############################################
# 10. Headings with special characters
#############################################
cat > "$BASE_DIR/special_chars_headings.md" <<EOF
# Heading with $Special_Char

## Heading With Spaces and (Parentheses)

### Heading_with_underscores_and_$variables

Content under tricky headings.
EOF

# Integration test notes:
# - Ensure special characters in headings do not break block keys.
# - Validate that AJSON keys are properly JSON-stringified and remain stable across imports.
# - Check CRUD operations on these special heading blocks.

#############################################
# 11. Complex frontmatter with lists, nested data
#############################################
cat > "$BASE_DIR/frontmatter_complex.md" <<EOF
---
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
EOF

# Integration test notes:
# - Test parsing and rewriting of complex, nested frontmatter data structures.
# - Confirm block_update on frontmatter accurately replaces nested YAML.
# - Validate block_destroy can remove frontmatter entirely and rewrite file.
# - Ensure stable keys and JSON parse logic in AJSON after complex frontmatter import.

#############################################
echo "All test notes have been created in $BASE_DIR."
echo "Use these notes to run integration tests on SmartSources Markdown adapter and block parser."
