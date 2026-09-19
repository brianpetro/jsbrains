import test from 'ava';
import * as context_items_module from './context_items.js';
import {
  ContextItems,
  normalize_context_item_data,
} from './context_items.js';
import { BlockContextItemAdapter } from './adapters/context-items/block.js';
import { ImageContextItemAdapter } from './adapters/context-items/image.js';
import { PdfContextItemAdapter } from './adapters/context-items/pdf.js';
import { SourceContextItemAdapter } from './adapters/context-items/source.js';

test('normalize_context_item_data creates explicit identity without extension inference', (t) => {
  t.like(normalize_context_item_data('README'), {
    key: 'README',
    kind: 'source',
    source_path: 'README',
  });

  t.like(normalize_context_item_data('archive.md', { folder: true }), {
    key: 'archive.md',
    kind: 'folder',
    source_path: 'archive.md',
  });

  t.like(normalize_context_item_data('explicit-folder', { kind: 'folder' }), {
    key: 'explicit-folder',
    kind: 'folder',
    source_path: 'explicit-folder',
    folder: true,
  });
});

test('normalize_context_item_data splits block identity on the first hash', (t) => {
  t.like(normalize_context_item_data('notes/a.md#Heading#{1}'), {
    key: 'notes/a.md#Heading#{1}',
    kind: 'block',
    source_path: 'notes/a.md',
    subpath: 'Heading#{1}',
  });
});

test('normalize_context_item_data preserves explicit path-shaped block identity', (t) => {
  t.deepEqual(normalize_context_item_data('notes/a.md#Heading', {
    kind: 'block',
    source_path: 'notes/a.md',
    subpath: 'Heading',
  }), {
    key: 'notes/a.md#Heading',
    kind: 'block',
    source_path: 'notes/a.md',
    subpath: 'Heading',
  });
});

test('normalize_context_item_data removes only the synthetic external prefix', (t) => {
  t.like(normalize_context_item_data('external:../../repo/README'), {
    key: 'external:../../repo/README',
    kind: 'source',
    source_path: '../../repo/README',
    is_external: true,
  });
});

test('normalize_context_item_data keeps named context identity separate from paths', (t) => {
  t.deepEqual(normalize_context_item_data('Shared', { kind: 'named_context' }), {
    key: 'Shared',
    kind: 'named_context',
    named_context: true,
  });
});

test('normalize_context_item_data is idempotent', (t) => {
  const normalized_data = normalize_context_item_data(
    'external:../../repo/notes/a.md#Heading#{1}',
    { section: 'Current' },
  );

  t.deepEqual(
    normalize_context_item_data(normalized_data.key, normalized_data),
    normalized_data,
  );
});

test('core adapter dispatch uses normalized structural identity', (t) => {
  const adapters = [
    BlockContextItemAdapter,
    ImageContextItemAdapter,
    PdfContextItemAdapter,
    SourceContextItemAdapter,
  ].sort((left, right) => (left.order || 0) - (right.order || 0));
  const cases = [
    ['README', {}, SourceContextItemAdapter],
    ['assets/image.png', {}, ImageContextItemAdapter],
    ['manual.pdf', {}, PdfContextItemAdapter],
    ['manual.pdf#Heading', {}, BlockContextItemAdapter],
    ['archive.md', { folder: true }, null],
    ['Shared', { named_context: true }, null],
    ['selection:example', { kind: 'text' }, null],
  ];

  cases.forEach(([key, item_data, expected_adapter]) => {
    const normalized_data = normalize_context_item_data(key, item_data);
    const selected_adapter = adapters.find((adapter) => {
      return adapter.detect(normalized_data.key, normalized_data);
    }) || null;

    t.is(selected_adapter, expected_adapter, key);
  });
});

test('load_item_from_data routes legacy named contexts through normalized kind', (t) => {
  const calls = [];
  const scope = {
    load_named_context_items(key, item_data, params) {
      calls.push({ key, item_data, params });
      return [];
    },
    new_item() {
      t.fail('named context should not instantiate a context item');
    },
  };

  const result = ContextItems.prototype.load_item_from_data.call(
    scope,
    'Shared',
    { named_context: true },
    { codeblock_source_key: 'Note.md#Context' },
  );

  t.deepEqual(result, []);
  t.is(calls.length, 1);
  t.like(calls[0].item_data, {
    key: 'Shared',
    kind: 'named_context',
    named_context: true,
  });
});


test('Context media capability follows image/PDF adapters, not source media classification', (t) => {
  for (const key of ['photo.png', 'photo.JPG', 'photo.webp', 'photo.gif', 'icon.ico', 'scan.PDF']) {
    t.true(context_items_module.is_supported_context_media(key), key);
  }
  for (const key of ['movie.mp4', 'audio.mp3', 'drawing.excalidraw.md', 'drawing.excalidraw', 'note.md']) {
    t.false(context_items_module.is_supported_context_media(key), key);
  }
  t.false(context_items_module.is_supported_context_media('scan.pdf#Heading'));
  t.false(context_items_module.is_supported_context_media('photos.png', { folder: true }));
  t.false(context_items_module.is_supported_context_media('scan.pdf', { named_context: true }));
  t.false(context_items_module.is_supported_context_media('external:../photo.png'));
  t.false(context_items_module.is_supported_context_media('selection:photo.png', { kind: 'text' }));
});

test('MP4 is not dispatched to the Context image adapter', (t) => {
  const data = normalize_context_item_data('movie.MP4');
  t.false(ImageContextItemAdapter.detect(data.key, data));
  t.false(PdfContextItemAdapter.detect(data.key, data));
  t.true(SourceContextItemAdapter.detect(data.key, data));
});


for (const is_env_excluded of [false, true]) {
  test(`hydration retains unavailable items and identifies environment exclusion: ${is_env_excluded}`, (t) => {
    const key = 'Notes/Plan.md';
    const warnings = [];
    const loaded_item = { key, exists: false, is_env_excluded, size: 0, mtime: null };
    const context_items_data = { [key]: { key } };
    const scope = {
      items: {},
      smart_context: {
        data: {},
        emit_missing_context_item_event(...args) { warnings.push(args); },
      },
      load_item_from_data() { return loaded_item; },
    };

    const loaded = ContextItems.prototype.load_from_data.call(scope, context_items_data);

    t.deepEqual(loaded, [loaded_item]);
    t.truthy(context_items_data[key]);
    t.is(warnings.length, 1);
    t.is(warnings[0][0], key);
    if (is_env_excluded) {
      t.is(warnings[0][1], 'Context item is excluded by Smart Environment settings');
      t.regex(warnings[0][2].message, /Settings > Smart Environment > Sources/);
      t.regex(warnings[0][2].message, /reopen this context/);
      t.is(warnings[0][2].btn_text, 'Remove from context');
    } else {
      t.is(warnings[0][1], 'Context item does not exist');
      t.deepEqual(warnings[0][2] || {}, {});
    }
  });
}
