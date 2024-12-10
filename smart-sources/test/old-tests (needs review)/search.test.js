import test from 'ava';
import { load_test_env } from './_env.js';

test.beforeEach(async t => { 
  await load_test_env(t);
});

test('SmartSources search method', async t => {
  const smart_sources = t.context.env.smart_sources;

  // Test case 1: Search with single keyword
  let results = await smart_sources.search({ keywords: ['keywords'] });
  t.is(results.length, 3);
  t.true(results.some(item => item.data.path === 'test/doc1.test'));
  t.true(results.some(item => item.data.path === 'test/doc2.test'));

  // Test case 2: Search with multiple keywords
  results = await smart_sources.search({ keywords: ['project', 'specifications'] });
  t.is(results.length, 2);
  t.is(results[0].data.path, 'projects/project1.test');

  // Test case 3: Search with non-existent keyword
  results = await smart_sources.search({ keywords: ['nonexistent'] });
  t.is(results.length, 0);

  // Test case 4: Search with partial keyword match
  results = await smart_sources.search({ keywords: ['proj'] });
  t.is(results.length, 2);
  t.true(results.some(item => item.data.path === 'projects/project1.test'));
  t.true(results.some(item => item.data.path === 'projects/project2.test'));

  // Test case 5: Search with case-insensitive match
  results = await smart_sources.search({ keywords: ['PROJECT'] });
  t.is(results.length, 2);
  t.true(results.some(item => item.data.path === 'projects/project1.test'));
  t.true(results.some(item => item.data.path === 'projects/project2.test'));

  // Test case 6: Search with empty keywords array
  results = await smart_sources.search({ keywords: [] });
  t.is(results.length, 0);

  // Test case 7: Search without keywords (should warn and return empty array)
  results = await smart_sources.search({});
  t.is(results.length, 0);

  // Test case 8: Search with keywords matching file paths
  results = await smart_sources.search({ keywords: ['doc1'] });
  t.is(results.length, 1);
  t.is(results[0].data.path, 'test/doc1.test');

  // Test case 9: Search with multiple keywords, all must match
  results = await smart_sources.search({ keywords: ['unique', 'content', 'specific'], type: 'all' });
  t.is(results.length, 1);
  t.is(results[0].data.path, 'other/doc3.test');

  // Test case 10: Verify search results are sorted by relevance
  results = await smart_sources.search({ keywords: ['project', 'goals'] });
  t.is(results.length, 2);
  t.is(results[0].data.path, 'projects/project2.test'); // This should be first as it contains both keywords
  t.is(results[1].data.path, 'projects/project1.test');
});