import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'favicon-180.png', 'favicon-512.png'],
      manifest: {
        name: 'Lukumaku',
        short_name: 'Lukumaku',
        description: 'Jokainen kirja on makuasia. Henkilökohtainen lukupäiväkirja.',
        // Matches the brand cream/brown palette from public/lukumaku-icon.svg.
        background_color: '#f6f1e6',
        theme_color: '#6e5d43',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/favicon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/lukumaku-icon-1024.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache the app shell so the journal opens even without a signal;
        // journal data itself already works offline via LocalStorage in
        // local mode, or is simply unavailable offline in Supabase mode.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
});
