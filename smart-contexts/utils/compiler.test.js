import test from 'ava';
import { compile_snapshot } from './compiler.js';

/**
 * Minimal context_snapshot for testing
 */
function snapshot_with_items(depth_items_map) {
  // depth_items_map is an object: { 0: { 'fileA.md': 'content' }, 1: { ... }, ... }
  return {
    items: depth_items_map,
    truncated_items: [],
    skipped_items: [],
    total_char_count: 0
  };
}

test('Only item content is truncated, template is fully included or chunk is skipped', async t => {
  const context_snapshot = snapshot_with_items({
    0: {
      'fileA.md': 'AAAAAA', // 6 chars
      'fileB.md': 'BBBBBBBBBB' // 10 chars
    }
  });

  // Suppose template is 5 chars before + 5 chars after
  // max_len = 20 means let's see how it behaves
  const merged_opts = {
    max_len: 20,
    templates: {
      '0': { before: '[BFR]', after: '[AFT]' }
    }
  };

  // chunk for fileA => template = 10 chars total
  // item content = 6 chars => total 16 => fits under 20
  // chunk for fileB => template = 10 + item content 10 => total 20 => exactly fits
  // No partial needed => final output should be "[BFR]AAAAAA[AFT][BFR]BBBBBBBBBB[AFT]"
  const { context, stats } = await compile_snapshot(context_snapshot, merged_opts);
  t.is(stats.skipped_items.length, 0, 'No chunk skipped');
  t.is(stats.truncated_items.length, 0, 'No chunk truncated');
  t.is(stats.final_length, 36, 'Check final length = 36 (two sets of templates + item content)');
  t.is(
    context,
    '[BFR]AAAAAA[AFT][BFR]BBBBBBBBBB[AFT]',
    'Should include both chunk templates fully + item content fully'
  );
});

test('If template does not fit, skip chunk entirely (do not partially cut template)', async t => {
  // We'll have a large template that can't fit
  const context_snapshot = snapshot_with_items({
    0: {
      'fileA.md': 'Hello'
    }
  });

  // We'll set a large template
  // 'before' is 10 chars, 'after' is 10 chars => total 20 chars just for template
  // item content => 5 chars
  // combined = 25 chars
  // but max_len = 19 => so we can't even fit the template
  const merged_opts = {
    max_len: 19,
    templates: {
      '0': { before: 'XXXXXXXXXX', after: 'YYYYYYYYYY' } // each 10 chars
    }
  };

  const { context, stats } = await compile_snapshot(context_snapshot, merged_opts);
  t.deepEqual(stats.skipped_items, ['fileA.md'], 'Should skip the entire chunk');
  t.is(stats.truncated_items.length, 0, 'No truncation, just skip');
  t.is(context, '', 'No output because chunk was skipped');
});

test('Partially truncate item content if template fits but item is too large', async t => {
  const context_snapshot = {
    items: {
      0: { 'bigItem.md': 'ABCDEFGHIJKLMNO' }
    },
    truncated_items: [],
    skipped_items: []
  };
  const merged_opts = {
    max_len: 10,
    templates: {
      '0': { before: '[B]', after: '[A]' }
    }
  };

  const { context, stats } = await compile_snapshot(context_snapshot, merged_opts);
  // Now we expect leftover=4 for the item text => 'ABCD'
  t.deepEqual(stats.skipped_items, []);
  t.deepEqual(stats.truncated_items, ['bigItem.md']);
  t.is(context, '[B]ABCD[A]', 'Truncate item text to 4 leftover chars');
  t.is(stats.final_length, 10, '3 chars + 4 + 3 = 10 total');
});


test('Top-level wrap is all-or-nothing: skip if not enough space', async t => {
  const context_snapshot = snapshot_with_items({
    0: {
      'fileA.md': 'Hello'
    }
  });
  // We'll have a normal chunk template that definitely fits
  const merged_opts = {
    max_len: 16, // let's see how top-level wrap plays out
    templates: {
      '-1': { before: '[TOP]', after: '[BOT]' },
      '0': { before: '<', after: '>' }
    }
  };
  // Let's see total:
  // chunk template: 1 char before + 1 char after = 2
  // item content: 5 => chunk total 7
  // So chunk + content => 7 => that starts us at length=7
  // Then top-level wrap before is 5 chars => "[TOP]"
  // and after is 5 chars => "[BOT]"
  // total for top-level wrap = 10
  // total final would be 7 + 10 = 17 => exceeds 16
  // so we skip top-level wrap entirely.

  const { context, stats } = await compile_snapshot(context_snapshot, merged_opts);
  t.is(context, '<Hello>', 'We never included top-level wrap');
  t.is(stats.final_length, 7);
  t.deepEqual(stats.truncated_items, [], 'No truncation');
  t.deepEqual(stats.skipped_items, [], 'No chunk skipped either');
});

test('If we can fit top-level wrap, include it fully (no partial)', async t => {
  const context_snapshot = snapshot_with_items({
    0: {
      'x.md': '12345'
    }
  });
  // chunk => 1 char template before + 1 after => total 7 for chunk
  // top-level wrap => 4 chars before + 4 after => total 8
  // overall = 15
  // max_len=16 => we can fit it
  const merged_opts = {
    max_len: 16,
    templates: {
      '-1': { before: '<<1', after: '2>>' },
      '0': { before: '[', after: ']' }
    }
  };
  const { context, stats } = await compile_snapshot(context_snapshot, merged_opts);
  // chunk = "[12345]"
  // length=7
  // top-level => '<<1' + chunk + '2>>' => total=7+8=15
  t.is(context, '<<1[12345]2>>');
  t.is(stats.final_length, 15);
  t.deepEqual(stats.skipped_items, []);
  t.deepEqual(stats.truncated_items, []);
});

test('replace_vars should still apply in templates', async t => {
  const context_snapshot = snapshot_with_items({
    0: {
      'some/file.md': 'Doc Content'
    }
  });
  const merged_opts = {
    max_len: 100,
    templates: {
      '0': {
        before: 'FILE: {{ITEM_NAME}}|',
        after: '|END {{ITEM_EXT}}'
      }
    }
  };
  const { context, stats } = await compile_snapshot(context_snapshot, merged_opts);
  t.is(
    stats.final_length,
    context.trim().length,
    'We count length with or without the trailing newline'
  );
  t.true(context.includes('some/file.md') === false, 'Should not show entire path in template unless used');
  t.true(context.includes('file.md'), 'Uses {{ITEM_NAME}} => file.md');
  t.true(context.includes('END md'), 'Uses {{ITEM_EXT}} => md');
  t.true(context.includes('Doc Content'), 'Should show original item content');
});
