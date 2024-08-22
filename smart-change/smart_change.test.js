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
test('SmartChange location before with default adapter', t => {
    const smart_change = t.context.smart_change;
    const result = smart_change.before('location', { from_key: 'old_file.md', after: 'new content' });
    t.is(result, '<<<<<<< MOVED_FROM\nold_file.md\n=======\nnew content\n>>>>>>>');
});

test('SmartChange location after with default adapter', t => {
    const smart_change = t.context.smart_change;
    const result = smart_change.after('location', { to_key: 'new_file.md', before: 'original content' });
    t.is(result, '<<<<<<< HEAD\noriginal content\n=======\nnew_file.md\n>>>>>>> MOVED_TO\noriginal content');
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

test('SmartChange uses correct adapter based on file_type', t => {
    const smart_change = t.context.smart_change;
    const markdown_result = smart_change.before('content', { before: 'old', after: 'new', file_type: 'markdown' });
    t.true(markdown_result.includes('[!ai_change]'));
});

test('SmartChange falls back to default adapter for unknown file_type', t => {
    const smart_change = t.context.smart_change;
    const result = smart_change.before('content', { before: 'old', after: 'new', file_type: 'unknown_type' });
    t.true(result.includes('<<<<<<< HEAD'));
});

test('SmartChange unwrap returns full content for before and after', t => {
    const smart_change = t.context.smart_change;
    const original_content = `
    # Heading 1
    Some content here.

    <<<<<<< HEAD
    ## Original Heading 2
    Original subheading content.
    =======
    ## New Heading 2
    New subheading content.
    >>>>>>>

    # Heading 3
    More content here.
    `.split("\n").map(line => line.trim()).join("\n").trim();

    const expected_before = `
    # Heading 1
    Some content here.

    ## Original Heading 2
    Original subheading content.

    # Heading 3
    More content here.
    `.split("\n").map(line => line.trim()).join("\n").trim();

    const expected_after = `
    # Heading 1
    Some content here.

    ## New Heading 2
    New subheading content.

    # Heading 3
    More content here.
    `.split("\n").map(line => line.trim()).join("\n").trim();

    const result = smart_change.unwrap(original_content, { file_type: 'default' });
    
    t.is(result.before, expected_before, 'Before content should contain full content with original state');
    t.is(result.after, expected_after, 'After content should contain full content with new state');
});

test('SmartChange unwrap handles multiple change blocks', t => {
    const smart_change = t.context.smart_change;
    const original_content = `
    # Heading 1

    <<<<<<< HEAD
    Original content 1
    =======
    New content 1
    >>>>>>>

    Some unchanged content

    <<<<<<< HEAD
    Original content 2
    =======
    New content 2
    >>>>>>>

    # Heading 2
    `.split("\n").map(line => line.trim()).join("\n").trim();

    const expected_before = `
    # Heading 1

    Original content 1

    Some unchanged content

    Original content 2

    # Heading 2
    `.split("\n").map(line => line.trim()).join("\n").trim();

    const expected_after = `
    # Heading 1

    New content 1

    Some unchanged content

    New content 2

    # Heading 2
    `.split("\n").map(line => line.trim()).join("\n").trim();

    const result = smart_change.unwrap(original_content, { file_type: 'default' });
    
    t.is(result.before, expected_before, 'Before content should contain full content with all original states');
    t.is(result.after, expected_after, 'After content should contain full content with all new states');
});

test('SmartChange unwrap handles location changes', t => {
    const smart_change = t.context.smart_change;
    const original_content = `
    # Original File

    Some content here.

    <<<<<<< MOVED_FROM
    old_file.md
    =======
    This content was moved from old_file.md
    >>>>>>>

    More content here.
    `.split("\n").map(line => line.trim()).join("\n").trim();

    const expected_before = `
    # Original File

    Some content here.


    More content here.
    `.split("\n").map(line => line.trim()).join("\n").trim();

    const expected_after = `
    # Original File

    Some content here.

    This content was moved from old_file.md

    More content here.
    `.split("\n").map(line => line.trim()).join("\n").trim();

    const result = smart_change.unwrap(original_content, { file_type: 'default' });
    
    t.is(result.before, expected_before, 'Before content should not include moved content');
    t.is(result.after, expected_after, 'After content should include moved content');
});

test('ObsidianMarkdownAdapter wrap handles content changes', t => {
    const smart_change = t.context.smart_change;
    const result = smart_change.wrap('content', { 
        before: 'old content', 
        after: 'new content', 
        adapter: 'obsidian_markdown' 
    });
    t.is(result, '\n```smart-change\n<<<<<<< ORIGINAL\nold content\n=======\nnew content\n>>>>>>>\n```\n');
});

test('ObsidianMarkdownAdapter wrap handles location changes', t => {
    const smart_change = t.context.smart_change;
    const result = smart_change.wrap('location', { 
        from_key: 'old_file.md', 
        after: 'new content', 
        file_type: 'obsidian_markdown' 
    });
    t.is(result, '\n```smart-change\n<<<<<<< MOVED_FROM\nold_file.md\n=======\nnew content\n>>>>>>>\n```\n');
});

test('ObsidianMarkdownAdapter unwrap handles single change block', t => {
    const smart_change = t.context.smart_change;
    const content = '\n```smart-change\n<<<<<<< ORIGINAL\nold content\n=======\nnew content\n>>>>>>>\n```\n';
    const result = smart_change.unwrap(content, { file_type: 'obsidian_markdown' });
    t.is(result.before, 'old content');
    t.is(result.after, 'new content');
});

test('ObsidianMarkdownAdapter unwrap handles multiple change blocks', t => {
    const smart_change = t.context.smart_change;
    const content = `
    # Heading

    \`\`\`smart-change
    <<<<<<< ORIGINAL
    old content 1
    =======
    new content 1
    >>>>>>>
    \`\`\`

    Some unchanged content

    \`\`\`smart-change
    <<<<<<< ORIGINAL
    old content 2
    =======
    new content 2
    >>>>>>>
    \`\`\`
    `.split("\n").map(line => line.trim()).join("\n").trim();
    const result = smart_change.unwrap(content, { file_type: 'obsidian_markdown' });
    t.is(result.before, '# Heading\n\nold content 1\n\nSome unchanged content\n\nold content 2');
    t.is(result.after, '# Heading\n\nnew content 1\n\nSome unchanged content\n\nnew content 2');
});

test('ObsidianMarkdownAdapter unwrap handles nested code blocks', t => {
    const smart_change = t.context.smart_change;
    const content = `
    \`\`\`smart-change
    <<<<<<< ORIGINAL
    \\\`\\\`\\\`python
    def old_function():
    return "old"
    \\\`\\\`\\\`
    =======
    \\\`\\\`\\\`python
    def new_function():
    return "new"
    \\\`\\\`\\\`
    >>>>>>>
    \`\`\`
    `.split("\n").map(line => line.trim()).join("\n").trim();
    const result = smart_change.unwrap(content, { file_type: 'obsidian_markdown' });
    t.is(result.before, '```python\ndef old_function():\nreturn "old"\n```');
    t.is(result.after, '```python\ndef new_function():\nreturn "new"\n```');
});