export type PreviewKind = 'html' | 'svg'

export const previewKind = (language: string, code: string): PreviewKind | null => {
  const lang = language.trim().toLowerCase().split(/\s+/)[0]
  if (['html', 'htm'].includes(lang)) {
    return 'html'
  }
  if (lang === 'svg') {
    return 'svg'
  }
  if (lang === 'xml' && /^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(code)) {
    return 'svg'
  }
  return null
}

/** The first CSP applies even when generated markup contains its own head or policy. */
export const buildPreviewDocument = (code: string, kind: PreviewKind, scripts: boolean): string => {
  const policy = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    'img-src data: blob:',
    'font-src data:',
    scripts ? "script-src 'unsafe-inline' 'unsafe-eval'" : "script-src 'none'",
    "connect-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
  ].join('; ')
  const metadata = `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1">`
  if (kind === 'svg') {
    return `<!doctype html><html><head>${metadata}<style>html,body{margin:0;min-height:100%;background:white}body{display:grid;place-items:center;min-height:300px;padding:16px;box-sizing:border-box}svg{max-width:100%;height:auto}</style></head><body>${code}</body></html>`
  }
  return `<!doctype html>${metadata}${code}`
}
