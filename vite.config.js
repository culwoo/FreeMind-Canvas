import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 3001,
    open: true,
    cors: true,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, '/v1'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // API 키를 환경변수에서 가져오기  
            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
              console.error('❌ ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다!');
              return;
            }
            proxyReq.setHeader('x-api-key', apiKey);
            proxyReq.setHeader('anthropic-version', '2023-06-01');
            proxyReq.setHeader('content-type', 'application/json');
            proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true');
            console.log('Vite 프록시: API 키 헤더 추가됨', {
              path: proxyReq.path,
              headers: { 'x-api-key': '***설정됨***' }
            });
          });
          
          proxy.on('error', (err, req, res) => {
            console.error('Vite 프록시 에러:', err);
          });
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js']
  }
});