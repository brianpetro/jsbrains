/**
 * @file coerce_primitives.test.js
 * Unit tests for coerce_primitives using ava
 */

import test from 'ava';
import { coerce_primitives } from './coerce_primitives.js';

test('returns unchanged value for non-string primitives', t => {
  t.is(coerce_primitives(42), 42);
  t.is(coerce_primitives(true), true);
});

test('coerces numeric strings without leading zeros', t => {
  t.is(coerce_primitives('700'), 700);
  t.is(coerce_primitives('-5'), -5);
  t.is(coerce_primitives('0'), 0);
});

test('coerces float strings', t => {
  t.is(coerce_primitives('0.123'), 0.123);
  t.is(coerce_primitives('-0.5'), -0.5);
  t.is(coerce_primitives('3.14'), 3.14);
});

test('does not coerce strings with leading zeros', t => {
  t.is(coerce_primitives('007'), '007');
  t.is(coerce_primitives('001.23'), '001.23');
});

test('coerces boolean strings', t => {
  t.is(coerce_primitives('true'), true);
  t.is(coerce_primitives('false'), false);
});

test('returns original string when no coercion rule matches', t => {
  t.is(coerce_primitives('hello'), 'hello');
});
