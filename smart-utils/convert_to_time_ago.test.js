import test from 'ava';
import { convert_to_time_ago } from './convert_to_time_ago.js';

test('returns just now for current timestamp', t => {
  const out = convert_to_time_ago(Date.now());
  t.is(out, 'just now');
});

test('handles seconds input', t => {
  const ts = Math.floor(Date.now() / 1000) - 60;
  const out = convert_to_time_ago(ts);
  t.is(out, '1 minute ago');
});
