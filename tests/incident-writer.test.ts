import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMessages,
  draftIncidentCopy,
  parseDraft,
  writerModel,
  WriterError,
} from '../lib/incident-writer';

function userPrompt(input: Parameters<typeof buildMessages>[0]): string {
  const messages = buildMessages(input);
  return messages[messages.length - 1].content;
}

test('the incident prompt carries only the operator facts', () => {
  const prompt = userPrompt({
    mode: 'incident',
    notes: 'Seller panel logins fail for users in Dhaka since 09:20 UTC.',
    status: 'investigating',
    impact: 'major',
    services: ['Seller panel', 'Authentication'],
  });

  assert.match(prompt, /new incident/);
  assert.match(prompt, /Status: Investigating/);
  assert.match(prompt, /Impact: Major impact/);
  assert.match(prompt, /Affected services: Seller panel, Authentication/);
  assert.match(prompt, /Seller panel logins fail for users in Dhaka/);
});

test('an update prompt names the incident and skips the service list', () => {
  const prompt = userPrompt({
    mode: 'update',
    notes: 'Failures stopped after the connection pool was raised.',
    status: 'monitoring',
    incidentTitle: 'Seller panel login is slow',
  });

  assert.match(prompt, /timeline update/);
  assert.match(prompt, /Incident: Seller panel login is slow/);
  assert.match(prompt, /Status: Monitoring/);
  assert.doesNotMatch(prompt, /Affected services/);
});

test('the system prompt forbids invented causes', () => {
  const system = buildMessages({ mode: 'incident', notes: 'x', status: 'investigating' })[0].content;

  assert.match(system, /Use only the facts in the operator notes/);
  assert.match(system, /Never invent a cause/);
  assert.match(system, /still being determined/);
});

test('the reply format asks for blocks, not json', () => {
  const incident = buildMessages({ mode: 'incident', notes: 'x', status: 'investigating' })[0].content;
  const update = buildMessages({ mode: 'update', notes: 'x', status: 'resolved' })[0].content;

  assert.match(incident, /TITLE: <title on one line>/);
  assert.match(incident, /BODY: <the update>/);
  assert.match(update, /exactly one block/);
  assert.doesNotMatch(update, /TITLE/);
});

test('incident blocks are trimmed into a title and a body', () => {
  const draft = parseDraft(
    'TITLE:   Seller panel login is failing  \nBODY: We are investigating.\n\n\n\nTrailing space  ',
    'incident',
  );

  assert.equal(draft.title, 'Seller panel login is failing');
  assert.equal(draft.body, 'We are investigating.\n\nTrailing space');
});

test('a fenced reply is still parsed', () => {
  const draft = parseDraft(
    ['```', 'TITLE: Checkout stalls', 'BODY: Some payments are slower than normal.', '```'].join('\n'),
    'incident',
  );

  assert.equal(draft.title, 'Checkout stalls');
  assert.equal(draft.body, 'Some payments are slower than normal.');
});

test('update drafts ignore a title and accept plain prose', () => {
  assert.deepEqual(parseDraft('BODY: Cause found, working on it.', 'update'), {
    title: null,
    body: 'Cause found, working on it.',
  });

  assert.deepEqual(parseDraft('TITLE: Ignored\nThe fix is deployed and we are watching.', 'update'), {
    title: null,
    body: 'The fix is deployed and we are watching.',
  });
});

test('a draft over the field limit is cut, not passed through', () => {
  const draft = parseDraft(`TITLE: ${'a'.repeat(300)}\nBODY: ${'b'.repeat(9000)}`, 'incident');

  assert.equal(draft.title?.length, 140);
  assert.equal(draft.body.length, 4000);
});

test('an incident draft without a usable title is a failed draft', () => {
  for (const raw of ['', '   ', 'We are looking into it.', 'TITLE: ab\nBODY: Too short to publish.']) {
    assert.throws(() => parseDraft(raw, 'incident'), WriterError);
  }
});

const request = {
  mode: 'incident' as const,
  notes: 'Checkout is timing out for everyone since 11:40 UTC.',
  status: 'investigating' as const,
};

test('the writer sends the key it was given and returns the parsed draft', async () => {
  process.env.GROQ = 'test-key';
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(String(url), 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-key');
    assert.equal(body.model, 'llama-3.1-8b-instant');
    assert.equal(body.response_format, undefined);
    assert.equal(body.messages.length, 2);

    return new Response(
      JSON.stringify({
        choices: [{ message: { content: 'TITLE: Checkout is timing out\nBODY: We are investigating.' } }],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    assert.deepEqual(await draftIncidentCopy(request), {
      title: 'Checkout is timing out',
      body: 'We are investigating.',
    });
  } finally {
    globalThis.fetch = original;
    delete process.env.GROQ;
  }
});

test('GROQ_MODEL picks the model when it is set', async () => {
  process.env.GROQ = 'test-key';
  process.env.GROQ_MODEL = 'llama-3.3-70b-versatile';
  const original = globalThis.fetch;
  const sent: string[] = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)).model);
    return new Response(
      JSON.stringify({ choices: [{ message: { content: 'TITLE: A title\nBODY: A body.' } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    assert.equal(writerModel(), 'llama-3.3-70b-versatile');
    await draftIncidentCopy(request);
    assert.deepEqual(sent, ['llama-3.3-70b-versatile']);
  } finally {
    globalThis.fetch = original;
    delete process.env.GROQ;
    delete process.env.GROQ_MODEL;
  }
});

test('a rate limit from Groq surfaces as a retryable failure', async () => {
  process.env.GROQ = 'test-key';
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response('{}', { status: 429 })) as typeof fetch;

  try {
    await assert.rejects(() => draftIncidentCopy(request), (caught: unknown) => {
      assert.ok(caught instanceof WriterError);
      assert.equal(caught.code, 'rate-limited');
      return true;
    });
  } finally {
    globalThis.fetch = original;
    delete process.env.GROQ;
  }
});

test('a rejected request tells you what Groq said', async () => {
  process.env.GROQ = 'test-key';
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: { message: 'The model `llama-9.9-400b` does not exist.', code: 'model_not_found' },
      }),
      { status: 400 },
    )) as typeof fetch;

  try {
    await assert.rejects(() => draftIncidentCopy(request), (caught: unknown) => {
      assert.ok(caught instanceof WriterError);
      assert.equal(caught.code, 'provider-error');
      assert.match(caught.message, /Groq HTTP 400/);
      assert.match(caught.message, /does not exist/);
      assert.match(caught.message, /model_not_found/);
      return true;
    });
  } finally {
    globalThis.fetch = original;
    delete process.env.GROQ;
  }
});

test('the writer refuses to call Groq without a key', async () => {
  delete process.env.GROQ;

  await assert.rejects(() => draftIncidentCopy(request), (caught: unknown) => {
    assert.ok(caught instanceof WriterError);
    assert.equal(caught.code, 'missing-key');
    return true;
  });
});
