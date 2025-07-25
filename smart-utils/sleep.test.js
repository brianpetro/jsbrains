import test from 'ava';
import { sleep } from './sleep.js';

test('sleep waits roughly the duration', async t => {
  const start = Date.now();
  await sleep(50);
  const delta = Date.now() - start;
  t.true(delta >= 50);
});
