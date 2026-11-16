import { useSettings } from '../settings.js'
import { normalizeBaseUrl, type Connection } from '../connection.js'
import { loadFile } from '../chat/db.js'
import { ApiError, request } from './client.js'
import { readServerSentEvents } from './sse.js'
import type { CreateMessageRequest, MessageStreamEvent, MessageUsage, StopReason } from './types.js'

type Content = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
type OpenAIMessage = { role: 'system' | 'user' | 'assistant'; content: string | Content[] }
type Chunk = {
  error?: { message?: string }
  choices?: {
    index?: number
    delta?: {
      content?: string | null
      reasoning_content?: string
      reasoning?: string
      tool_calls?: unknown[]
    }
    finish_reason?: string | null
  }[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    prompt_tokens_details?: { cached_tokens?: number }
  }
}
type ResponseEvent = {
  type?: string
  delta?: string
  item?: { type?: string }
  error?: { message?: string }
  message?: string
  response?: {
    error?: { message?: string }
    incomplete_details?: { reason?: string }
    usage?: {
      input_tokens?: number
      output_tokens?: number
      input_tokens_details?: { cached_tokens?: number }
    }
    output?: {
      type: string
      content?: { type: string; text?: string }[]
      summary?: { text?: string }[]
    }[]
  }
}

const asDataUrl = (blob: Blob, signal: AbortSignal): Promise<string> =>
  new Promise((resolve, reject) => {
    signal.throwIfAborted()
    const reader = new FileReader()
    const abort = () => reader.abort()
    signal.addEventListener('abort', abort, { once: true })
    const cleanup = () => signal.removeEventListener('abort', abort)
    reader.onload = () => {
      cleanup()
      resolve(String(reader.result))
    }
    reader.onerror = () => {
      cleanup()
      reject(reader.error)
    }
    reader.onabort = () => {
      cleanup()
      reject(signal.reason)
    }
    reader.readAsDataURL(blob)
  })

export const toOpenAIMessages = async (
  body: CreateMessageRequest,
  signal: AbortSignal
): Promise<OpenAIMessage[]> => {
  const messages: OpenAIMessage[] = body.system.trim()
    ? [{ role: 'system', content: body.system }]
    : []
  for (const message of body.messages) {
    signal.throwIfAborted()
    if (message.role === 'latest_reminder') {
      continue
    }
    if (typeof message.content === 'string') {
      messages.push({ role: message.role, content: message.content })
      continue
    }
    if (message.role === 'assistant') {
      messages.push({
        role: 'assistant',
        content: message.content
          .flatMap((block) => (block.type === 'text' ? [block.text] : []))
          .join(''),
      })
      continue
    }
    const content: Content[] = []
    for (const block of message.content) {
      if (block.type === 'text') {
        content.push(block)
        continue
      }
      const id = block.source.file_id.replace(/^local:/, '')
      const blob = await loadFile(id)
      if (!blob) {
        throw new ApiError('protocol', { key: 'attachmentMissing' })
      }
      if (block.type === 'image') {
        content.push({ type: 'image_url', image_url: { url: await asDataUrl(blob, signal) } })
      } else {
        content.push({ type: 'text', text: `<attachment>\n${await blob.text()}\n</attachment>` })
      }
    }
    messages.push({ role: 'user', content })
  }
  // Standard Chat Completions continuation starts a user turn after the partial reply.
  if (messages.at(-1)?.role === 'assistant') {
    messages.push({
      role: 'user',
      content:
        'Continue from where your previous response ended, without repeating the existing content.',
    })
  }
  return messages
}

const usageFrom = (usage: NonNullable<Chunk['usage']>): MessageUsage => ({
  input_tokens: Math.max(
    0,
    (usage.prompt_tokens ?? 0) - (usage.prompt_tokens_details?.cached_tokens ?? 0)
  ),
  output_tokens: usage.completion_tokens ?? 0,
  cache_read_input_tokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
  cache_creation_input_tokens: 0,
})

export const toResponsesInput = (messages: OpenAIMessage[]) =>
  messages.map((message) => ({
    role: message.role,
    content:
      typeof message.content === 'string'
        ? message.content
        : message.content.map((part) =>
            part.type === 'text'
              ? { type: 'input_text', text: part.text }
              : { type: 'input_image', image_url: part.image_url.url, detail: 'auto' }
          ),
  }))

class ContentBlocks {
  private index = -1
  private active: 'text' | 'thinking' | null = null;
  *append(kind: 'text' | 'thinking', value: unknown): Generator<MessageStreamEvent> {
    if (typeof value !== 'string' || !value) {
      return
    }
    if (this.active !== kind) {
      yield* this.close()
      this.active = kind
      this.index++
      yield {
        type: 'content_block_start',
        index: this.index,
        content_block:
          kind === 'thinking'
            ? { type: 'thinking', thinking: '', signature: '' }
            : { type: 'text', text: '' },
      }
    }
    yield {
      type: 'content_block_delta',
      index: this.index,
      delta:
        kind === 'thinking'
          ? { type: 'thinking_delta', thinking: value }
          : { type: 'text_delta', text: value },
    }
  }
  *close(): Generator<MessageStreamEvent> {
    if (this.active) {
      yield { type: 'content_block_stop', index: this.index }
    }
    this.active = null
  }
}

/** Translate OpenAI deltas into content-block events, preserving reasoning order. */
export async function* streamMessage(
  apiKey: string,
  body: CreateMessageRequest,
  signal: AbortSignal,
  connection: Connection = { ...useSettings.getState(), apiKey }
): AsyncGenerator<MessageStreamEvent> {
  const messages = await toOpenAIMessages(body, signal)
  const responses = body.protocol === 'responses'
  const effort = body.reasoningEffort
  const payload = responses
    ? {
        model: body.model,
        input: toResponsesInput(messages),
        stream: true,
        store: false,
        ...(effort ? { reasoning: { effort, summary: 'auto' } } : {}),
      }
    : {
        model: body.model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
        ...(effort ? { reasoning_effort: effort } : {}),
      }
  const response = await request(
    `${normalizeBaseUrl(connection.baseUrl)}/${responses ? 'responses' : 'chat/completions'}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(payload),
      signal,
    }
  )
  if (!response.body || !response.headers.get('Content-Type')?.includes('text/event-stream')) {
    await response.body?.cancel()
    throw new ApiError('protocol', { key: 'apiExpectedStream' })
  }
  yield { type: 'message_start', message: { id: '', model: body.model } }
  const blocks = new ContentBlocks()
  let receivedText = false
  let receivedThinking = false
  let finished = false
  let stopReason: StopReason = 'end_turn'
  let usage: MessageUsage | undefined
  for await (const { data, event } of readServerSentEvents(response.body, signal)) {
    signal.throwIfAborted()
    if (data === '[DONE]') {
      if (!responses) {
        finished = true
      }
      break
    }
    let chunk: Chunk & ResponseEvent
    try {
      chunk = JSON.parse(data)
    } catch {
      throw new ApiError('protocol', { key: 'apiInvalidStream' })
    }
    if (!chunk || typeof chunk !== 'object') {
      throw new ApiError('protocol', { key: 'apiInvalidStream' })
    }
    if (chunk.error || event === 'error') {
      throw new ApiError('stream', chunk.error?.message || 'API stream error')
    }
    if (responses) {
      const type = chunk.type || event
      if (type === 'response.failed' || type === 'response.error') {
        throw new ApiError(
          'stream',
          chunk.response?.error?.message || chunk.message || 'API response failed'
        )
      }
      if (type === 'response.output_item.added' && /(?:_call|tool)/.test(chunk.item?.type ?? '')) {
        throw new ApiError('protocol', { key: 'apiToolUnsupported' })
      }
      if (type === 'response.output_text.delta') {
        receivedText ||= !!chunk.delta
        yield* blocks.append('text', chunk.delta)
      } else if (
        type === 'response.reasoning_summary_text.delta' ||
        type === 'response.reasoning_text.delta'
      ) {
        receivedThinking ||= !!chunk.delta
        yield* blocks.append('thinking', chunk.delta)
      } else if (type === 'response.refusal.delta') {
        stopReason = 'refusal'
      } else if (type === 'response.completed' || type === 'response.incomplete') {
        const result = chunk.response
        if (result?.error) {
          throw new ApiError('stream', result.error.message || 'API response failed')
        }
        if (type === 'response.incomplete') {
          if (result?.incomplete_details?.reason === 'content_filter') {
            stopReason = 'refusal'
          } else if (result?.incomplete_details?.reason === 'max_output_tokens') {
            stopReason = 'max_tokens'
          } else {
            throw new ApiError('interrupted', { key: 'apiStreamInterrupted' })
          }
        }
        if (result?.usage) {
          usage = usageFrom({
            prompt_tokens: result.usage.input_tokens,
            completion_tokens: result.usage.output_tokens,
            prompt_tokens_details: result.usage.input_tokens_details,
          })
        }
        for (const item of result?.output ?? []) {
          if (/(?:_call|tool)/.test(item.type)) {
            throw new ApiError('protocol', { key: 'apiToolUnsupported' })
          }
          if (item.type === 'message') {
            for (const part of item.content ?? []) {
              if (part.type === 'refusal') {
                stopReason = 'refusal'
              } else if (!receivedText && part.type === 'output_text') {
                yield* blocks.append('text', part.text)
              }
            }
          } else if (!receivedThinking && item.type === 'reasoning') {
            for (const part of item.summary ?? []) {
              yield* blocks.append('thinking', part.text)
            }
          }
        }
        finished = true
        break
      }
      continue
    }
    if (chunk.usage) {
      usage = usageFrom(chunk.usage)
    }
    const choice = chunk.choices?.find((c) => c.index === 0 || c.index === undefined)
    if (!choice) {
      continue
    }
    if (choice.delta?.tool_calls?.length) {
      throw new ApiError('protocol', { key: 'apiToolUnsupported' })
    }
    for (const [kind, value] of [
      ['thinking', choice.delta?.reasoning_content || choice.delta?.reasoning],
      ['text', choice.delta?.content],
    ] as const) {
      yield* blocks.append(kind, value)
    }
    if (choice.finish_reason) {
      finished = true
      stopReason =
        choice.finish_reason === 'length'
          ? 'max_tokens'
          : choice.finish_reason === 'content_filter'
            ? 'refusal'
            : choice.finish_reason === 'tool_calls'
              ? 'tool_use'
              : 'end_turn'
    }
  }
  signal.throwIfAborted()
  if (!finished) {
    throw new ApiError('interrupted', { key: 'apiStreamInterrupted' })
  }
  yield* blocks.close()
  yield {
    type: 'message_delta',
    delta: { stop_reason: stopReason, stop_sequence: null },
    ...(usage ? { usage } : {}),
  }
  yield { type: 'message_stop' }
}
