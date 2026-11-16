import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeBaseUrl } from '../src/services/connection.ts'
import { buildPreviewDocument, previewKind } from '../src/services/markdown/preview.ts'

test('normalizes gateway roots, prefixes and full completion endpoints', () => {
  assert.equal(normalizeBaseUrl('https://gateway.example/'), 'https://gateway.example/v1')
  assert.equal(normalizeBaseUrl('https://gateway.example/v1/'), 'https://gateway.example/v1')
  assert.equal(
    normalizeBaseUrl('https://gateway.example/relay/v1/chat/completions'),
    'https://gateway.example/relay/v1'
  )
  assert.equal(normalizeBaseUrl('http://localhost:3000/api'), 'http://localhost:3000/api/v1')
})

test('rejects credentials, executable protocols, and ambiguous API queries', () => {
  for (const value of [
    'javascript:alert(1)',
    'file:///tmp/test',
    'https://user:pass@gateway.example',
    'https://gateway.example?api_key=secret',
    'https://gateway.example/#key',
  ]) {
    assert.throws(() => normalizeBaseUrl(value))
  }
})

test('recognizes previewable fenced languages and SVG XML', () => {
  assert.equal(previewKind('HTML', '<main>Hello</main>'), 'html')
  assert.equal(previewKind('svg', '<svg/>'), 'svg')
  assert.equal(previewKind('xml', '<svg viewBox="0 0 10 10"></svg>'), 'svg')
  assert.equal(previewKind('xml', '<config/>'), null)
  assert.equal(previewKind('javascript', 'alert(1)'), null)
})

test('generated preview places a restrictive policy before all model markup', () => {
  const code =
    '<html><head><meta http-equiv="Content-Security-Policy" content="default-src *"></head><body>Hello</body></html>'
  const result = buildPreviewDocument(code, 'html', false)
  assert.ok(result.indexOf("default-src 'none'") < result.indexOf(code))
  for (const directive of [
    "script-src 'none'",
    "connect-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ])
    assert.ok(result.includes(directive))
  const interactive = buildPreviewDocument('<svg/>', 'svg', true)
  assert.ok(interactive.includes("script-src 'unsafe-inline'"))
  assert.ok(interactive.includes("connect-src 'none'"))
})
