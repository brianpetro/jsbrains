import test from 'ava';
import { SourceContextItemAdapter } from './source.js';

const create_adapter = (source) => {
  return new SourceContextItemAdapter({
    key: 'Notes/Empty.md',
    env: {
      smart_sources: {
        get() {
          return source;
        },
      },
    },
  });
};

test('source adapter preserves existing empty source text', async (t) => {
  let received_opts;
  const adapter = create_adapter({
    is_gone: false,
    async read(opts) {
      received_opts = opts;
      return '';
    },
  });

  t.is(await adapter.get_text(), '');
  t.deepEqual(received_opts, { throw_on_error: true });
});

test('source adapter preserves missing and gone source fallback', async (t) => {
  t.is(await create_adapter(null).get_text(), 'MISSING SOURCE');

  let read_calls = 0;
  const gone_adapter = create_adapter({
    is_gone: true,
    async read() {
      read_calls += 1;
      return 'stale content';
    },
  });

  t.is(await gone_adapter.get_text(), 'MISSING SOURCE');
  t.is(read_calls, 0);
});

test('source adapter maps nullish strict read results to read error', async (t) => {
  for (const missing_value of [null, undefined]) {
    const adapter = create_adapter({
      is_gone: false,
      async read() {
        return missing_value;
      },
    });

    t.is(await adapter.get_text(), 'ERROR READING SOURCE');
  }

  const content_adapter = create_adapter({
    is_gone: false,
    async read() {
      return '# Existing';
    },
  });

  t.is(await content_adapter.get_text(), '# Existing');
});

test('source adapter maps strict read failures to read error', async (t) => {
  let received_opts;
  const adapter = create_adapter({
    is_gone: false,
    async read(opts) {
      received_opts = opts;
      throw new Error('read failed');
    },
  });

  t.is(await adapter.get_text(), 'ERROR READING SOURCE');
  t.deepEqual(received_opts, { throw_on_error: true });
});

test('strict text output propagates source failures without changing legacy diagnostics', async t => {
  await t.throwsAsync(() => create_adapter(null).get_text({ throw_on_error: true }), { message: /Source not found/ });
  const failed = create_adapter({ read: async () => { throw new Error('Read failed'); } });
  t.is(await failed.get_text(), 'ERROR READING SOURCE');
  await t.throwsAsync(() => failed.get_text({ throw_on_error: true }), { message: 'Read failed' });
  await t.throwsAsync(() => create_adapter({ read: async () => null }).get_text({ throw_on_error: true }), { message: /Unable to read source/ });
  t.is(await create_adapter({ read: async () => '' }).get_text({ throw_on_error: true }), '');
});
