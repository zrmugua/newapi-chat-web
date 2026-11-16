import { translate, type TranslationMessage } from '../../i18n/index.js'
import { normalizeBaseUrl, type Connection } from '../connection.js'
import { useSettings } from '../settings.js'

export type ApiErrorKind = 'http' | 'stream' | 'network' | 'interrupted' | 'protocol'

export class ApiError extends Error {
  readonly localMessage?: TranslationMessage
  constructor(
    readonly kind: ApiErrorKind,
    message: string | TranslationMessage,
    readonly status?: number
  ) {
    super(typeof message === 'string' ? message : translate(message.key, message.params))
    this.name = 'ApiError'
    this.localMessage = typeof message === 'string' ? undefined : message
  }
}

export const readErrorResponse = async (response: Response): Promise<ApiError> => {
  const raw = await response.text().catch(() => '')
  let message = response.statusText
  try {
    const body = JSON.parse(raw)
    message =
      typeof body.error?.message === 'string'
        ? body.error.message
        : typeof body.message === 'string'
          ? body.message
          : message
  } catch {
    // Gateway HTML errors are represented by their HTTP status.
  }
  return new ApiError('http', message || `HTTP ${response.status}`, response.status)
}

export const request = async (url: string, init: RequestInit): Promise<Response> => {
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      redirect: 'error',
    })
  } catch (error) {
    if (init.signal?.aborted) {
      throw error
    }
    throw new ApiError('network', { key: 'apiNetworkHelp' })
  }
  if (!response.ok) {
    throw await readErrorResponse(response)
  }
  return response
}

export const loadModels = async (
  connection: Connection = useSettings.getState(),
  signal?: AbortSignal
): Promise<string[]> => {
  const response = await request(`${normalizeBaseUrl(connection.baseUrl)}/models`, {
    headers: { Authorization: `Bearer ${connection.apiKey ?? ''}` },
    signal,
  })
  const body = await response.json()
  if (!Array.isArray(body.data)) {
    throw new ApiError('protocol', { key: 'apiInvalidModels' })
  }
  return [
    ...new Set<string>(
      body.data.flatMap((model: { id?: unknown }) =>
        typeof model?.id === 'string' && model.id.trim() ? [model.id] : []
      )
    ),
  ].sort()
}
