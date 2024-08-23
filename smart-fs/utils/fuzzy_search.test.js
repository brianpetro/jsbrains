import test from 'ava';
import { fuzzy_search } from './fuzzy_search.js';

// fuzzy_search
test('fuzzy_search should return an empty array if the input array is empty', (t) => {
  const arr = [];
  const search_term = 'test';
  const expected = [];
  const result = fuzzy_search(arr, search_term);
  t.deepEqual(result, expected);
});

test('fuzzy_search should return an empty array if no matches are found', (t) => {
  const arr = ['apple', 'banana', 'cherry'];
  const search_term = 'test';
  const expected = [];
  const result = fuzzy_search(arr, search_term);
  t.deepEqual(result, expected);
});

test('fuzzy_search should return an array of matching elements', (t) => {
  const arr = ['apple', 'banana', 'cherry'];
  const search_term = 'a';
  const expected = ['apple', 'banana'];
  const result = fuzzy_search(arr, search_term);
  t.deepEqual(result, expected);
});

test('fuzzy_search should be case-insensitive', (t) => {
  const arr = ['apple', 'banana', 'cherry'];
  const search_term = 'B';
  const expected = ['banana'];
  const result = fuzzy_search(arr, search_term);
  t.deepEqual(result, expected);
});

test('fuzzy_search should return an array sorted by distance in ascending order', (t) => {
  const arr = ['one', 'two', 'three', 'four', 'five'];
  const search_term = 'r';
  const expected = ['three', 'four'];
  const result = fuzzy_search(arr, search_term);
  t.deepEqual(result, expected);
});