import { defineConfig, Plugin } from 'vite'
import preact from '@preact/preset-vite'
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
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Only precache the app shell (JS/CSS chunks + root HTML/SVG).
        // Grammar, story, and picture HTML files are excluded here — they are
        // cached on first access via the CacheFirst runtime handler below.
        globPatterns: ['assets/**/*.{js,css}', '*.{html,svg,ico,woff,woff2}'],
        runtimeCaching: [
          {
            // index.json files: serve from cache immediately, revalidate in background
            urlPattern: /\/languages\/[^/]+\/[^/]+\/index\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'language-index',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            // stories, grammar, picture lessons: cache-first on first visit
            urlPattern: /\/(languages|picture-lessons|cross)\/.+\.(json|html)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'language-content',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
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
