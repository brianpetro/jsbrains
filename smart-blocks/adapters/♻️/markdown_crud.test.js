import test from 'ava';
import { block_read, block_update, block_destroy } from './markdown_crud.js';

test('block_read should return correct block content including subblocks', t => {
  const content = `# Heading 1
Content under heading 1.

## Heading 1.1
Content under heading 1.1.

# Heading 2
Content under heading 2.`;

  const block_key = '#Heading 1';
  const expected = `# Heading 1
Content under heading 1.

## Heading 1.1
Content under heading 1.1.
`;

  const result = block_read(content, block_key);
  t.is(result, expected, 'block_read should return the correct content including subblocks');
});

test('block_update should update entire block including subblocks when block_key is a heading', t => {
  const content = `# Heading 1
Content under heading 1.

## Heading 1.1
Content under heading 1.1.

# Heading 2
Content under heading 2.`;

  const block_key = '#Heading 1';
  const new_block_content = `# Updated Heading 1
Updated content under heading 1.

## Updated Heading 1.1
Updated content under heading 1.1.
`;

  const expected = `# Updated Heading 1
Updated content under heading 1.

## Updated Heading 1.1
Updated content under heading 1.1.

# Heading 2
Content under heading 2.`;

  const result = block_update(content, block_key, new_block_content);
  t.is(result, expected, 'block_update should replace the entire block including subblocks');
});

test('block_update should update only the specific content block when block_key is a content block', t => {
  const content = `# Heading 1
Content under heading 1.

## Heading 1.1
Content under heading 1.1.

# Heading 2
Content under heading 2.`;

  const block_key = '#Heading 1#{1}';
  const new_block_content = `Updated content under heading 1.`;

  const expected = `# Heading 1
Updated content under heading 1.
## Heading 1.1
Content under heading 1.1.

# Heading 2
Content under heading 2.`;

  const result = block_update(content, block_key, new_block_content);
  t.is(result, expected, 'block_update should update only the specific content block');
});

test('block_destroy should remove entire block including subblocks when block_key is a heading', t => {
  const content = `# Heading 1
Content under heading 1.

## Heading 1.1
Content under heading 1.1.

# Heading 2
Content under heading 2.`;

  const block_key = '#Heading 1';
  const expected = `# Heading 2
Content under heading 2.`;

  const result = block_destroy(content, block_key);
  t.is(result, expected, 'block_destroy should remove the entire block including subblocks');
});

test('block_destroy should remove only the specific content block when block_key is a content block', t => {
  const content = `# Heading 1
Content under heading 1.

## Heading 1.1
Content under heading 1.1.

# Heading 2
Content under heading 2.`;

  const block_key = '#Heading 1#{1}';
  const expected = `# Heading 1
## Heading 1.1
Content under heading 1.1.

# Heading 2
Content under heading 2.`;

  const result = block_destroy(content, block_key);
  t.is(result, expected, 'block_destroy should remove only the specific content block');
});

test('block_read should throw error for non-existent block', t => {
  const content = `# Heading 1
Content under heading 1.`;

  const block_key = '#Non-Existent Heading';
  const error = t.throws(() => {
    block_read(content, block_key);
  }, { instanceOf: Error });

  t.is(error.message, `BLOCK NOT FOUND: No block found with key "${block_key}".`, 'block_read should throw error for invalid block_key');
});

test('block_update should throw error for non-existent block', t => {
  const content = `# Heading 1
Content under heading 1.`;

  const block_key = '#Non-Existent Heading';
  const new_block_content = `# Non-Existent Heading
New content.`;

  const error = t.throws(() => {
    block_update(content, block_key, new_block_content);
  }, { instanceOf: Error });

  t.is(error.message, `BLOCK NOT FOUND: No block found with key "${block_key}".`, 'block_update should throw error for invalid block_key');
});

test('block_destroy should throw error for non-existent block', t => {
  const content = `# Heading 1
Content under heading 1.`;

  const block_key = '#Non-Existent Heading';

  const error = t.throws(() => {
    block_destroy(content, block_key);
  }, { instanceOf: Error });

  t.is(error.message, `BLOCK NOT FOUND: No block found with key "${block_key}".`, 'block_destroy should throw error for invalid block_key');
});

test('block_update should update frontmatter correctly', t => {
  const content = `---
title: Original Title
date: 2023-04-20
tags:
  - tag1
  - tag2
---

# Heading 1
Content under heading 1.

# Heading 2
Content under heading 2.`;

  const block_key = '#---frontmatter---';
  const new_frontmatter = `---
title: Updated Title
date: 2023-04-21
tags:
  - tag1
  - tag2
  - tag3
---`;

  const expected = `---
title: Updated Title
date: 2023-04-21
tags:
  - tag1
  - tag2
  - tag3
---

# Heading 1
Content under heading 1.

# Heading 2
Content under heading 2.`;

  const result = block_update(content, block_key, new_frontmatter);
  t.is(result, expected, 'block_update should correctly update the frontmatter');
});
