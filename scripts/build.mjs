import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const cli = fileURLToPath(new URL('../node_modules/@rspack/cli/bin/rspack.js', import.meta.url))
const result = spawnSync(process.execPath, [cli, 'build', '-c', 'rspack.config.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
})
if (result.error) throw result.error
process.exit(result.status ?? 1)
