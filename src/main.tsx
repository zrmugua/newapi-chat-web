import { createRoot } from 'react-dom/client'
import { App } from './app/App.js'
import { setupTheme } from './app/theme.js'
import { ensureKatex } from './services/markdown/katex.js'
import { importPreset } from './services/preset.js'
import { showToast } from './components/base/toastState.js'
import './app/theme.css'
import './app/global.css'

try {
  importPreset()
} catch {
  showToast({ key: 'presetInvalid', type: 'error' })
}
ensureKatex()
setupTheme()

createRoot(document.getElementById('root') as HTMLElement).render(<App />)
