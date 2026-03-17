import test from 'ava';

import {
  get_display_fallback_level,
  get_event_level,
  get_event_severity,
  get_legacy_notification_level,
  get_next_notification_status,
  normalize_event_level,
} from '../event_level_utils.js';

test('normalize_event_level trims, lowercases, and rejects unknown values', (t) => {
  t.is(normalize_event_level(' Warning '), 'warning');
  t.is(normalize_event_level('MILESTONE'), 'milestone');
  t.is(normalize_event_level('unknown'), null);
  t.is(normalize_event_level(null), null);
});

test('get_legacy_notification_level reads only the legacy notification namespace', (t) => {
  t.is(get_legacy_notification_level('notification:error'), 'error');
  t.is(get_legacy_notification_level('sync:error'), null);
});

test('get_display_fallback_level is error-only and display-only', (t) => {
  t.is(get_display_fallback_level('sync:error'), 'error');
  t.is(get_display_fallback_level('sync:warning'), null);
  t.is(get_display_fallback_level('sync:error:extra'), null);
});

test('get_event_level is payload-first, then legacy, then optional display fallback', (t) => {
  t.is(get_event_level('notification:warning', { level: ' error ' }), 'error');
  t.is(get_event_level('notification:info', {}), 'info');
  t.is(get_event_level('sync:error', {}), null);
  t.is(get_event_level('sync:error', {}, { allow_display_fallback: true }), 'error');
});

test('get_event_severity maps milestone to attention and ignores info', (t) => {
  t.is(get_event_severity('milestone'), 'attention');
  t.is(get_event_severity('attention'), 'attention');
  t.is(get_event_severity('warning'), 'warning');
  t.is(get_event_severity('error'), 'error');
  t.is(get_event_severity('info'), null);
});

test('get_next_notification_status escalates only and never downgrades', (t) => {
  t.is(get_next_notification_status(null, 'domain:event', { level: 'attention' }), 'attention');
  t.is(get_next_notification_status('warning', 'domain:event', { level: 'milestone' }), 'warning');
  t.is(get_next_notification_status('error', 'domain:event', { level: 'warning' }), 'error');
});
