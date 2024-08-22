import test from 'ava';
import { load_test_env } from './_env.js';
test.beforeEach(async t => { await load_test_env(t); });

test.serial('SmartSources create', async t => {
  const env = t.context.env;
  await env.smart_sources.create('test.md', 'test');
  t.is(await env.fs.read('test.md'), 'test', 'Content should exist at test.md');
});

test.serial('SmartBlocks create', async t => {
  const env = t.context.env;
  const block = await env.smart_blocks.create('test.md#h1', 'test');
  t.is(await env.fs.read('test.md'), '# h1\ntest', 'Content should exist at test.md');
  t.is(block.key, 'test.md#h1', 'Block key should be test.md#h1');
});

test.serial('SmartBlocks create 2', async t => {
  const env = t.context.env;
  const initial_content = `## Heading 2
Some content`;
  const block = await env.smart_blocks.create('test.md#h1#Heading 2', initial_content);
  t.is(block.key, 'test.md#h1#Heading 2', 'Block key should be test.md#h1#Heading 2');
  t.is(await env.fs.read('test.md'), '# h1\n## Heading 2\nSome content', 'Content should exist at test.md');
});

test.serial('SmartBlocks create should accept blank initial content', async t => {
  const env = t.context.env;
  const block = await env.smart_blocks.create('test.md#h1', '');
  t.is(block?.key, 'test.md#h1', 'Block key should be test.md#h1');
  t.is(await env.fs.read('test.md'), '# h1\n-', 'Content should exist at test.md');
});