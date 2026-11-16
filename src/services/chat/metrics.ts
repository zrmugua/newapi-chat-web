import type { AssistantMessage } from './types.js'

export const getRequestMetrics = (message: AssistantMessage) => ({
  startedAt: message.requestStartedAt ?? message.createdAt,
  durationMs: message.durationMs,
  inputTokens: message.usage
    ? message.usage.input_tokens +
      message.usage.cache_read_input_tokens +
      message.usage.cache_creation_input_tokens
    : undefined,
  outputTokens: message.usage?.output_tokens,
})
