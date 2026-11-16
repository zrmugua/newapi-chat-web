import { create } from 'zustand'
import {
  normalizeBaseUrl,
  reasoningEfforts,
  type ApiProtocol,
  type ReasoningEffort,
} from './connection.js'

export type Locale = 'zh-CN' | 'en-US'
export type ThemePreference = 'light' | 'dark' | 'system'
type Settings = {
  apiKey: string | null
  baseUrl: string
  model: string
  models: string[]
  protocol: ApiProtocol
  reasoningEffort: ReasoningEffort
  locale: Locale
  themePreference: ThemePreference
  siderCollapsed: boolean
}
const KEYS = {
  apiKey: 'chat-demo:api-key',
  baseUrl: 'chat-demo:base-url',
  model: 'chat-demo:model',
  protocol: 'chat-demo:protocol',
  reasoningEffort: 'chat-demo:reasoning-effort',
  locale: 'chat-demo:locale',
  themePreference: 'chat-demo:theme-preference',
  siderCollapsed: 'chat-demo:sider-collapsed',
} as const

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const write = (key: string, value: string | null) => {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    /* Settings still work in memory when storage is unavailable. */
  }
}
const initialLocale = (): Locale => {
  const saved = read(KEYS.locale)
  if (saved === 'zh-CN' || saved === 'en-US') {
    return saved
  }
  return typeof navigator === 'undefined' || navigator.language.toLowerCase().startsWith('zh')
    ? 'zh-CN'
    : 'en-US'
}
const initialThemePreference = (): ThemePreference => {
  const saved = read(KEYS.themePreference)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}
const initialEffort = (): ReasoningEffort => {
  const saved = read(KEYS.reasoningEffort)
  return reasoningEfforts.includes(saved as ReasoningEffort) ? (saved as ReasoningEffort) : 'medium'
}

export const useSettings = create<Settings>(() => ({
  apiKey: read(KEYS.apiKey),
  baseUrl: read(KEYS.baseUrl) ?? __API_ORIGIN__,
  model: read(KEYS.model) ?? '',
  models: [],
  protocol: read(KEYS.protocol) === 'responses' ? 'responses' : 'chat-completions',
  reasoningEffort: initialEffort(),
  locale: initialLocale(),
  themePreference: initialThemePreference(),
  siderCollapsed: read(KEYS.siderCollapsed) === 'true',
}))

export const setLocale = (locale: Locale) => {
  write(KEYS.locale, locale)
  useSettings.setState({ locale })
}
export const setThemePreference = (themePreference: ThemePreference) => {
  write(KEYS.themePreference, themePreference)
  useSettings.setState({ themePreference })
}
export const setApiKey = (apiKey: string | null) => {
  write(KEYS.apiKey, apiKey)
  useSettings.setState({ apiKey, models: [] })
}
export const setConnection = (baseUrl: string, apiKey: string | null) => {
  const normalized = normalizeBaseUrl(baseUrl)
  write(KEYS.baseUrl, normalized)
  write(KEYS.apiKey, apiKey)
  useSettings.setState({ baseUrl: normalized, apiKey, models: [] })
}
export const setModel = (model: string) => {
  const value = model.trim()
  if (!value) {
    return
  }
  write(KEYS.model, value)
  useSettings.setState({ model: value })
}

export const resolveAvailableModel = (current: string, models: string[]) =>
  models.includes(current) ? current : (models[0] ?? '')

export const setProtocol = (protocol: ApiProtocol) => {
  write(KEYS.protocol, protocol)
  useSettings.setState({ protocol })
}
export const setReasoningEffort = (reasoningEffort: ReasoningEffort) => {
  write(KEYS.reasoningEffort, reasoningEffort)
  useSettings.setState({ reasoningEffort })
}
export const setSiderCollapsed = (siderCollapsed: boolean) => {
  write(KEYS.siderCollapsed, String(siderCollapsed))
  useSettings.setState({ siderCollapsed })
}
