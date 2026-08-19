import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const svgPath = path.join(root, 'public/logo.svg')
const outDir = path.join(root, 'public')
const background = '#ffffff'

await mkdir(outDir, { recursive: true })

async function writePng(name, size, padding = 0) {
  const inner = Math.max(1, Math.round(size * (1 - padding * 2)))
  const border = Math.round((size - inner) / 2)
  await sharp(svgPath)
    .resize(inner, inner, { fit: 'contain', background })
    .extend({
      top: border,
      bottom: size - inner - border,
      left: border,
      right: size - inner - border,
      background,
    })
    .png()
    .toFile(path.join(outDir, name))
}

await writePng('pwa-64x64.png', 64)
await writePng('pwa-192x192.png', 192)
await writePng('pwa-512x512.png', 512)
await writePng('maskable-icon-512x512.png', 512, 0.12)
await writePng('apple-touch-icon.png', 180, 0.05)
await writePng('favicon-48x48.png', 48)

console.log('generated PWA icons in public/')
