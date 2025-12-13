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

test('describes future timestamps in milliseconds', t => {
  const now = Date.now();
  const original_now = Date.now;

  try {
    Date.now = () => now;
    const future = now + 90 * 1000;
    const out = convert_to_time_ago(future);

    t.is(out, 'in 1 minute');
  } finally {
    Date.now = original_now;
  }
});

test('describes future timestamps in seconds', t => {
  const now_in_seconds = Math.floor(Date.now() / 1000);
  const original_now = Date.now;

  try {
    Date.now = () => now_in_seconds * 1000;
    const future = now_in_seconds + 3600;
    const out = convert_to_time_ago(future);

    t.is(out, 'in 1 hour');
  } finally {
    Date.now = original_now;
  }
});
