import test from 'ava';
import { parse_markdown_blocks } from "./markdown.js";

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
    "#Top-Level Heading##Level 3 Heading (Skipping Level 2)#{1}": [5, 6],
    "#Another Top-Level Heading": [7, 18],
    "#Another Top-Level Heading####Level 5 Heading (Skipping Levels 2-4)": [9, 12],
    "#Another Top-Level Heading####Level 5 Heading (Skipping Levels 2-4)#{1}": [11, 12],
    "#Another Top-Level Heading#Second-Level Heading": [13, 18],
    "#Another Top-Level Heading#Second-Level Heading###Level 5 Child Heading": [15, 18],
    "#Another Top-Level Heading#Second-Level Heading###Level 5 Child Heading#{1}": [17, 18],
    "#Heading Without Content": [19, 24],
    "#Heading Without Content##Subheading With Content": [21, 24],
    "#Heading Without Content##Subheading With Content#{1}": [23, 24],
    "#Heading With Content": [25, 34],
    "#Heading With Content#{1}": [27, 28],
    "#Heading With Content##Subheading Without Content": [29, 34],
    "#Heading With Content##Subheading Without Content#Sub-subheading With Content": [31, 34],
    "#Heading With Content##Subheading Without Content#Sub-subheading With Content#{1}": [33, 34],
    "#Empty H1": [35, 36],
    "#List test heading": [37, 50],
    "#List test heading#{1}": [39, 41],
    "#List test heading#{2}": [42, 42],
    "#List test heading#{3}": [43, 43],
    "#List test heading#{4}": [44, 47],
    "#List test heading#{5}": [48, 50],
    "#Another Top-Level Heading[2]": [51, 55],
    "#Another Top-Level Heading[2]#{1}": [53, 55]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
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
    "#Introduction#{1}": [2, 3],
    "#Getting Started": [4, 6],
    "#Getting Started#{1}": [5, 6],
    "#Conclusion": [7, 8],
    "#Conclusion#{1}": [8, 8]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
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

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
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
    "#Overview#{1}": [2, 3],
    "#Overview[2]": [4, 6],
    "#Overview[2]#{1}": [5, 6],
    "#Details": [7, 9],
    "#Details#{1}": [8, 9],
    "#Overview[3]": [10, 15],
    "#Overview[3]#{1}": [11, 12],
    "#Overview[3]#Details": [13, 15],
    "#Overview[3]#Details#{1}": [14, 15]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
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
    "#Project#{1}": [2, 3],
    "#Project##Goals": [4, 8],
    "#Project##Goals#{1}": [5, 6],
    "#Project##Goals#{2}": [7, 8],
    "#Project#Deliverables": [9, 15],
    "#Project#Deliverables#{1}": [11, 11],
    "#Project#Deliverables#{2}": [12, 15],
    "#Roadmap": [16, 22],
    "#Roadmap#{1}": [18, 20],
    "#Roadmap#{2}": [21, 22],
    "#Conclusion": [23, 24],
    "#Conclusion#{1}": [24, 24]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
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
    "#Heading#{1}": [2, 3],
    "#Heading#Heading": [4, 8],
    "#Heading#Heading#{1}": [5, 8],
    "#Heading[2]": [9, 11],
    "#Heading[2]#{1}": [10, 11]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
  t.deepEqual(result, expected);
});

test('content not under any heading', t => {
  const markdown = `This is some introductory text.

# Heading One
Content under heading one
`;

  const expected = {
    "#": [1, 2],
    "#Heading One": [3, 5],
    "#Heading One#{1}": [4, 5]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
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
    "#Heading One": [9, 11],
    "#Heading One#{1}": [10, 11]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
  t.deepEqual(result, expected);
});

test('should not mistake --- for frontmatter if not at beginning of file', t => {
  const markdown = `Some introductory text.
# Heading One
Content under heading one

---
More text after line separator
---

# Heading Two
Final text after second line separator
`;

  const expected = {
    "#": [1, 1],
    "#Heading One": [2, 8],
    "#Heading One#{1}": [3, 8],
    "#Heading Two": [9, 11],
    "#Heading Two#{1}": [10, 11]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
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
    "#Heading One": [4, 6],
    "#Heading One#{1}": [5, 6]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
  t.deepEqual(result, expected);
});
test('content prior to first heading with multiple nested list items', t => {
  const markdown = `non-list-non-heading-content
- list item one
  - nested list item one
  - nested list item two
- list item two
  - nested list item three
  - nested list item four

# Heading One
Content under heading one
`;

  const expected = {
    "#": [1, 8],
    "##{1}": [2, 4],
    "##{2}": [5, 8],
    "#Heading One": [9, 11],
    "#Heading One#{1}": [10, 11]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
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
    "#Heading#{1}": [2, 7],
    "#Another Heading": [8, 10],
    "#Another Heading#{1}": [9, 10]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
  t.deepEqual(result, expected);
});

test('heading wrapped in quotes should be treated as normal heading', t => {
  const markdown = `# "Heading"
Content under heading.
`;

  const expected = {
    "#\"Heading\"": [1, 3],
    "#\"Heading\"#{1}": [2, 3]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
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

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
  t.deepEqual(result, expected);
});

test('should handle nested list items with line break between items', t => {
  const markdown = `# Heading
- parent list item one

  - child list item one
  - child list item two

- parent list item two
  - child list item three

##### New Environment

1. **Creating a New Environment**:

	- Open the **Smart Connect** app.
	- If no environments are found, click the **New Environment** button.
	- Click on the **Folder** field to select your Obsidian vault folder.
	- The new environment will appear in the Smart Environments list.

* **Renaming the Environment**:

	- It's recommended to rename the environment to match your vault name for compatibility with Obsidian-specific features.
		- Right-click on the new environment and select **Rename**.
		- Enter the exact name of your Obsidian vault.
		- Press **Enter** to save the new name.
`;

  const expected = {
    "#Heading": [1, 25],
    "#Heading#{1}": [2, 6],
    "#Heading#{2}": [7, 9],
    "#Heading####New Environment": [10, 25],
    "#Heading####New Environment#{1}": [12, 18],
    "#Heading####New Environment#{2}": [19, 25]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
  t.deepEqual(result, expected);
});

test('should include paragraph text in sub-block if would have adjacent list items blocks', t => {
  const markdown = `### Lorem Ipsum

Dolor Sit Amet

- **Consectetur**: The **Adipiscing Elit** sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
- **Ut Enim Ad Minim**:
	- Veniam quis nostrud exercitation ullamco laboris nisi ut aliquip.
	- Ex ea commodo consequat duis aute irure dolor in reprehenderit.
- **Voluptate**:
	- Velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat.

**Cupidatat Non Proident**

- **Sunt In Culpa**: Qui officia deserunt mollit anim id est laborum.
- **Sed Ut Perspiciatis**:
	- Unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.
- **Totam Rem Aperiam**:
	- Eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae.
	- Dicta sunt explicabo nemo enim ipsam voluptatem quia voluptas sit aspernatur.
`;

  const expected = {
    "###Lorem Ipsum": [1, 20],
    "###Lorem Ipsum#{1}": [3, 4],
    "###Lorem Ipsum#{2}": [5, 5],
    "###Lorem Ipsum#{3}": [6, 8],
    "###Lorem Ipsum#{4}": [9, 11],
    "###Lorem Ipsum#{5}": [12, 13],
    "###Lorem Ipsum#{6}": [14, 14],
    "###Lorem Ipsum#{7}": [15, 16],
    "###Lorem Ipsum#{8}": [17, 20]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
  t.deepEqual(result, expected);
});

test('headings with the same title at different levels with multiple blank lines between them SHOULD WORK WITH H5', t => {
  const markdown = `##### Heading
Content under heading.

###### Heading
Content under subheading.



##### Heading
Content under second occurrence of top-level heading.
`;

  const expected = {
    "#####Heading": [1, 8],
    "#####Heading#{1}": [2, 3],
    "#####Heading#Heading": [4, 8],
    "#####Heading#Heading#{1}": [5, 8],
    "#####Heading[2]": [9, 11],
    "#####Heading[2]#{1}": [10, 11]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
  t.deepEqual(result, expected);
});


test('respects start_index argument', t => {
  const markdown = `non-list-non-heading-content
- list item one
  - nested list item one
  - nested list item two
- list item two
  - nested list item three
  - nested list item four

# Heading One
Content under heading one
`;

  const expected = {
    "#": [0, 7],
    "##{1}": [1, 3],
    "##{2}": [4, 7],
    "#Heading One": [8, 10],
    "#Heading One#{1}": [9, 10]
  };

  const {blocks: result, task_lines} = parse_markdown_blocks(markdown, {start_index: 0});
  t.deepEqual(result, expected);
});

test('opts.line_keys uses the first three longest words of line in block path key instead of {n} for list-item blocks', t => {
  const markdown = `# Heading
- [ ] the longest list item one
  - sublist item one
- list item two
  - sublist item two
* non-sensical list item three has extremely sophisticated words
  - sublist item three
`.trim();
  const {blocks: result, task_lines} = parse_markdown_blocks(markdown, { line_keys: true, list_key_word_len: 3 });
  const expected = {
    "#Heading": [1, 7],
    "#Heading#longest list item": [2, 3],
    "#Heading#list item two": [4, 5],
    "#Heading#non-sensical extremely sophisticated": [6, 7]
  };
  t.deepEqual(result, expected);
  t.deepEqual(task_lines, [2]);
});

test('task_lines captures markdown tasks', t => {
  const markdown = `# Heading\n- [ ] todo\ntext\n- [x] done`;
  const {blocks: result, task_lines} = parse_markdown_blocks(markdown);
  t.deepEqual(task_lines, [2, 4]);
});
