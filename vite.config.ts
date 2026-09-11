import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// O PWA do protótipo era um service worker escrito à mão, com a lista de
// arquivos fixa no código (`./app.js`, `./styles.css`). Isso não sobrevive ao
// build: o Vite gera nomes com hash, os caminhos antigos dão 404, e como o
// `cache.addAll()` rejeita inteiro se um único arquivo falhar, o service
// worker simplesmente nunca instalaria — o PWA quebraria em silêncio.
//
// O plugin resolve isso gerando a lista de precache a cada build, já com os
// nomes com hash. O manifesto abaixo é o mesmo do protótipo, preservado.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/logo-empregae.svg'],
      manifest: {
        name: 'Empregaê',
        short_name: 'Empregaê',
        description:
          'Encontre profissionais informais perto do seu endereço e cadastre serviços gratuitamente.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#fbfcf8',
        theme_color: '#183c34',
        orientation: 'portrait-primary',
        lang: 'pt-BR',
        categories: ['business', 'productivity', 'social'],
        icons: [
          {
            src: 'assets/logo-empregae.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],

        // O hero tem 2,3 MB e fica FORA do precache de propósito. Precachear
        // significa baixar tudo na instalação do PWA, antes da primeira tela —
        // e o público-alvo acessa por dados móveis. Ele é cacheado abaixo, na
        // primeira vez que aparecer, e não atrasa quem só quer buscar um
        // eletricista.
        //
        // (A imagem em si deveria ser otimizada; 2,3 MB para um hero é muito
        // em qualquer cenário. Fica como melhoria separada.)
        globIgnores: ['**/hero-workers.png'],

        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'imagens',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],

        // O app depende de dados ao vivo do Supabase. Servir resposta de API
        // do cache mostraria mensagem e resultado de busca desatualizados, que
        // é pior do que mostrar erro de conexão.
        navigateFallbackDenylist: [/^\/api/, /supabase/],
      },
      devOptions: {
        // Desligado em dev: service worker em desenvolvimento serve versão
        // antiga do código e gera "mas eu acabei de salvar o arquivo".
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
  },
})
