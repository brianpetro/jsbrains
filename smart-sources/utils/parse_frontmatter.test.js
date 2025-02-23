/**
 * @file parse_frontmatter.test.js
 * Integration tests for parse_frontmatter function using AVA.
 * Verifies compatibility with Obsidian-style frontmatter (triple-dashed).
 */

import test from 'ava';
import { parse_frontmatter } from './parse_frontmatter.js';

/**
 * Standard frontmatter at the top, a single property, and content below.
 */
test('parses basic frontmatter with single property', t => {
  const content = `---
title: Test Document
---
This is the body text.`;

  const result = parse_frontmatter(content);
  t.deepEqual(result.frontmatter, { title: 'Test Document' });
  t.is(result.body.trim(), 'This is the body text.');
});

/**
 * Multiple properties with different data types and multi-line content.
 */
test('parses frontmatter with multiple properties and multi-line content', t => {
  const content = `---
title: Complex Document
tags:
  - frontmatter
  - test
description: >
  This is a test
  with multiple lines
  in the description
---
Main content goes here.
Line two of body.`;

  const result = parse_frontmatter(content);
  t.deepEqual(result.frontmatter, {
    title: 'Complex Document',
    tags: ['frontmatter', 'test'],
    description: 'This is a test\nwith multiple lines\nin the description'
  });
  t.is(result.body.trim(), 'Main content goes here.\nLine two of body.');
});

/**
 * No valid frontmatter present.
 */
test('returns empty frontmatter object if no triple-dashed block found', t => {
  const content = `Some text
Without any frontmatter
Just lines of text.`;

  const result = parse_frontmatter(content);
  t.deepEqual(result.frontmatter, {});
  t.is(result.body, content);
});

/**
 * Missing closing triple-dash.
 */
test('handles malformed frontmatter (missing closing triple-dash) by ignoring frontmatter', t => {
  const content = `---
title: Unclosed
Some text without closure.`;

  const result = parse_frontmatter(content);
  t.deepEqual(result.frontmatter, {});
  t.is(result.body, content);
});

/**
 * Frontmatter exists but is empty, followed by content.
 */
test('parses empty frontmatter block', t => {
  const content = `---
---
Body text here.`;

  const result = parse_frontmatter(content);
  t.deepEqual(result.frontmatter, {});
  t.is(result.body.trim(), 'Body text here.');
});

/**
 * Handles frontmatter separated by triple-dashes, even if it's at the bottom.
 * Obsidian typically expects frontmatter at the top, but we verify behavior.
 */
test('frontmatter at the bottom should be ignored for Obsidian-like usage', t => {
  const content = `This is the body text at the top.
---
title: Unexpected Bottom
---`;

  const result = parse_frontmatter(content);
  t.deepEqual(result.frontmatter, {});
  t.is(result.body, content);
});

/**
 * Checks that any additional triple-dash lines within body are not parsed as frontmatter.
 */
test('ignores extra triple-dash lines within body', t => {
  const content = `---
title: Mixed Content
---
Content line 1
---
Content line 2
---
Content line 3`;

  const result = parse_frontmatter(content);
  t.deepEqual(result.frontmatter, { title: 'Mixed Content' });
  t.is(result.body.trim(), 'Content line 1\n---\nContent line 2\n---\nContent line 3');
});
