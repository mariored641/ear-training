import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'

const JJAZZLAB_SF2 = 'C:/Program Files/JJazzLab/jjazzlab/modules/soundfont/JJazzLab-SoundFont.sf2'
const JJAZZLAB_STYLES_DIR = 'C:/Users/DELL/JJazzLab/Rhythms'
const JJAZZLAB_APPDATA_DIR = 'C:/Users/DELL/AppData/Roaming/jjazzlab/5.1/.jjazz/Default'

function styleServPlugin() {
  return {
    name: 'serve-jjazzlab-styles',
    configureServer(server) {
      // Serve .sty files: /styles/<path> → from JJAZZLAB_STYLES_DIR/<path>
      server.middlewares.use('/styles/', (req, res, next) => {
        const filePath = JJAZZLAB_STYLES_DIR + decodeURIComponent(req.url)
        try {
          const stat = fs.statSync(filePath)
          res.setHeader('Content-Type', 'application/octet-stream')
          res.setHeader('Content-Length', stat.size)
          res.setHeader('Access-Control-Allow-Origin', '*')
          fs.createReadStream(filePath).pipe(res)
        } catch {
          next()
        }
      })
      // Also serve from JJazzLab AppData: /styles-appdata/<path>
      server.middlewares.use('/styles-appdata/', (req, res, next) => {
        const filePath = JJAZZLAB_APPDATA_DIR + decodeURIComponent(req.url)
        try {
          const stat = fs.statSync(filePath)
          res.setHeader('Content-Type', 'application/octet-stream')
          res.setHeader('Content-Length', stat.size)
          res.setHeader('Access-Control-Allow-Origin', '*')
          fs.createReadStream(filePath).pipe(res)
        } catch {
          next()
        }
      })
    }
  }
}

function soundfontServPlugin() {
  return {
    name: 'serve-jjazzlab-soundfont',
    configureServer(server) {
      server.middlewares.use('/soundfonts/JJazzLab-SoundFont.sf2', (req, res, next) => {
        try {
          const stat = fs.statSync(JJAZZLAB_SF2)
          const size = stat.size
          const range = req.headers['range']
          res.setHeader('Content-Type', 'application/octet-stream')
          res.setHeader('Accept-Ranges', 'bytes')
          res.setHeader('Access-Control-Allow-Origin', '*')
          if (range) {
            const [, s, e] = /bytes=(\d+)-(\d*)/.exec(range) || []
            const start = parseInt(s, 10)
            const end = e ? parseInt(e, 10) : size - 1
            res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
            res.setHeader('Content-Length', end - start + 1)
            res.statusCode = 206
            fs.createReadStream(JJAZZLAB_SF2, { start, end }).pipe(res)
          } else {
            res.setHeader('Content-Length', size)
            fs.createReadStream(JJAZZLAB_SF2).pipe(res)
          }
        } catch (err) {
          next(err)
        }
      })
    }
  }
}

export default defineConfig({
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
  },
  plugins: [
    react(),
    soundfontServPlugin(),
    styleServPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['*.png', '*.jpg', '*.svg'],
      manifest: {
        name: 'Ear Training - אלתור בהישג יד',
        short_name: 'Ear Training',
        description: 'Ear Training Application for Music Students',
        theme_color: '#1a1a2e',
        background_color: '#0f0f1e',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'wide'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/tonejs\.github\.io\/audio\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-samples-tonejs',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/gleitz\.github\.io\/midi-js-soundfonts\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-samples-gleitz',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/storage\.googleapis\.com\/magentadata\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'magenta-soundfonts',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'jsdelivr-scripts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
})
