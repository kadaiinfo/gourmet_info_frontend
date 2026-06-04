import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.jpg', 'logo_fill.svg'],
      manifest: {
        name: 'Cafe Map - 鹿児島ご飯屋さんマップ',
        short_name: 'Cafe Map',
        description: '鹿児島のご飯屋さんを地図で探せるアプリ',
        theme_color: '#000000',
        background_color: '#f0ede4',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: '/icon.jpg',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,json}'],
        // /api/* は SPA フォールバック対象外（お気に入りAPI等を SW にキャッシュ/横取りさせない）
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // ユーザー固有のお気に入りAPIは常にネットワーク（キャッシュしない）
            urlPattern: /^\/api\/favorites/,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/[^/]*cdninstagram\.com\//i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'instagram-images',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1週間
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
