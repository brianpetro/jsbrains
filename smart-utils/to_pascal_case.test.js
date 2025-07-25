import test from 'ava';
import { to_pascal_case } from './to_pascal_case.js';

test('to_pascal_case converts hyphenated words', t => {
  t.is(to_pascal_case('my-file-name'), 'MyFileName');
});

test('to_pascal_case converts camelCase', t => {
  t.is(to_pascal_case('myFileName'), 'MyFileName');
});
