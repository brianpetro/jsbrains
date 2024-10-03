import test from 'ava';
import { markdown_to_blocks } from "./markdown_to_blocks.js";

test('convert markdown with complex heading structures to flat JS object', t => {
  const markdown = `# Top-Level Heading

### Level 3 Heading (Skipping Level 2)

Content under level 3 heading.

# Another Top-Level Heading

##### Level 5 Heading (Skipping Levels 2-4)

Content under level 5 heading.

## Second-Level Heading

##### Level 5 Child Heading

Some content here.

# Heading Without Content

### Subheading With Content

Content under subheading.

# Heading With Content

Content directly under this heading.

### Subheading Without Content

#### Sub-subheading With Content

More content.

# Empty H1

# List test heading

- should treat top-level list item as heading without including full line in property key
  - should work by appending \`#{n}\` to the end of the heading path
  - \`n\` is the nth list item within the same parent heading (starting count at 1)
- list items should be able to be indented to any depth
- single line top-level list items should be treated as heading
- multi-line top-level list items should contain line range of all sub-lines in list item
  - this sub-item belongs to \`#List test heading#{4}\`
  - the line range should include all lines to the next heading or list item

Paragraph after list item should be treated as next list item and contain line range of all paragraph lines until the next heading or list item.
This paragraph text in same as the above paragraph \`#List test heading#{5}\`

# Another Top-Level Heading

This subsequent occurrence of a top-level heading should be treated as a new top-level heading with a \`[n]\` where \`n\` is number of the occurrence in the document.
In this case, \`#Another Top-Level Heading[2]\`. No \`#\` separates the heading from the \`[n]\` suffix indicating that it is an adjacent heading (not nested).
`;

  const expected = {
    "#Top-Level Heading": [1, 6],
    "#Top-Level Heading##Level 3 Heading (Skipping Level 2)": [3, 6],
    "#Another Top-Level Heading": [7, 18],
    "#Another Top-Level Heading####Level 5 Heading (Skipping Levels 2-4)": [9, 12],
    "#Another Top-Level Heading#Second-Level Heading": [13, 18],
    "#Another Top-Level Heading#Second-Level Heading###Level 5 Child Heading": [15, 18],
    "#Heading Without Content": [19, 24],
    "#Heading Without Content##Subheading With Content": [21, 24],
    "#Heading With Content": [25, 34],
    "#Heading With Content##Subheading Without Content": [29, 34],
    "#Heading With Content##Subheading Without Content#Sub-subheading With Content": [31, 34],
    "#Empty H1": [35, 36],
    "#List test heading": [37, 50],
    "#List test heading#{1}": [39, 41],
    "#List test heading#{2}": [42, 42],
    "#List test heading#{3}": [43, 43],
    "#List test heading#{4}": [44, 47],
    "#List test heading#{5}": [48, 50],
    "#Another Top-Level Heading[2]": [51, 55]
  };

  const result = markdown_to_blocks(markdown);
  t.deepEqual(result, expected);
});


test('convert markdown with headings without subheadings to flat JS object', t => {
  const markdown = `# Introduction
Welcome to the documentation.

# Getting Started
Follow these steps to begin.

# Conclusion
Thank you for reading.`;

  const expected = {
    "#Introduction": [1, 3],
    "#Getting Started": [4, 6],
    "#Conclusion": [7, 8]
  };

  const result = markdown_to_blocks(markdown);
  t.deepEqual(result, expected);
});


test('convert markdown with deeply nested headings to flat JS object', t => {
  const markdown = `# Chapter 1

## Section 1.1

### Subsection 1.1.1

#### Topic 1.1.1.1

# Chapter 2

## Section 2.1

### Subsection 2.1.1

#### Topic 2.1.1.1

##### Detail 2.1.1.1.1

# Chapter 3
`;

  const expected = {
    "#Chapter 1": [1, 8],
    "#Chapter 1#Section 1.1": [3, 8],
    "#Chapter 1#Section 1.1#Subsection 1.1.1": [5, 8],
    "#Chapter 1#Section 1.1#Subsection 1.1.1#Topic 1.1.1.1": [7, 8],
    "#Chapter 2": [9, 18],
    "#Chapter 2#Section 2.1": [11, 18],
    "#Chapter 2#Section 2.1#Subsection 2.1.1": [13, 18],
    "#Chapter 2#Section 2.1#Subsection 2.1.1#Topic 2.1.1.1": [15, 18],
    "#Chapter 2#Section 2.1#Subsection 2.1.1#Topic 2.1.1.1#Detail 2.1.1.1.1": [17, 18],
    "#Chapter 3": [19, 20]
  };

  const result = markdown_to_blocks(markdown);
  t.deepEqual(result, expected);
});

test('convert markdown with multiple top-level headings occurrences to flat JS object', t => {
  const markdown = `# Overview
General overview content.

# Overview
Second overview occurrence.

# Details
Detailed information.

# Overview
Third overview occurrence.

## Details
Overview detailed information.
`;

  const expected = {
    "#Overview": [1, 3],
    "#Overview[2]": [4, 6],
    "#Details": [7, 9],
    "#Overview[3]": [10, 15],
    "#Overview[3]#Details": [13, 15]
  };

  const result = markdown_to_blocks(markdown);
  t.deepEqual(result, expected);
});


test('convert markdown with mixed content (lists and subheadings) to flat JS object', t => {
  const markdown = `# Project
Introduction to the project.

### Goals
- Goal One
  - Subgoal A
- Goal Two

## Deliverables

- Deliverable One
- Deliverable Two
  - Detail A
  - Detail B

# Roadmap

- Phase 1
  - Task 1
  - Task 2
- Phase 2

# Conclusion
Final thoughts.`;

  const expected = {
    "#Project": [1, 15],
    "#Project##Goals": [4, 8],
    "#Project##Goals#{1}": [5, 6],
    "#Project##Goals#{2}": [7, 8],
    "#Project#Deliverables": [9, 15],
    "#Project#Deliverables#{1}": [11, 11],
    "#Project#Deliverables#{2}": [12, 15],
    "#Roadmap": [16, 22],
    "#Roadmap#{1}": [18, 20],
    "#Roadmap#{2}": [21, 22],
    "#Conclusion": [23, 24]
  };

  const result = markdown_to_blocks(markdown);
  t.deepEqual(result, expected);
});

test('headings with the same title at different levels with multiple blank lines between them', t => {
  const markdown = `# Heading
Content under heading.

## Heading
Content under subheading.



# Heading
Content under second occurrence of top-level heading.
`;

  const expected = {
    "#Heading": [1, 8],
    "#Heading#Heading": [4, 8],
    "#Heading[2]": [9, 11]
  };

  const result = markdown_to_blocks(markdown);
  t.deepEqual(result, expected);
});

test('content not under any heading', t => {
  const markdown = `This is some introductory text.

# Heading One
Content under heading one
`;

  const expected = {
    "#": [1, 2],
    "#Heading One": [3, 5]
  };

  const result = markdown_to_blocks(markdown);
  t.deepEqual(result, expected);
});

test('should handle frontmatter as special heading', t => {
  const markdown = `---
tags: tags1, tags2, tags3
author: somebody
list_property:
  - list item one
  - list item two
---

# Heading One
Content under heading one
`;

  const expected = {
    "#---frontmatter---": [1, 7],
    "#Heading One": [9, 11]
  };

  const result = markdown_to_blocks(markdown);
  t.deepEqual(result, expected);
});

test('content prior to first heading with list items', t => {
  const markdown = `- list item one
- list item two

# Heading One
Content under heading one
`;

  const expected = {
    "#": [1, 3],
    "##{1}": [1, 1],
    "##{2}": [2, 3],
    "#Heading One": [4, 6]
  };

  const result = markdown_to_blocks(markdown);
  t.deepEqual(result, expected);
});

test('should handle code blocks', t => {
  const markdown = `# Heading
Some text

\`\`\`
code block
\`\`\`

# Another Heading
Some text
`;

  const expected = {
    "#Heading": [1, 7],
    "#Another Heading": [8, 10]
  };

  const result = markdown_to_blocks(markdown);
  t.deepEqual(result, expected);
});

test('heading wrapped in quotes should be treated as normal heading', t => {
  const markdown = `# "Heading"
Content under heading.
`;

  const expected = {
    "#\"Heading\"": [1, 3]
  };

  const result = markdown_to_blocks(markdown);
  t.deepEqual(result, expected);
});

test('headings within code-blocks should be ignored', t => {
  const markdown = `\`\`\`
# Heading
Content under heading.
\`\`\`
`;

  const expected = {
    "#": [1, 5]
  };

  const result = markdown_to_blocks(markdown);
  t.deepEqual(result, expected);
});

test('should handle nested list items with line break between items', t => {
  const markdown = `# Heading
- parent list item one

  - child list item one
  - child list item two

- parent list item two
  - child list item three
`;

  const expected = {
    "#Heading": [1, 9],
    "#Heading#{1}": [2, 6],
    "#Heading#{2}": [7, 9]
  };

  const result = markdown_to_blocks(markdown);
  t.deepEqual(result, expected);
});