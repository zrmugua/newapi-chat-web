import { normalizeBaseUrl, reasoningEfforts, type ReasoningEffort } from './connection.js'
import {
  setApiKey,
  setConnection,
  setModel,
  setProtocol,
  setReasoningEffort,
  useSettings,
} from './settings.js'

const baseNames = ['apiUrl', 'baseUrl', 'base_url', 'url']
const keyNames = ['apiKey', 'api_key', 'key']
const names = [...baseNames, ...keyNames, 'model', 'protocol', 'reasoning', 'reasoning_effort']
const usable = (value: string | null): value is string =>
  !!value?.trim() && !/\{[^}]*\}/.test(value)

/** Fragment parameters have priority; query parameters support New API presets. */
export const readPreset = (url: URL) => {
  const fragment = new URLSearchParams(url.hash.replace(/^#\??/, ''))
  const get = (aliases: string[]) => {
    for (const params of [fragment, url.searchParams]) {
      for (const name of aliases) {
        const value = params.get(name)
        if (usable(value)) {
          return value.trim()
        }
      }
    }
    return null
  }
  const rawBase = get(baseNames)
  return {
    baseUrl: rawBase ? normalizeBaseUrl(rawBase) : null,
    apiKey: get(keyNames),
    model: get(['model']),
  }
}

export const cleanPresetUrl = (input: URL): URL => {
  const url = new URL(input)
  names.forEach((name) => url.searchParams.delete(name))
  const fragment = new URLSearchParams(url.hash.replace(/^#\??/, ''))
  if (names.some((name) => fragment.has(name))) {
    names.forEach((name) => fragment.delete(name))
    url.hash = fragment.toString()
  }
  return url
}

/** Run before rendering or making API requests; remove credentials even on invalid input. */
export const importPreset = (): boolean => {
  const url = new URL(window.location.href)
  const clean = cleanPresetUrl(url)
  if (clean.href !== url.href) {
    window.history.replaceState(window.history.state, '', clean.href)
  }
  const preset = readPreset(url)
  const current = useSettings.getState()
  if (preset.baseUrl || preset.apiKey) {
    const baseUrl = preset.baseUrl || current.baseUrl
    if (baseUrl) {
      const sameBase =
        current.baseUrl && normalizeBaseUrl(current.baseUrl) === normalizeBaseUrl(baseUrl)
      setConnection(baseUrl, preset.apiKey || (sameBase ? current.apiKey : null))
    }
  }
  if (preset.model) {
    setModel(preset.model)
  }
  if (preset.apiKey && !preset.baseUrl && !current.baseUrl) {
    setApiKey(preset.apiKey)
  }
  const params = new URLSearchParams(url.hash.replace(/^#\??/, ''))
  const protocol = params.get('protocol') || url.searchParams.get('protocol')
  if (protocol === 'responses' || protocol === 'chat-completions') {
    setProtocol(protocol)
  }
  const effort =
    params.get('reasoning') ||
    params.get('reasoning_effort') ||
    url.searchParams.get('reasoning') ||
    url.searchParams.get('reasoning_effort')
  if (reasoningEfforts.includes(effort as ReasoningEffort)) {
    setReasoningEffort(effort as ReasoningEffort)
  }
  return !!(preset.baseUrl || preset.apiKey || preset.model)
}
