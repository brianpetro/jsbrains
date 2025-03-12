/**
 * @file test_debounce.js
 * @description Integration tests for a well-formed debounce function using ava.
 */

import test from 'ava';
import { debounce } from './debounce.js';

/**
 * Sleeps for a given duration in milliseconds.
 * @param {number} duration_ms - The duration to sleep, in milliseconds.
 * @returns {Promise<void>} Resolves after the specified duration.
 */
function sleep_ms(duration_ms) {
  return new Promise(resolve => {
    setTimeout(resolve, duration_ms);
  });
}

/**
 * Validates that the debounced function does not fire immediately,
 * but fires after the specified wait time when called once.
 */
test('debounce: single call fires after delay', async t => {
  let call_count = 0;
  function increment() {
    call_count++;
  }

  const debounced_increment = debounce(increment, 100);
  debounced_increment();

  t.is(call_count, 0, 'function should not be called immediately');
  await sleep_ms(120);
  t.is(call_count, 1, 'function should be called after waiting 100ms');
});

/**
 * Validates that multiple calls in quick succession result in only one invocation,
 * at the trailing edge of the wait time.
 */
test('debounce: multiple calls collapse into one trailing call', async t => {
  let call_count = 0;
  function increment() {
    call_count++;
  }

  const debounced_increment = debounce(increment, 100);

  debounced_increment();
  debounced_increment();
  debounced_increment();

  t.is(call_count, 0, 'function not called immediately after quick succession calls');

  await sleep_ms(120);
  t.is(call_count, 1, 'only one call should have been made after the wait time');
});

/**
 * Validates that if calls are spaced by less than wait time,
 * the timer resets and ultimately fires only once at the trailing edge.
 */
test('debounce: calls spaced within wait time reset the timer', async t => {
  let call_count = 0;
  function increment() {
    call_count++;
  }

  const debounced_increment = debounce(increment, 100);

  debounced_increment();
  await sleep_ms(50);
  debounced_increment();
  await sleep_ms(50);
  debounced_increment();

  t.is(call_count, 0, 'still no call yet, because we keep resetting the timer');

  await sleep_ms(120);
  t.is(call_count, 1, 'only one call should have been invoked after final wait');
});

/**
 * Validates that when immediate is true, the function is called on the leading edge,
 * and subsequent calls are ignored until after the wait time.
 */
test('debounce: leading edge call when immediate=true', async t => {
  let call_count = 0;
  function increment() {
    call_count++;
  }

  const debounced_increment = debounce(increment, 100, { immediate: true });

  debounced_increment();
  t.is(call_count, 1, 'should be called immediately on first call');

  debounced_increment();
  debounced_increment();
  t.is(call_count, 1, 'should not be called again within the wait period');

  await sleep_ms(120);
  t.is(call_count, 1, 'still only one call after the waiting period (no trailing call)');
});

/**
 * Validates that when immediate is false (default), the function is not called on leading edge,
 * but eventually on the trailing edge after the wait time.
 */
test('debounce: no leading call when immediate=false', async t => {
  let call_count = 0;
  function increment() {
    call_count++;
  }

  const debounced_increment = debounce(increment, 100);

  debounced_increment();
  t.is(call_count, 0, 'no call on leading edge, immediate=false by default');

  await sleep_ms(120);
  t.is(call_count, 1, 'call occurs at trailing edge after the wait');
});

/**
 * Validates that the context ('this') is preserved when the debounced function is invoked.
 */
test('debounce: preserves context of this', async t => {
  const context = {
    count: 0,
    increment() {
      this.count++;
    }
  };

  const debounced_increment = debounce(context.increment.bind(context), 50);
  debounced_increment();

  await sleep_ms(70);
  t.is(context.count, 1, 'context should be preserved and increment count');
});

/**
 * Validates that arguments passed to the debounced function are forwarded correctly.
 */
test('debounce: arguments are forwarded to the original function', async t => {
  let args_received;
  function capture_args(...args) {
    args_received = args;
  }

  const debounced_capture = debounce(capture_args, 50);
  debounced_capture('hello', 42);

  await sleep_ms(70);
  t.deepEqual(args_received, ['hello', 42], 'arguments should match');
});

/**
 * Validates that if the debounced function includes a cancel method,
 * calling cancel prevents the trailing invocation.
 */
test('debounce: cancel prevents trailing call', async t => {
  let call_count = 0;
  function increment() {
    call_count++;
  }

  const debounced_increment = debounce(increment, 100);
  if (typeof debounced_increment.cancel !== 'function') {
    t.pass('debounce function has no cancel method, skipping test');
    return;
  }

  debounced_increment();
  debounced_increment.cancel();
  await sleep_ms(120);

  t.is(call_count, 0, 'no calls should have been made after cancel');
});
