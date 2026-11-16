import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getVisibleMessages, removeMessageRound } from '../src/services/chat/branches.ts'
import { getRequestMetrics } from '../src/services/chat/metrics.ts'
import type { AssistantMessage, Message, Session } from '../src/services/chat/types.ts'

const user = (id: string): Message => ({ id, role: 'user', content: id, files: [], createdAt: 1 })
const assistant = (id: string): AssistantMessage => ({
  id,
  role: 'assistant',
  model: 'model',
  createdAt: 1,
  prefix: true,
  status: 'done',
  blocks: [{ type: 'text', text: id }],
})
const session: Session = {
  id: 'session',
  title: 'Chat',
  createdAt: 1,
  updatedAt: 1,
  messages: [user('q1'), assistant('a1'), user('q2'), assistant('a2'), user('q3'), assistant('a3')],
}
const visibleIds = (value: Session) => getVisibleMessages(value).map((message) => message.id)
const assertTree = (value: Session) => {
  const byId = new Map(value.messages.map((message) => [message.id, message]))
  for (const message of value.messages) {
    if (message.parentId) {
      assert.ok(byId.has(message.parentId))
      assert.notEqual(byId.get(message.parentId)?.role, message.role)
    }
    if (message.selectedChildId)
      assert.equal(byId.get(message.selectedChildId)?.parentId, message.id)
  }
}

test('deleting a middle turn keeps subsequent context and preserves the original session', () => {
  const result = removeMessageRound(session, 'a2')
  assert.deepEqual(visibleIds(result), ['q1', 'a1', 'q3', 'a3'])
  assert.equal(result.messages.find((message) => message.id === 'q3')?.parentId, 'a1')
  assert.equal(session.messages.length, 6)
  assertTree(result)
})

test('deleting the first, last and only turns maintains valid roots and leaves no orphan answers', () => {
  assert.deepEqual(visibleIds(removeMessageRound(session, 'a1')), ['q2', 'a2', 'q3', 'a3'])
  assert.deepEqual(visibleIds(removeMessageRound(session, 'a3')), ['q1', 'a1', 'q2', 'a2'])
  const empty = removeMessageRound({ ...session, messages: [user('q1'), assistant('a1')] }, 'a1')
  assert.equal(empty.rootMessageId, null)
  assert.deepEqual(empty.messages, [])
})

test('deleting answer versions retains the later branches with alternating roles', () => {
  const messages = session.messages.map((message, index) => ({
    ...message,
    parentId: session.messages[index - 1]?.id ?? null,
    selectedChildId: session.messages[index + 1]?.id,
  }))
  const branched: Session = {
    ...session,
    rootMessageId: 'q1',
    messages: [
      ...messages,
      { ...assistant('a2b'), parentId: 'q2', selectedChildId: 'q3b' },
      { ...user('q3b'), parentId: 'a2b', selectedChildId: 'a3b' },
      { ...assistant('a3b'), parentId: 'q3b' },
    ],
  }
  const result = removeMessageRound(branched, 'a2')
  assert.deepEqual(visibleIds(result), ['q1', 'a1', 'q3', 'a3'])
  assert.equal(result.messages.find((message) => message.id === 'q3b')?.parentId, 'a1')
  assert.ok(!result.messages.some((message) => ['q2', 'a2', 'a2b'].includes(message.id)))
  assertTree(result)
})

test('request statistics include cache tokens in the input total and preserve unavailable usage', () => {
  const result = getRequestMetrics({
    ...assistant('a1'),
    requestStartedAt: 100,
    durationMs: 8770,
    usage: {
      input_tokens: 80,
      cache_read_input_tokens: 20,
      cache_creation_input_tokens: 10,
      output_tokens: 35,
    },
  })
  assert.deepEqual(result, { startedAt: 100, durationMs: 8770, inputTokens: 110, outputTokens: 35 })
  assert.equal(getRequestMetrics(assistant('a1')).inputTokens, undefined)
  assert.equal(getRequestMetrics(assistant('a1')).durationMs, undefined)
})
