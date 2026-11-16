import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CreateMessageRequest, MessageStreamEvent } from '../src/services/api/types.ts'

Object.assign(globalThis, { __API_ORIGIN__: '' })
const { streamMessage, toResponsesInput } = await import('../src/services/api/openai.ts')
const { ApiError } = await import('../src/services/api/client.ts')
const connection = { baseUrl: 'https://gateway.example/v1', apiKey: 'sk-test' }
const body: CreateMessageRequest = {
  protocol: 'responses',
  reasoningEffort: 'high',
  model: 'reasoning-model',
  system: '',
  messages: [{ role: 'user', content: 'Hi' }],
}
const response = (events: object[]) =>
  new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''), {
    headers: { 'Content-Type': 'text/event-stream' },
  })
const collect = async (input = body) => {
  const events: MessageStreamEvent[] = []
  for await (const event of streamMessage(
    'sk-test',
    input,
    new AbortController().signal,
    connection
  ))
    events.push(event)
  return events
}

test('Responses sends input, store:false and structured reasoning effort', async (t) => {
  let url: unknown, payload: Record<string, unknown> | undefined
  t.mock.method(globalThis, 'fetch', async (target: unknown, init: RequestInit) => {
    url = target
    payload = JSON.parse(String(init.body))
    return response([
      { type: 'response.created', response: { id: 'resp-1' } },
      { type: 'response.reasoning_summary_text.delta', delta: '思考摘要' },
      { type: 'response.output_text.delta', delta: '你好' },
      {
        type: 'response.completed',
        response: {
          usage: {
            input_tokens: 30,
            output_tokens: 10,
            input_tokens_details: { cached_tokens: 5 },
          },
        },
      },
    ])
  })
  const events = await collect()
  assert.equal(url, 'https://gateway.example/v1/responses')
  assert.deepEqual(payload, {
    model: 'reasoning-model',
    input: [{ role: 'user', content: 'Hi' }],
    stream: true,
    store: false,
    reasoning: { effort: 'high', summary: 'auto' },
  })
  assert.ok(
    events.some(
      (e) =>
        e.type === 'content_block_delta' &&
        e.delta.type === 'thinking_delta' &&
        e.delta.thinking === '思考摘要'
    )
  )
  assert.ok(events.some((e) => e.type === 'message_delta' && e.usage?.input_tokens === 25))
  assert.equal(events.at(-1)?.type, 'message_stop')
})

test('Responses forwards the four reasoning levels with a summary request', async (t) => {
  let payload: Record<string, unknown> | undefined
  t.mock.method(globalThis, 'fetch', async (_target: unknown, init: RequestInit) => {
    payload = JSON.parse(String(init.body))
    return body.protocol === 'responses'
      ? response([{ type: 'response.completed', response: {} }])
      : response([])
  })
  for (const effort of ['low', 'medium', 'high', 'xhigh'] as const) {
    await collect({ ...body, reasoningEffort: effort })
    assert.deepEqual(payload!.reasoning, { effort, summary: 'auto' })
  }
})

test('incomplete output maps token exhaustion to a continuable answer', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    response([
      { type: 'response.output_text.delta', delta: 'Partial' },
      {
        type: 'response.incomplete',
        response: { incomplete_details: { reason: 'max_output_tokens' } },
      },
    ])
  )
  assert.ok(
    (await collect()).some(
      (e) => e.type === 'message_delta' && e.delta.stop_reason === 'max_tokens'
    )
  )
})

test('failure and missing terminal events remain errors', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () =>
    response([{ type: 'response.failed', response: { error: { message: 'Provider failure' } } }])
  )
  await assert.rejects(
    collect,
    (e: unknown) => e instanceof ApiError && e.kind === 'stream' && e.message === 'Provider failure'
  )
  mock.mock.mockImplementation(async () =>
    response([{ type: 'response.output_text.delta', delta: 'Partial' }])
  )
  await assert.rejects(collect, (e: unknown) => e instanceof ApiError && e.kind === 'interrupted')
})

test('completed output can supply text when a compatible gateway omits deltas', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    response([
      {
        type: 'response.completed',
        response: {
          output: [{ type: 'message', content: [{ type: 'output_text', text: 'Fallback' }] }],
        },
      },
    ])
  )
  assert.ok(
    (await collect()).some(
      (e) =>
        e.type === 'content_block_delta' &&
        e.delta.type === 'text_delta' &&
        e.delta.text === 'Fallback'
    )
  )
})

test('image and text blocks use the Responses input schema', () => {
  assert.deepEqual(
    toResponsesInput([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,AA' } },
        ],
      },
    ]),
    [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: 'Describe' },
          { type: 'input_image', image_url: 'data:image/png;base64,AA', detail: 'auto' },
        ],
      },
    ]
  )
})
