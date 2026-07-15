import test from 'ava';
import { SourceContentAdapter } from './adapters/_adapter.js';
import { SmartSource } from './smart_source.js';

test('import forwards params to the source adapter', async t => {
  const params = { refresh: true };
  let received_params;
  const source = {
    _queue_import: true,
    source_adapter: {
      async import(next_params) {
        received_params = next_params;
      },
    },
    emit_event() {},
    queue_import() {},
  };

  await SmartSource.prototype.import.call(source, params);

  t.is(received_params, params);
  t.false(source._queue_import);
});

test('source adapter filters persisted links by line before resolving paths', t => {
  const resolved_refs = [];
  const item = {
    key: 'Notes/Source.md',
    file_path: 'Notes/Source.md',
    data: {
      outlinks: [
        { target: 'One.md', line: 1 },
        { target: 'Two.md', line: 2 },
        { target: 'Three.md', line: 3 },
      ],
    },
    collection: {
      fs: {
        get_link_target_path(link_ref) {
          resolved_refs.push(link_ref);
          return `Resolved/${link_ref}`;
        },
      },
    },
  };
  const adapter = new SourceContentAdapter(item);

  const outlinks = adapter.get_outlinks([2, 2]);

  t.deepEqual(resolved_refs, ['Two.md']);
  t.deepEqual(outlinks, [{
    target: 'Two.md',
    line: 2,
    key: 'Resolved/Two.md',
    embedded: false,
    source_key: 'Notes/Source.md',
  }]);
});

test('source outlinks getter delegates to the active source adapter', t => {
  const expected = [{ target: 'Delegated.md' }];
  let received_lines;
  const source = {
    source_adapter: {
      get_outlinks(lines = null) {
        received_lines = lines;
        return expected;
      },
    },
  };
  const outlinks_getter = Object.getOwnPropertyDescriptor(SmartSource.prototype, 'outlinks').get;

  t.is(outlinks_getter.call(source), expected);
  t.is(received_lines, null);
  t.false(Object.prototype.hasOwnProperty.call(SmartSource.prototype, 'get_outlinks'));
});
