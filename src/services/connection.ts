/** Normalize an OpenAI-compatible API root while preserving gateway subpaths. */
export const normalizeBaseUrl = (value: string): string => {
  const url = new URL(value.trim())
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Use an HTTP(S) API address without embedded credentials.')
  }
  if (url.search || url.hash) {
    throw new Error('Use an API base address without query parameters or a fragment.')
  }
  const path = url.pathname.replace(/\/+$/, '').replace(/\/(?:chat\/completions|responses)$/i, '')
  url.pathname = /\/v\d+(?:beta)?$/i.test(path) ? path : `${path}/v1`
  return url.toString().replace(/\/$/, '')
}

export type Connection = { apiKey: string | null; baseUrl: string }
export type ApiProtocol = 'chat-completions' | 'responses'
export const reasoningEfforts = ['low', 'medium', 'high', 'xhigh'] as const
export type ReasoningEffort = (typeof reasoningEfforts)[number]
