import test from 'ava';
import {SmartChange} from './smart_change.js';
import {DefaultAdapter} from './adapters/default.js';
import {MarkdownAdapter} from './adapters/markdown.js';
import {ObsidianMarkdownAdapter} from './adapters/obsidian_markdown.js';

test.beforeEach(t => {
  const adapters = {
    default: new DefaultAdapter(),
    markdown: new MarkdownAdapter(),
    obsidian_markdown: new ObsidianMarkdownAdapter(),
  };
  t.context.smart_change = new SmartChange({}, { adapters });
});

test('SmartChange content before with default adapter', t => {
    const smart_change = t.context.smart_change;
    const result = smart_change.before('content', { before: 'old content', after: 'new content' });
    t.is(result, '<<<<<<< HEAD\nold content\n=======\nnew content\n>>>>>>>');
});

test('SmartChange content before with explanation', t => {
    const smart_change = t.context.smart_change;
    const result = smart_change.before('content', { before: 'old content', after: 'new content', explanation: 'This is an explanation' });
    t.is(result, '<<<<<<< HEAD\nold content\n=======\nnew content\n>>>>>>>\n--- Explanation ---\nThis is an explanation\n-------------------\n');
});

test('SmartChange location before with default adapter', t => {
    const smart_change = t.context.smart_change;
    const result = smart_change.before('location', { to_key: 'new_file.md', from_key: 'old_file.md' });
    t.deepEqual(result, {
        to_content: '<<<<<<< HEAD\n[Content moved from: old_file.md]\n=======\n[New content]\n>>>>>>>',
        from_content: '<<<<<<< HEAD\n[Original content]\n=======\n[Content moved to: new_file.md]\n>>>>>>>'
    });
});

test('SmartChange location after with default adapter', t => {
    const smart_change = t.context.smart_change;
    const result = smart_change.after('location', { from_key: 'old_file.md' });
    t.is(result, '<<<<<<< HEAD\n[Original content]\n=======\n[Content moved to: old_file.md]\n>>>>>>>');
});

test('SmartChange with markdown adapter for content change', t => {
    const smart_change = t.context.smart_change;
    const long_content = 'This is a long piece of content that will be truncated in the blockquote but preserved in full before it.';
    const result = smart_change.before('content', { before: long_content, after: 'new content', file_type: 'markdown' });
    t.is(result, `${long_content}

> [!ai_change]- AI Suggested Change
> **Original:** This is a long piece of content... ...but preserved in full before it.
> 
> **Suggested:**
> > new content
`);
});

test('SmartChange with markdown adapter for location change', t => {
    const smart_change = t.context.smart_change;
    const result = smart_change.before('location', { to_key: 'new_file.md', from_key: 'old_file.md', file_type: 'markdown' });
    t.is(result, `
> [!ai_move]- AI Suggested Move
> **From:** old_file.md
> **To:** new_file.md
`);
});

test('SmartChange with markdown adapter for location after', t => {
    const smart_change = t.context.smart_change;
    const result = smart_change.after('location', { from_key: 'old_file.md', to_key: 'new_file.md', file_type: 'markdown' });
    t.is(result, `
> [!ai_move]- Content Moved
> **Moved to:** new_file.md
`);
});

test('SmartChange with obsidian_markdown adapter', t => {
    const smart_change = t.context.smart_change;
    const result = smart_change.before('content', { before: 'old content', after: 'new content', file_type: 'obsidian_markdown' });
    t.is(result, '\n```smart-change\n<<<<<<< ORIGINAL\nold content\n=======\nnew content\n>>>>>>>\n```\n');
});

test('SmartChange uses correct adapter based on file_type', t => {
    const smart_change = t.context.smart_change;
    const markdown_result = smart_change.before('content', { before: 'old', after: 'new', file_type: 'markdown' });
    t.true(markdown_result.includes('[!ai_change]'));
    
    const obsidian_result = smart_change.before('content', { before: 'old', after: 'new', file_type: 'obsidian_markdown' });
    t.true(obsidian_result.includes('```smart-change'));
});

test('SmartChange falls back to default adapter for unknown file_type', t => {
    const smart_change = t.context.smart_change;
    const result = smart_change.before('content', { before: 'old', after: 'new', file_type: 'unknown_type' });
    t.true(result.includes('<<<<<<< HEAD'));
});