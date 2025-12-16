import test from 'ava';
import { normalize_error } from './normalize_error.js';

test('normalize_error handles Error instances', (t) => {
  const error = new Error('Model exploded');
  const result = normalize_error(error);
  t.deepEqual(result, {
    message: 'Model exploded',
    http_status: null,
    details: null,
  });
});

test('normalize_error reads nested error.message', (t) => {
  const error = { error: { message: 'Bad request', code: 400 } };
  const result = normalize_error(error);
  t.deepEqual(result, {
    message: 'Bad request',
    http_status: null,
    details: {code: 400},
  });
});

test('normalize_error collapses string errors', (t) => {
  const result = normalize_error('Timeout connecting to model');
  t.deepEqual(result, {
    message: 'Timeout connecting to model',
    details: null,
    http_status: null,
  });
});

test('normalize_error falls back to unknown message', (t) => {
  const result = normalize_error({});
  t.deepEqual(result, {
    message: 'Unknown error',
    details: null,
    http_status: null,
  });
});

test('adds all other JSON compatible properties to details', (t) => {
  const error = { error: { message: 'Service unavailable', code: 503, info: 'Try again later' } };
  const result = normalize_error(error);
  t.deepEqual(result, {
    message: 'Service unavailable',
    details: {code: 503, info: 'Try again later'},
    http_status: null,
  });
})

test('should handle if error object is an array (gemini stream)', (t) => {
  const error = [ {error: {message: 'First error', code: 400}}];
  const result = normalize_error(error, 400);
  t.deepEqual(result, {
    message: 'First error',
    details: {code: 400},
    http_status: 400,
  });
});