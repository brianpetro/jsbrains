import test from 'ava';
import {
  SmartContext,
  migrate_legacy_context_item_exclusions,
} from './smart_context.js';

function create_env() {
  const smart_contexts = {
    item_class_name: 'SmartContext',
    queue_save_calls: 0,
    queue_save() {
      this.queue_save_calls += 1;
    },
    emit_event() {},
  };
  const env = {
    smart_contexts,
    config: {
      actions: {},
    },
    opts: {
      items: {},
    },
    create_env_getter(target) {
      target.env = this;
    },
  };
  return env;
}

test('migrate_legacy_context_item_exclusions moves exact source, folder, block, and external rows', (t) => {
  const data = {
    context_items: {
      'notes/a.md': {
        key: 'notes/a.md',
        exclude: true,
        d: 2,
      },
      notes: {
        key: 'notes',
        folder: true,
        exclude: true,
      },
      'notes/a.md#Heading': {
        key: 'notes/a.md#Heading',
        exclude: true,
      },
      'external:../../cache/a.md': {
        key: 'external:../../cache/a.md',
        exclude: true,
      },
    },
  };

  t.deepEqual(migrate_legacy_context_item_exclusions(data), [
    'notes/a.md',
    'notes',
    'notes/a.md#Heading',
    'external:../../cache/a.md',
  ]);
  t.deepEqual(data.context_items, {});
  t.like(data.exclusions['notes/a.md'], {
    key: 'notes/a.md',
    kind: 'source',
    source_path: 'notes/a.md',
    exclude: true,
    d: 2,
  });
  t.like(data.exclusions.notes, {
    key: 'notes',
    kind: 'folder',
    source_path: 'notes',
    folder: true,
    exclude: true,
  });
  t.like(data.exclusions['notes/a.md#Heading'], {
    key: 'notes/a.md#Heading',
    kind: 'block',
    source_path: 'notes/a.md',
    subpath: 'Heading',
    exclude: true,
  });
  t.like(data.exclusions['external:../../cache/a.md'], {
    key: 'external:../../cache/a.md',
    kind: 'source',
    source_path: '../../cache/a.md',
    is_external: true,
    exclude: true,
  });
});

test('migrate_legacy_context_item_exclusions preserves legacy glob intent without broadening explicit identity', (t) => {
  const data = {
    context_items: {
      '**/*.test.js': {
        exclude: true,
      },
      '*.draft.js': {
        key: '*.draft.js',
        glob: true,
        kind: 'source',
        source_path: '*.draft.js',
        exclude: true,
      },
      '[draft].md': {
        key: '[draft].md',
        exclude: true,
      },
      'file?.md': {
        key: 'file?.md',
        exclude: true,
      },
    },
  };

  migrate_legacy_context_item_exclusions(data);

  t.deepEqual(data.exclusions['**/*.test.js'], {
    key: '**/*.test.js',
    exclude: true,
    glob: true,
  });
  t.deepEqual(data.exclusions['*.draft.js'], {
    key: '*.draft.js',
    exclude: true,
    glob: true,
  });
  t.like(data.exclusions['[draft].md'], {
    key: '[draft].md',
    kind: 'source',
    source_path: '[draft].md',
    exclude: true,
  });
  t.false(data.exclusions['[draft].md'].glob === true);
  t.like(data.exclusions['file?.md'], {
    key: 'file?.md',
    kind: 'source',
    source_path: 'file?.md',
    exclude: true,
  });
  t.false(data.exclusions['file?.md'].glob === true);
});

test('migrate_legacy_context_item_exclusions keeps existing durable exclusions authoritative', (t) => {
  const existing_exclusion = {
    key: 'notes/a.md',
    kind: 'folder',
    folder: true,
    custom: true,
    exclude: true,
  };
  const data = {
    context_items: {
      'notes/a.md': {
        key: 'notes/a.md',
        exclude: true,
      },
    },
    exclusions: {
      'notes/a.md': existing_exclusion,
    },
  };

  migrate_legacy_context_item_exclusions(data);

  t.false('notes/a.md' in data.context_items);
  t.is(data.exclusions['notes/a.md'], existing_exclusion);
});

test('migrate_legacy_context_item_exclusions strips false markers and drops disabled named-context or empty rows', (t) => {
  const included_item = {
    key: 'notes/a.md',
    exclude: false,
  };
  const data = {
    context_items: {
      'notes/a.md': included_item,
      Shared: {
        key: 'Shared',
        named_context: true,
        exclude: true,
      },
      '': {
        key: '',
        exclude: true,
      },
    },
  };

  t.deepEqual(migrate_legacy_context_item_exclusions(data), [
    'notes/a.md',
    'Shared',
    '',
  ]);
  t.is(data.context_items['notes/a.md'], included_item);
  t.false(Object.prototype.hasOwnProperty.call(included_item, 'exclude'));
  t.false('Shared' in data.context_items);
  t.false('' in data.context_items);
  t.deepEqual(data.exclusions || {}, {});
});

test('migrate_legacy_context_item_exclusions is idempotent', (t) => {
  const data = {
    context_items: {
      'notes/a.md': {
        key: 'notes/a.md',
        exclude: true,
      },
    },
  };

  t.deepEqual(migrate_legacy_context_item_exclusions(data), ['notes/a.md']);
  const migrated_data = JSON.parse(JSON.stringify(data));

  t.deepEqual(migrate_legacy_context_item_exclusions(data), []);
  t.deepEqual(data, migrated_data);
});

test('SmartContext construction and init migrate legacy rows and queue persistence', (t) => {
  const env = create_env();
  const ctx = new SmartContext(env, {
    key: 'Current',
    context_items: {
      'notes/a.md': {
        key: 'notes/a.md',
        exclude: true,
      },
    },
  });

  t.false('notes/a.md' in ctx.data.context_items);
  t.true('notes/a.md' in ctx.data.exclusions);
  t.true(ctx._queue_save);
  t.is(env.smart_contexts.queue_save_calls, 1);

  ctx.data.context_items['notes/b.md'] = {
    key: 'notes/b.md',
    exclude: true,
  };
  ctx._queue_save = false;
  ctx.init();

  t.false('notes/b.md' in ctx.data.context_items);
  t.true('notes/b.md' in ctx.data.exclusions);
  t.true(ctx._queue_save);
  t.is(env.smart_contexts.queue_save_calls, 2);
});

test('SmartContext add_item never persists legacy exclusion metadata', (t) => {
  const env = create_env();
  const ctx = new SmartContext(env, {
    key: 'Current',
    context_items: {},
  });

  ctx.add_item({
    key: 'notes/a.md',
    exclude: true,
  }, {
    emit_updated: false,
  });

  t.true('notes/a.md' in ctx.data.context_items);
  t.false(Object.prototype.hasOwnProperty.call(
    ctx.data.context_items['notes/a.md'],
    'exclude',
  ));
});

test('SmartContext removal deletes grouped rows instead of writing legacy exclusions', (t) => {
  const env = create_env();
  const ctx = new SmartContext(env, {
    key: 'Current',
    context_items: {
      notes: {
        key: 'notes',
        folder: true,
      },
      'notes/a.md': {
        key: 'notes/a.md',
        from_named_context: 'Shared',
      },
    },
  });

  ctx.remove_items(['notes', 'notes/a.md'], {
    emit_updated: false,
  });

  t.deepEqual(ctx.data.context_items, {});
  t.deepEqual(ctx.data.exclusions, {});
});

test('SmartContext counts and clears included items and durable exclusions separately', (t) => {
  const env = create_env();
  const ctx = new SmartContext(env, {
    key: 'Current',
    context_items: {
      'notes/a.md': {
        key: 'notes/a.md',
      },
    },
    exclusions: {
      'notes/b.md': {
        key: 'notes/b.md',
        exclude: true,
      },
    },
  });
  ctx.emit_event = () => {};

  t.deepEqual(ctx.context_item_keys, ['notes/a.md']);
  t.deepEqual(ctx.excluded_context_item_keys, ['notes/b.md']);
  t.is(ctx.item_count, 1);
  t.is(ctx.excluded_item_count, 1);
  t.true(ctx.has_context_items);
  t.true(ctx.has_excluded_context_items);

  ctx.clear_all();

  t.deepEqual(ctx.data.context_items, {});
  t.deepEqual(ctx.data.exclusions, {});
});
