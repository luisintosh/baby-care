import { execSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** The commit being built (CI sets GITHUB_SHA), else local HEAD, else a timestamp. */
function buildId() {
  const sha = process.env.GITHUB_SHA
  if (sha) return sha.slice(0, 12)
  try {
    return execSync('git rev-parse --short=12 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return String(Date.now())
  }
}

/**
 * Stamps the service worker's cache name with the build id, so each deploy
 * replaces the cached shell, icons and fonts on installed phones without a
 * hand-edited version bump.
 */
function stampServiceWorker(): Plugin {
  let outDir = 'dist'
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const file = path.join(outDir, 'sw.js')
      const source = await readFile(file, 'utf8')
      if (!source.includes('__BUILD_ID__')) {
        throw new Error('sw.js has no __BUILD_ID__ placeholder to stamp')
      }
      await writeFile(file, source.replaceAll('__BUILD_ID__', buildId()))
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stampServiceWorker()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
