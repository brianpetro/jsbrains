import test from 'ava';
import { merge_context_opts } from './merge_context_opts.js';

test('merge_context_opts merges default, local, and input overrides', t => {
  const fake_collection_item = {
    data: {
      context_opts: {
        link_depth: 2,
        inlinks: false,
        templates: {
          '0': { before: 'LOCAL_BEFORE', after: 'LOCAL_AFTER' }
        }
      }
    },
    collection: {
      settings: {
        link_depth: 1,
        inlinks: true,
        excluded_headings: ['Secret'],
        max_len: 100,
        templates: {
          '-1': { before: '[ALL_START]', after: '[ALL_END]' },
          '0': { before: 'PRIMARY-BEFORE', after: 'PRIMARY-AFTER' }
        }
      }
    }
  };

  const input_opts = {
    excluded_headings: ['Overridden'],
    max_len: 999,
    templates: {
      '1': { before: 'SECONDARY-BEFORE', after: 'SECONDARY-AFTER' }
    }
  };

  const result = merge_context_opts(fake_collection_item, input_opts);

  // link_depth => local = 2 (dominates collection=1, no override in input)
  t.is(result.link_depth, 2);
  // inlinks => local = false overrides collection-level true, no override in input
  t.false(result.inlinks);
  // excluded_headings => input = ['Overridden'] overrides local and collection
  t.deepEqual(result.excluded_headings, ['Overridden']);
  // max_len => input = 999 overrides local=undefined and collection=100
  t.is(result.max_len, 999);

  // templates => deep-merged in 3 layers (collection -> local -> input)
  // collection[-1] is kept
  // local[0] overwrote collection[0]
  // input[1] adds secondary
  t.is(result.templates['-1'].before, '[ALL_START]');
  t.is(result.templates['-1'].after, '[ALL_END]');
  t.is(result.templates['0'].before, 'LOCAL_BEFORE');
  t.is(result.templates['0'].after, 'LOCAL_AFTER');
  t.is(result.templates['1'].before, 'SECONDARY-BEFORE');
  t.is(result.templates['1'].after, 'SECONDARY-AFTER');
});

test('merge_context_opts handles empty templates gracefully', t => {
  const fake_collection_item = {
    data: { context_opts: {} },
    collection: { settings: {} }
  };
  const result = merge_context_opts(fake_collection_item, {});
  t.deepEqual(result.templates, {}, 'Should produce empty templates if none provided');
});

test('merge_context_opts merges arrays properly', t => {
  // Show that excluded_headings merges from default/collection if not overridden
  const item = {
    data: { context_opts: { excluded_headings: ['LocalHidden'] } },
    collection: {
      settings: { excluded_headings: ['GlobalSecret'] }
    }
  };
  const result = merge_context_opts(item, {});
  // Should take the local item’s array if provided
  t.deepEqual(result.excluded_headings, ['LocalHidden']);
});

test('merge_context_opts returns zero for max_len if not set anywhere', t => {
  const item = {
    data: { context_opts: {} },
    collection: { settings: {} }
  };
  const merged = merge_context_opts(item, {});
  t.is(merged.max_len, 0, 'Default to 0 if not set');
});
