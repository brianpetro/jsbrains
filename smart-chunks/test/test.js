const test = require('ava');
const path = require('path');
const fs = require('fs');
const { SmartMarkdown } = require('../SmartMarkdown');
// get test.md file
const test_md_path = path.join(__dirname, 'test.md');
const test_md = fs.readFileSync(test_md_path, 'utf8');
test('SmartMarkdown.parse returns an Object contains blocks, file_path and log', (t) => {
  const smart_markdown = new SmartMarkdown({embed_input_min_chars: 10});
  const result = smart_markdown.parse({ content: test_md, file_path: test_md_path });
  t.is(typeof result, 'object');
  t.true(Array.isArray(result.blocks));
  t.is(typeof result.blocks[0], 'object');
  t.is(typeof result.file_path, 'string');
  t.true(Array.isArray(result.log));
  t.is(result.blocks[0].path, test_md_path+"#");
  t.is(result.blocks[1].path, test_md_path+"#test 1");
});
// works without file_path
test('SmartMarkdown.parse works without file_path', (t) => {
  const smart_markdown = new SmartMarkdown({embed_input_min_chars: 10});
  const result = smart_markdown.parse({ content: test_md });
  t.is(typeof result, 'object');
  t.true(Array.isArray(result.blocks));
  t.is(typeof result.blocks[0], 'object');
  t.is(typeof result.file_path, 'string');
  t.true(Array.isArray(result.log));
});

// retrieves block by path
test('SmartMarkdown.get_block_by_path retrieves block by path', (t) => {
  const smart_markdown = new SmartMarkdown({embed_input_max_chars: 20});
  const block_content = smart_markdown.get_block_from_path("file://folders/test/test.md#test 1", test_md);
  t.is(block_content, 'lorem ipsum 1');
});
test('SmartMarkdown.get_block_by_path retrieves block by path midway through markdown', (t) => {
  const smart_markdown = new SmartMarkdown({embed_input_min_chars: 10});
  const block_content = smart_markdown.get_block_from_path("file://folders/test/test.md#test 1a", test_md);
  t.is(block_content, 'lorem ipsum 1a');
});
// handles {n} in path
test('SmartMarkdown.get_block_by_path handles {n} in path', (t) => {
  const smart_markdown = new SmartMarkdown({});
  const block_content = smart_markdown.get_block_from_path("file://folders/test/test.md#test 1{1}", test_md);
  t.is(block_content, 'should add bracket to block path for second occurrence of heading');
});
// returns full content if lacks headings in path
test('SmartMarkdown.get_block_by_path returns full content if lacks headings in path', (t) => {
  const smart_markdown = new SmartMarkdown({});
  const block_content = smart_markdown.get_block_from_path("file://folders/test/test.md", test_md);
  t.is(block_content, test_md);
});
// block should contain sub-headings if text length is less than embed_input_max_chars
test('SmartMarkdown.get_block_by_path block should contain sub-headings if text length is less than embed_input_max_chars', (t) => {
  const smart_markdown = new SmartMarkdown({ embed_input_min_chars: 100 });
  const block_content = smart_markdown.get_block_from_path("file://folders/test/test.md#test 1", test_md);
  t.is(block_content, 'lorem ipsum 1\n## test 1a\nlorem ipsum 1a\n## test 1b\nlorem ipsum 1b\n### test 1b1\nlorem ipsum 1b1');
});
// if skip_blocks_with_headings_only prevents blocks with only headings from being returned
test('SmartMarkdown.parse({skip_blocks_with_headings_only})-> prevents blocks with only headings from being returned', (t) => {
  const smart_markdown = new SmartMarkdown({ skip_blocks_with_headings_only: false });
  const { blocks } = smart_markdown.parse({ content: test_md, file_path: "file://folders/test/test.md" });
  t.true(blocks.some(block => block.heading === 'heading only test'));
  const smart_markdown_2 = new SmartMarkdown({ skip_blocks_with_headings_only: true });
  const { blocks: blocks_2 } = smart_markdown_2.parse({ content: test_md, file_path: "file://folders/test/test.md" });
  t.false(blocks_2.some(block => block.heading === 'heading only test'));
});
// parse excalidraw file only returns Text Elements heading
test('SmartMarkdown.parse excalidraw file only returns Text Elements heading', (t) => {
  const smart_markdown = new SmartMarkdown({ embed_input_min_chars: 10 });
  const test_excalidraw_path = path.join(__dirname, 'test.excalidraw.md');
  const test_excalidraw = fs.readFileSync(test_excalidraw_path, 'utf8');
  const { blocks } = smart_markdown.parse({ content: test_excalidraw, file_path: "file://folders/test/test.excalidraw.md" });
  t.is(blocks[0].heading, 'Text Elements');
  t.is(blocks[0].text, 'exclaidraw lorem ipsum');
});

/**
 * TODO
 */
test('SmartMarkdown.parse should return lines array [begin, end] for each block', (t) => {
  const smart_markdown = new SmartMarkdown({ embed_input_min_chars: 10 });
  const { blocks } = smart_markdown.parse({ content: test_md, file_path: "file://folders/test/test.md" });
  t.is(blocks[0].lines[0], 0);
  t.is(blocks[0].lines[1], 0);
  t.is(blocks[1].lines[0], 2);
  t.is(blocks[1].lines[1], 12);
});

// similarly parse should combine headings into a single block if text length is less than embed_input_max_chars
test('SmartMarkdown.parse should combine headings into a single block if text length is less than embed_input_max_chars', (t) => {
  const smart_markdown = new SmartMarkdown({ embed_input_max_chars: 1000, embed_input_min_chars: 10 });
  const { blocks } = smart_markdown.parse({ content: test_md, file_path: "file://folders/test/test.md" });
  t.is(blocks[1].text, 'file: > folders > test > test: test 1:\nlorem ipsum 1\n## test 1a\nlorem ipsum 1a\n## test 1b\nlorem ipsum 1b\n### test 1b1\nlorem ipsum 1b1');
});