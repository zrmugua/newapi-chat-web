import assert from 'node:assert/strict'
import { test } from 'node:test'

Object.assign(globalThis, { __API_ORIGIN__: '', __DEFAULT_MODEL__: 'deepseek-chat' })
const memory = new Map<string, string>()
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  },
})
const { readPreset, cleanPresetUrl, importPreset } = await import('../src/services/preset.ts')
const { useSettings, setConnection } = await import('../src/services/settings.ts')
const locate = (href: string) => {
  const location = { href }
  Object.assign(globalThis, {
    window: {
      location,
      history: {
        state: null,
        replaceState: (_state: unknown, _title: string, value: string) => {
          location.href = value
        },
      },
    },
  })
  return location
}

test('imports screenshot-style and percent-encoded New API presets', () => {
  const preset = readPreset(
    new URL(
      'https://chat.example/?apiUrl=https%3A%2F%2Fgateway.example&apiKey=sk-test&model=deepseek-v4-pro'
    )
  )
  assert.deepEqual(preset, {
    baseUrl: 'https://gateway.example/v1',
    apiKey: 'sk-test',
    model: 'deepseek-v4-pro',
  })
})

test('supports fragment credentials with priority over query values', () => {
  const preset = readPreset(
    new URL(
      'https://chat.example/?key=query#apiUrl=https://gateway.example&apiKey=fragment&model=model-a'
    )
  )
  assert.equal(preset.apiKey, 'fragment')
  assert.equal(preset.model, 'model-a')
})

test('ignores unresolved New API placeholders', () => {
  const preset = readPreset(
    new URL('https://chat.example/?apiUrl={address}&apiKey={key}&model={model}')
  )
  assert.deepEqual(preset, { baseUrl: null, apiKey: null, model: null })
})

test('cleans all credential aliases while retaining unrelated URL state', () => {
  const url = cleanPresetUrl(
    new URL(
      'https://chat.example/?key=x&apiKey=y&api_key=z&apiUrl=https://a.example&source=console#key=q&tab=chat'
    )
  )
  assert.equal(url.search, '?source=console')
  assert.equal(url.hash, '#tab=chat')
})

test('replaces the address and key atomically before rendering', () => {
  const location = locate(
    'https://chat.example/?apiUrl=https://new.example&apiKey=sk-new&model=model-a'
  )
  importPreset()
  assert.equal(useSettings.getState().baseUrl, 'https://new.example/v1')
  assert.equal(useSettings.getState().apiKey, 'sk-new')
  assert.equal(useSettings.getState().model, 'model-a')
  assert.equal(location.href, 'https://chat.example/')
})

test('switching API origin clears the old key if the preset omits credentials', () => {
  setConnection('https://old.example', 'sk-old')
  locate('https://chat.example/?apiUrl=https://new.example')
  importPreset()
  assert.equal(useSettings.getState().apiKey, null)
})

test('invalid imported addresses still remove credentials from the address bar', () => {
  const location = locate('https://chat.example/?apiUrl=javascript:alert(1)&apiKey=sk-invalid')
  assert.throws(importPreset)
  assert.equal(location.href, 'https://chat.example/')
})

test('imports Responses protocol and reasoning effort from a New API fragment', () => {
  const location = locate(
    'https://chat.example/#apiUrl=https://gateway.example&apiKey=sk-test&protocol=responses&reasoning=xhigh'
  )
  importPreset()
  assert.equal(useSettings.getState().protocol, 'responses')
  assert.equal(useSettings.getState().reasoningEffort, 'xhigh')
  assert.equal(location.href, 'https://chat.example/')
})
