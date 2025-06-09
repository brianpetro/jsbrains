import test from 'ava';
import { is_class, is_function } from './callable_type.js';

// Regular callables
function regular_function() {}
const arrow_function = () => {};

// Native ES2015 class
class NativeClass {}

// Mimic a Babel-style transpiled class
function Transpiled() {
  'use strict';
  if (!(this instanceof Transpiled))
    throw new TypeError('Class constructor cannot be invoked without new');
}
Object.defineProperty(Transpiled, 'prototype', {
  value: {},
  writable: false,
  configurable: false,
});

test('Native class is detected', (t) => {
  t.true(is_class(NativeClass));
  t.false(is_function(NativeClass));
});

test('Transpiled class is detected', (t) => {
  t.true(is_class(Transpiled));
  t.false(is_function(Transpiled));
});

test('Built-in constructor (Array) is treated as class', (t) => {
  t.true(is_class(Array));
  t.false(is_function(Array));
});

test('Regular function is not a class', (t) => {
  t.false(is_class(regular_function));
  t.true(is_function(regular_function));
});

test('Arrow function is not a class', (t) => {
  t.false(is_class(arrow_function));
  t.true(is_function(arrow_function));
});
