import test from 'ava';
import {
  compare_versions,
  normalize_version_value
 } from './compare_versions.js';

test('compare_versions: handles basic semver strings', t => {
  t.is(compare_versions('1.0.0', '1.0.0'), 0);
  t.is(compare_versions('1.0.1', '1.0.0'), 1);
  t.is(compare_versions('1.0.0', '1.0.1'), -1);
  t.is(compare_versions('2.0.0', '1.9.9'), 1);
});

test('compare_versions: handles different lengths', t => {
  t.is(compare_versions('1.0', '1.0.0'), 0);
  t.is(compare_versions('1', '1.0.0'), 0);
  t.is(compare_versions('1.1', '1.0.0'), 1);
  t.is(compare_versions('1.0.0.1', '1.0.0'), 1);
});

test('compare_versions: handles numbers', t => {
  t.is(compare_versions(1, 1), 0);
  t.is(compare_versions(2, 1), 1);
  t.is(compare_versions(1, 2), -1);
});

test('compare_versions: handles mixed types (string vs number)', t => {
  // If numeric value is same, semver string wins
  t.is(compare_versions('1', 1), 1);
  t.is(compare_versions(1, '1'), -1);

  // If numeric value differs, value wins
  t.is(compare_versions('2', 1), 1);
  t.is(compare_versions(1, '2'), -1);

  // 2.1391 vs 2.2.0
  t.is(compare_versions(2.1391, '2.2.0'), -1);
  t.is(compare_versions('2.2.0', 2.1391), 1);

});

test('compare_versions: handles null/undefined', t => {
  t.is(compare_versions(null, null), 0);
  t.is(compare_versions(undefined, undefined), 0);
  t.is(compare_versions(null, undefined), 0);

  // Missing is treated as 0, but type priority applies if values are equal
  // 'semver' (0.0.0) vs 'none' (null) -> semver wins
  t.is(compare_versions('0.0.0', null), 1);
  t.is(compare_versions(null, '0.0.0'), -1);

  // 'number' (0) vs 'none' (null) -> equal because of specific check in code
  t.is(compare_versions(0, null), 0);

  // 'number' (1) vs 'none' (null) -> number wins
  t.is(compare_versions(1, null), 1);
  t.is(compare_versions(null, 1), -1);
});

test('normalize_version_value: handles various inputs', t => {
  let result;
  result = normalize_version_value(null);
  t.deepEqual(result, { type: 'none', parts: [0, 0, 0] });
  result = normalize_version_value(undefined);
  t.deepEqual(result, { type: 'none', parts: [0, 0, 0] });
  result = normalize_version_value(2);
  t.deepEqual(result, { type: 'number', parts: [2, 0, 0] });
  result = normalize_version_value(2.1391);
  t.deepEqual(result, { type: 'number', parts: [2, 1, 0] });
  result = normalize_version_value('1.2.3');
  t.deepEqual(result, { type: 'semver', parts: [1, 2, 3] });
  result = normalize_version_value('2.0.0');
  t.deepEqual(result, { type: 'semver', parts: [2, 0, 0] });
  result = normalize_version_value('3');
  t.deepEqual(result, { type: 'semver', parts: [3, 0, 0] });
  result = normalize_version_value('1.2.alpha');
  t.deepEqual(result, { type: 'semver', parts: [1, 2, 0] });
});