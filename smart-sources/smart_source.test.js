import test from 'ava';
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

test('get_outlinks filters persisted links by line before resolving paths', t => {
  const resolved_refs = [];
  const source = {
    key: 'Notes/Source.md',
    file_path: 'Notes/Source.md',
    data: {
      outlinks: [
        { target: 'One.md', line: 1 },
        { target: 'Two.md', line: 2 },
        { target: 'Three.md', line: 3 },
      ],
    },
    fs: {
      get_link_target_path(link_ref) {
        resolved_refs.push(link_ref);
        return `Resolved/${link_ref}`;
      },
    },
  };

  const outlinks = SmartSource.prototype.get_outlinks.call(source, [2, 2]);

  t.deepEqual(resolved_refs, ['Two.md']);
  t.deepEqual(outlinks, [{
    target: 'Two.md',
    line: 2,
    key: 'Resolved/Two.md',
    embedded: false,
    source_key: 'Notes/Source.md',
  }]);
});
