const test = require('ava');

// Import the function to be tested
const {sequential_async_processor} = require('./Collection.js');

// Define some sample functions to be used in the tests
const addOne = async (value) => value + 1;
const multiplyByTwo = async (value) => value * 2;

test('sequential_async_processor should process functions sequentially and return the final value', async (t) => {
  const funcs = [addOne, multiplyByTwo];
  const initial_value = 2;
  const expected = 6;

  const result = await sequential_async_processor(funcs, initial_value);
  t.is(result, expected);
});

test('sequential_async_processor should throw an error if any function throws an error', async (t) => {
  const errorFunc = async () => {
    throw new Error('Test error');
  };

  const funcs = [addOne, errorFunc, multiplyByTwo];
  const initial_value = 2;

  await t.throwsAsync(async () => {
    await sequential_async_processor(funcs, initial_value);
  });
});

test('sequential_async_processor should handle options correctly', async (t) => {
  const addWithOption = async (value, opts) => value + opts.increment;

  const funcs = [addOne, addWithOption];
  const initial_value = 2;
  const opts = { increment: 5 };
  const expected = 8;

  const result = await sequential_async_processor(funcs, initial_value, opts);
  t.is(result, expected);
});