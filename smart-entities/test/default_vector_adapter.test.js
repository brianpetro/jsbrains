import test from 'ava';
import { DefaultEntitiesVectorAdapter } from '../adapters/default.js';

function create_adapter(items = []) {
  return new DefaultEntitiesVectorAdapter({
    filter() {
      return items;
    },
  });
}

test('nearest accepts a typed vector without copying it into a JavaScript array', async (t) => {
  const first = { key: 'first', vec: new Float32Array([1, 0]) };
  const second = { key: 'second', vec: new Float32Array([0, 1]) };
  const adapter = create_adapter([first, second]);
  const query = new Float32Array([1, 0]);

  const results = await adapter.nearest(query, { limit: 2 });

  t.deepEqual(results.map((result) => result.item.key), ['first', 'second']);
  t.is(query.constructor, Float32Array);
});

test('nearest and furthest accept an item whose vec getter returns a typed vector', async (t) => {
  const first = { key: 'first', vec: new Float32Array([1, 0]) };
  const second = { key: 'second', vec: new Float32Array([0, 1]) };
  const adapter = create_adapter([first, second]);
  const query_item = {
    get vec() {
      return new Float32Array([1, 0]);
    },
  };

  const nearest = await adapter.nearest(query_item, { limit: 2 });
  const furthest = await adapter.furthest(query_item, { limit: 2 });

  t.is(nearest[0].item, first);
  t.is(furthest[0].item, second);
});

test('nearest still rejects non-vector inputs', async (t) => {
  const adapter = create_adapter([]);

  await t.throwsAsync(
    () => adapter.nearest({ key: 'not-a-vector' }),
    { message: 'Invalid vector input to nearest()' },
  );
});
