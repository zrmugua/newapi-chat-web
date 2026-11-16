import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CreateMessageRequest, MessageStreamEvent } from '../src/services/api/types.ts'

Object.assign(globalThis, { __API_ORIGIN__: '' })
const { streamMessage, toOpenAIMessages } = await import('../src/services/api/openai.ts')
const { ApiError, loadModels } = await import('../src/services/api/client.ts')
const body: CreateMessageRequest = {
  model: 'test-model',
  system: 'Be helpful',
  messages: [{ role: 'user', content: 'Hi' }],
}
const connection = { baseUrl: 'https://gateway.example', apiKey: 'sk-test' }
const controller = () => new AbortController()
const streamResponse = (events: unknown[], done = true) => {
  const payload =
    events.map((event) => `data: ${JSON.stringify(event)}\r\n\r\n`).join('') +
    (done ? 'data: [DONE]\r\n\r\n' : '')
  const bytes = new TextEncoder().encode(payload)
  return new Response(
    new ReadableStream({
      start(c) {
        // Split UTF-8 Chinese and CRLF separators across chunks.
        for (let i = 0; i < bytes.length; i += 7) c.enqueue(bytes.slice(i, i + 7))
        c.close()
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } }
  )
}
const collect = async (signal = controller().signal) => {
  const events: MessageStreamEvent[] = []
  for await (const event of streamMessage('sk-test', body, signal, connection)) events.push(event)
  return events
}

test('sends standard Chat Completions body and preserves reasoning, content, usage', async (t) => {
  let init: RequestInit | undefined
  let url: unknown
  t.mock.method(globalThis, 'fetch', async (target: unknown, options: RequestInit) => {
    init = options
    url = target
    return streamResponse([
      { choices: [{ index: 0, delta: { reasoning_content: '思考' } }] },
      { choices: [{ index: 0, delta: { content: '你好' } }] },
      { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
      {
        choices: [],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 8,
          prompt_tokens_details: { cached_tokens: 5 },
        },
      },
    ])
  })
  const events = await collect()
  assert.equal(url, 'https://gateway.example/v1/chat/completions')
  assert.deepEqual(JSON.parse(String(init?.body)), {
    model: 'test-model',
    messages: [
      { role: 'system', content: 'Be helpful' },
      { role: 'user', content: 'Hi' },
    ],
    stream: true,
    stream_options: { include_usage: true },
  })
  assert.equal(init?.credentials, 'omit')
  assert.equal(init?.redirect, 'error')
  assert.ok(
    events.some(
      (e) =>
        e.type === 'content_block_delta' &&
        e.delta.type === 'thinking_delta' &&
        e.delta.thinking === '思考'
    )
  )
  assert.ok(
    events.some(
      (e) =>
        e.type === 'content_block_delta' && e.delta.type === 'text_delta' && e.delta.text === '你好'
    )
  )
  const finish = events.find((e) => e.type === 'message_delta')
  assert.equal(finish?.type === 'message_delta' && finish.usage?.input_tokens, 15)
  assert.equal(events.at(-1)?.type, 'message_stop')
})

test('accepts a finish reason on gateways that close without DONE', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    streamResponse([{ choices: [{ delta: { content: 'done' }, finish_reason: 'length' }] }], false)
  )
  const events = await collect()
  assert.ok(events.some((e) => e.type === 'message_delta' && e.delta.stop_reason === 'max_tokens'))
})

test('a stream cut short is reported as interrupted', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    streamResponse([{ choices: [{ delta: { content: 'partial' } }] }], false)
  )
  await assert.rejects(collect, (e: unknown) => e instanceof ApiError && e.kind === 'interrupted')
})

test('propagates HTTP authorization and stream errors', async (t) => {
  const mock = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(JSON.stringify({ error: { message: 'Invalid key' } }), { status: 401 })
  )
  await assert.rejects(collect, (e: unknown) => e instanceof ApiError && e.status === 401)
  mock.mock.mockImplementation(async () =>
    streamResponse([{ error: { message: 'Quota exceeded' } }])
  )
  await assert.rejects(
    collect,
    (e: unknown) => e instanceof ApiError && e.kind === 'stream' && e.message === 'Quota exceeded'
  )
})

test('abort preserves cancellation semantics', async () => {
  const task = controller()
  task.abort()
  await assert.rejects(
    () => collect(task.signal),
    (e: unknown) => e instanceof Error && e.name === 'AbortError'
  )
})

test('history conversion keeps ordinary turns and continues a partial answer', async () => {
  const result = await toOpenAIMessages(
    {
      ...body,
      messages: [
        { role: 'latest_reminder', content: 'metadata' },
        { role: 'user', content: 'Hi' },
        {
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'private reasoning', signature: '' },
            { type: 'text', text: 'Partial' },
          ],
        },
      ],
    },
    controller().signal
  )
  assert.deepEqual(result.slice(1, 3), [
    { role: 'user', content: 'Hi' },
    { role: 'assistant', content: 'Partial' },
  ])
  assert.equal(result.at(-1)?.role, 'user')
  assert.ok(!JSON.stringify(result).includes('private reasoning'))
})

test('model list preserves gateway order and returns unique IDs', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ data: [{ id: 'b' }, { id: 'a' }, { id: 'a' }, {}] })
  )
  assert.deepEqual(await loadModels(connection), ['b', 'a'])
})

test('Chat Completions forwards reasoning levels and requests streamed token usage', async (t) => {
  let payload: Record<string, unknown> = {}
  t.mock.method(globalThis, 'fetch', async (_target: unknown, init: RequestInit) => {
    payload = JSON.parse(String(init.body))
    return streamResponse([{ choices: [{ delta: {}, finish_reason: 'stop' }] }])
  })
  for (const effort of ['low', 'medium', 'high', 'xhigh'] as const) {
    for await (const _event of streamMessage(
      'sk-test',
      { ...body, reasoningEffort: effort },
      controller().signal,
      connection
    )) {
      /* Consume the response. */
    }
    assert.equal(payload.reasoning_effort, effort)
    assert.deepEqual(payload.stream_options, { include_usage: true })
    assert.ok(!('reasoning' in payload))
  }
})
