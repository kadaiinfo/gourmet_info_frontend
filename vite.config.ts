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
        name: 'グルメインフォ - 鹿児島飲食店マップ',
        short_name: 'グルメインフォ',
        description: '鹿児島の飲食店を地図で探せるアプリ',
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
        // アプリ画面で使わない大きな画像は precache しない。
        // （初回訪問時に SW が数MBを裏で取得し、地図タイル等と帯域を奪い合うため）
        // OGP.png は SNS クローラー用なので配信はそのまま。
        globIgnores: [
          '**/OGP.png',
          '**/information_map.png',
          '**/location.png',
          '**/test_logo.png',
          '**/logo_orange.svg',
        ],
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
  build: {
    rollupOptions: {
      output: {
        // 巨大なライブラリを別チャンクに分け、並列ダウンロードとアプリ更新時のキャッシュ再利用を効かせる
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('maplibre-gl')) return 'maplibre'
          if (id.includes('@clerk')) return 'clerk'
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) return 'react'
        },
      },
    },
  },
})
