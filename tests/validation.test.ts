import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatUtcInput,
  isHttpUrl,
  maintenanceSchema,
  monitorSchema,
  parseUtcInput,
  slugify,
  uuidList,
} from '../lib/validation';

test('datetime-local input is interpreted as UTC, not server time', () => {
  assert.equal(parseUtcInput('2026-10-25T22:00')?.toISOString(), '2026-10-25T22:00:00.000Z');
  assert.equal(parseUtcInput('2026-10-25T22:00:30')?.toISOString(), '2026-10-25T22:00:30.000Z');
  assert.equal(parseUtcInput(''), null);
  assert.equal(parseUtcInput('not a date'), null);
});

test('formatUtcInput round-trips a stored timestamp', () => {
  assert.equal(formatUtcInput('2026-10-25T22:00:00.000Z'), '2026-10-25T22:00');
  assert.equal(formatUtcInput(null), '');
});

test('slugs stay lowercase and hyphenated', () => {
  assert.equal(slugify('Seller Panel!'), 'seller-panel');
  assert.equal(slugify('  Data   Center  '), 'data-center');
  assert.equal(slugify('---'), '');
});

test('only http and https URLs are accepted', () => {
  assert.equal(isHttpUrl('https://example.com/health'), true);
  assert.equal(isHttpUrl('http://localhost:3000/health'), true);
  assert.equal(isHttpUrl('ftp://example.com'), false);
  assert.equal(isHttpUrl('example.com'), false);
});

test('monitor validation rejects an inverted status range', () => {
  const result = monitorSchema.safeParse({
    name: 'Data center heartbeat',
    url: 'https://example.com/isitonline',
    method: 'GET',
    expected_status_min: 300,
    expected_status_max: 299,
    expected_text: '',
    timeout_ms: 10000,
    check_interval_seconds: 300,
    failure_threshold: 3,
    recovery_threshold: 3,
    incident_impact: 'major',
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0]?.message ?? '', /minimum status/i);
  }
});

test('maintenance validation requires the end after the start', () => {
  const result = maintenanceSchema.safeParse({
    title: 'Database upgrade',
    body: '',
    status: 'scheduled',
    scheduled_start: '2026-10-26T02:00',
    scheduled_end: '2026-10-26T01:00',
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0]?.message ?? '', /after the start/i);
  }
});

test('uuidList drops anything that is not a uuid', () => {
  const formData = new FormData();
  formData.append('service_ids', '11111111-1111-4111-8111-111111111111');
  formData.append('service_ids', 'not-a-uuid');
  assert.deepEqual(uuidList(formData), ['11111111-1111-4111-8111-111111111111']);
});
