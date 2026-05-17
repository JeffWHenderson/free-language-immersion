import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join, resolve } from 'path'

function minifyPublicJson(): Plugin {
  let outDir = 'dist'
  return {
    name: 'minify-public-json',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      function walk(dir: string) {
        let entries: string[]
        try { entries = readdirSync(dir) } catch { return }
        for (const entry of entries) {
          const full = join(dir, entry)
          if (statSync(full).isDirectory()) {
            walk(full)
          } else if (entry.endsWith('.json')) {
            try {
              writeFileSync(full, JSON.stringify(JSON.parse(readFileSync(full, 'utf-8'))))
            } catch { /* leave malformed files alone */ }
          }
        }
      }
      walk(resolve(outDir))
    },
  }
}

export default defineConfig({
  plugins: [
    minifyPublicJson(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff,woff2}'],
      },
      manifest: {
        name: 'Free Immersion',
        short_name: 'FreeImmersion',
        description: 'Language learning with spaced repetition',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/bike-svgrepo-com.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
})
