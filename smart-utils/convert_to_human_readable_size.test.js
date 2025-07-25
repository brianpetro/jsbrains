import test from 'ava';
import { convert_to_human_readable_size } from './convert_to_human_readable_size.js';

test('formats bytes to KB', t => {
  t.is(convert_to_human_readable_size(1536), '1.5 KB');
});

test('formats bytes to MB', t => {
  t.is(convert_to_human_readable_size(2500000), '2.5 MB');
});

test('returns bytes when small', t => {
  t.is(convert_to_human_readable_size(512), '512 bytes');
});
