import test from 'ava';
import { murmur_hash_32, create_hash, murmur_hash_32_alphanumeric } from './create_hash.js';

/**
 * murmur_hash_32
 */
test('murmur_hash_32: basic consistency check', (t) => {
  const inputA = 'Hello World';
  const hashA = murmur_hash_32(inputA, 0);

  const inputB = 'Hello World';
  const hashB = murmur_hash_32(inputB, 0);

  // The same input should produce the same output
  t.is(hashA, hashB);
});

test('murmur_hash_32: different seeds produce different results', (t) => {
  const input = 'Hello World';
  const hashA = murmur_hash_32(input, 0);
  const hashB = murmur_hash_32(input, 123);

  // Using different seeds on the same input usually produces different results
  t.not(hashA, hashB);
});

test('murmur_hash_32: different inputs produce different results', (t) => {
  const inputA = 'Hello World';
  const inputB = 'Hello Universe';
  const hashA = murmur_hash_32(inputA, 0);
  const hashB = murmur_hash_32(inputB, 0);

  // Different input strings should produce different hash outputs
  t.not(hashA, hashB);
});
// detect change in capitalization
test('murmur_hash_32: detect change in capitalization', (t) => {
  const inputA = 'Hello World';
  const hashA = murmur_hash_32(inputA, 0);

  const inputB = 'hello world';
  const hashB = murmur_hash_32(inputB, 0);

  t.not(hashA, hashB);
});

/**
 * murmur_hash_32_alphanumeric
 */
test('murmur_hash_32_alphanumeric: basic consistency check', (t) => {
  const inputA = 'Hello World';
  const hashA = murmur_hash_32_alphanumeric(inputA, 0);
  const hashB = murmur_hash_32_alphanumeric(inputA, 0);
  t.is(hashA, hashB);
});

test('murmur_hash_32_alphanumeric: different seeds produce different results', (t) => {
  const input = 'Hello World';
  const hashA = murmur_hash_32_alphanumeric(input, 0);
  const hashB = murmur_hash_32_alphanumeric(input, 123);
  t.not(hashA, hashB);
});

test('murmur_hash_32_alphanumeric: different inputs produce different results', (t) => {
  const inputA = 'Hello World';
  const inputB = 'Hello Universe';
  const hashA = murmur_hash_32_alphanumeric(inputA, 0);
  const hashB = murmur_hash_32_alphanumeric(inputB, 0);
  t.not(hashA, hashB);
});
// detect change in capitalization
test('murmur_hash_32_alphanumeric: detect change in capitalization', (t) => {
  const inputA = 'Hello World';
  const hashA = murmur_hash_32_alphanumeric(inputA, 0);

  const inputB = 'hello world';
  const hashB = murmur_hash_32_alphanumeric(inputB, 0);

  t.not(hashA, hashB);
});


/**
 * create_hash
 */
test('create_hash: basic consistency check', async (t) => {
  const inputA = 'Hello World';
  const hashA = await create_hash(inputA);

  const inputB = 'Hello World';
  const hashB = await create_hash(inputB);

  t.is(hashA, hashB);
});

test('create_hash: different inputs produce different results', async (t) => {
  const inputA = 'Hello World';
  const inputB = 'Hello Universe';
  const hashA = await create_hash(inputA);
  const hashB = await create_hash(inputB);

  t.not(hashA, hashB);
});
