import test from 'ava';
import { ContextItem } from './context_item.js';
import { normalize_context_item_data } from './context_items.js';
import { SourceContextItemAdapter } from './adapters/context-items/source.js';
import { BlockContextItemAdapter } from './adapters/context-items/block.js';
import { ImageContextItemAdapter } from './adapters/context-items/image.js';
import { PdfContextItemAdapter } from './adapters/context-items/pdf.js';

for (const [key, adapter_class] of [
  ['Notes/Plan.md', SourceContextItemAdapter],
  ['Notes/Plan.md#Decisions', BlockContextItemAdapter],
  ['Attachments/Plan.png', ImageContextItemAdapter],
  ['Attachments/Plan.pdf', PdfContextItemAdapter],
]) {
  test(`environment exclusions keep ${key} unavailable without calling its existence adapter`, (t) => {
    let excluded = false;
    let existence_checks = 0;
    const checked_paths = [];
    const source = { is_gone: false };
    const item = Object.assign(Object.create(ContextItem.prototype), {
      data: normalize_context_item_data(key),
      env: {
        smart_sources: {
          get: () => source,
          fs: {
            is_excluded(path) {
              checked_paths.push(path);
              return excluded;
            },
            exists_sync() {
              existence_checks += 1;
              if (excluded) throw new Error('Path is excluded');
              return true;
            },
          },
        },
        smart_blocks: { get: () => source },
      },
    });
    item._context_type_adapter = new adapter_class(item);
    const original_data = { ...item.data };

    t.true(item.exists);
    const initial_existence_checks = existence_checks;
    excluded = true;
    t.true(item.is_env_excluded);
    t.false(item.exists);
    t.is(existence_checks, initial_existence_checks);
    t.true(checked_paths.every((path) => path === item.data.source_path));

    excluded = false;
    t.false(item.is_env_excluded);
    t.true(item.exists);
    t.deepEqual(item.data, original_data);
  });
}

test('a genuinely missing source remains missing after an environment exclusion is removed', (t) => {
  let excluded = true;
  const item = Object.assign(Object.create(ContextItem.prototype), {
    data: normalize_context_item_data('missing.md'),
    env: {
      smart_sources: {
        get: () => null,
        fs: { is_excluded: () => excluded },
      },
    },
  });
  item._context_type_adapter = new SourceContextItemAdapter(item);

  t.true(item.is_env_excluded);
  t.false(item.exists);
  excluded = false;
  t.false(item.is_env_excluded);
  t.false(item.exists);
});

test('external and inline text items do not inherit vault environment exclusions', (t) => {
  for (const data of [
    normalize_context_item_data('external:../Notes/Plan.md'),
    normalize_context_item_data('selection:plan', { kind: 'text', content: 'Selected text' }),
  ]) {
    const item = Object.assign(Object.create(ContextItem.prototype), {
      data,
      env: {
        smart_sources: {
          fs: { is_excluded() { t.fail('Non-vault items must not check vault exclusions'); } },
        },
      },
      _context_type_adapter: { exists: true },
    });
    t.false(item.is_env_excluded);
    t.true(item.exists);
  }
});
