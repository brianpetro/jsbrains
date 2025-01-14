import test from 'ava';
import { build_context } from './build_context.js';

test('Given items, When building context, Then merges them without excluding content', async (t) => {
  // Items that might contain "excluded" headings or content, but build_context won't remove them
  const items = {
    'path/to/itemA.md': 'Some content\n#Heading\nShould remain even if heading says "excluded"\n#excluded\nStill stays.\n',
    'another/path/itemB.txt': 'Regular content here. #excluded? Still here.'
  };

  const { context, stats } = await build_context({
    items,
    before_context: 'TOP',
    after_context: 'BOTTOM',
    before_item: '<ITEM {{ITEM_PATH}}>',
    after_item: '</ITEM>',
  });

  t.true(context.includes('TOP'), 'should include global before_context');
  t.true(context.includes('BOTTOM'), 'should include global after_context');
  t.true(context.includes('<ITEM path/to/itemA.md>'), 'First item has placeholder replaced');
  t.true(context.includes('</ITEM>'), 'Closes item placeholder');
  t.true(context.includes('#excluded'), 'Excluded heading is still present (build_context no longer strips it)');
  t.is(stats.item_count, 2, 'Correct item count');
  t.is(stats.link_count, 0, 'No links were provided');
  t.true(stats.char_count > 0, 'Has some content');
});

test('Given links, When building context, Then merges them with placeholders replaced', async (t) => {
  const links = {
    'linkedA.md': {from: ['sourceA.md'], content: 'Linked content from A', type: ['INLINK'], depth: [1]},
    'linkedB.md': {from: ['sourceB.md'], content: 'Linked content from B', type: ['INLINK'], depth: [1]},
  };

  const { context, stats } = await build_context({
    links,
    before_link: '[LINK from {{LINK_ITEM_NAME}} to {{LINK_NAME}} ({{LINK_TYPE}})]',
    after_link: '---',
    inlinks: true,
  });

  t.true(context.includes('[LINK from sourceA.md to linkedA.md (INLINK)]'), 'Uses placeholders for link A');
  t.true(context.includes('Linked content from A'), 'Appends link content A');
  t.true(context.includes('[LINK from sourceB.md to linkedB.md (INLINK)]'), 'Uses placeholders for link B');
  t.true(context.includes('Linked content from B'), 'Appends link content B');
  t.is(stats.item_count, 0, 'No items used, only links');
  t.is(stats.link_count, 2, 'Two links processed');
});

test('Given items and links, When building context, Then merges them all', async (t) => {
  const items = {
    'main.md': 'Main content.\n#excluded heading not stripped\nLine after heading.',
  };
  const links = {
    'main.md': {to: ['other.md'], content: 'Other content. Possibly excluded if done externally.', type: ['OUTLINK'], depth: [1]},
  };

  const { context, stats } = await build_context({
    items,
    links,
    before_context: '+++',
    after_context: '---',
  });

  t.true(context.startsWith('+++'), 'Global before context is present');
  t.true(context.includes('Main content.'), 'Item content is included');
  t.true(context.includes('Other content. Possibly excluded'), 'Link content included');
  t.true(context.endsWith('---'), 'Global after context is present');
  t.is(stats.item_count, 1, 'One item used');
  t.is(stats.link_count, 1, 'One link used');
  t.true(stats.char_count > 0, 'Has a final character count');
});
