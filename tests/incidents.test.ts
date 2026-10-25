import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAutoIncidentBody,
  buildAutoRecoveryBody,
  decideAutomation,
  trailingCount,
} from '../lib/incidents';

function checks(...values: boolean[]) {
  return values.map((ok, index) => ({
    checked_at: new Date(Date.parse('2026-10-25T12:00:00.000Z') - index * 60_000).toISOString(),
    ok,
  }));
}

test('no checks means no automation', () => {
  assert.deepEqual(
    decideAutomation({
      recentChecks: [],
      openAutoIncidentId: null,
      hasOtherOpenIncident: false,
      failureThreshold: 3,
      recoveryThreshold: 3,
    }),
    { action: 'none' },
  );
});

test('opens only after the failure threshold is reached', () => {
  const base = {
    openAutoIncidentId: null,
    hasOtherOpenIncident: false,
    failureThreshold: 3,
    recoveryThreshold: 3,
  };
  assert.deepEqual(decideAutomation({ ...base, recentChecks: checks(false, false) }), { action: 'none' });
  assert.deepEqual(decideAutomation({ ...base, recentChecks: checks(false, false, false) }), {
    action: 'open',
    consecutiveFailures: 3,
  });
});

test('non-consecutive failures do not open an incident', () => {
  assert.deepEqual(
    decideAutomation({
      recentChecks: checks(false, false, true, false),
      openAutoIncidentId: null,
      hasOtherOpenIncident: false,
      failureThreshold: 3,
      recoveryThreshold: 3,
    }),
    { action: 'none' },
  );
});

test('never opens while another manual incident is open', () => {
  assert.deepEqual(
    decideAutomation({
      recentChecks: checks(false, false, false, false),
      openAutoIncidentId: null,
      hasOtherOpenIncident: true,
      failureThreshold: 3,
      recoveryThreshold: 3,
    }),
    { action: 'none' },
  );
});

test('resolves an open automated incident after sustained recovery', () => {
  assert.deepEqual(
    decideAutomation({
      recentChecks: checks(true, true),
      openAutoIncidentId: null,
      hasOtherOpenIncident: false,
      failureThreshold: 3,
      recoveryThreshold: 3,
    }),
    { action: 'none' },
  );

  assert.deepEqual(
    decideAutomation({
      recentChecks: checks(true, true, true, false),
      openAutoIncidentId: 'incident-1',
      hasOtherOpenIncident: false,
      failureThreshold: 3,
      recoveryThreshold: 3,
    }),
    { action: 'resolve', consecutiveSuccesses: 3, incidentId: 'incident-1' },
  );
});

test('trailingCount counts from the newest check backwards', () => {
  assert.equal(trailingCount(checks(false, false, false, true), false), 3);
});

test('automated incident copy is explicit and includes the failure evidence', () => {
  const body = buildAutoIncidentBody({
    monitorName: 'Data center heartbeat',
    failureCount: 3,
    error: 'HTTP 502 outside expected range 200–299.',
    statusCode: 502,
    checkedAt: '2026-10-25T11:55:00.000Z',
  });
  assert.match(body, /Data center heartbeat/);
  assert.match(body, /3 times in a row/);
  assert.match(body, /502/);
  assert.match(body, /opened automatically/);
});

test('automated recovery copy states the successful count', () => {
  const body = buildAutoRecoveryBody({
    monitorName: 'Data center heartbeat',
    successCount: 3,
    checkedAt: '2026-10-25T12:10:00.000Z',
  });
  assert.match(body, /succeeded \*\*3 times in a row\*\*/);
  assert.match(body, /resolved/);
});
