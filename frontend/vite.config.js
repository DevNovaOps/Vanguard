import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Codes that are expected "client disconnected" non-errors in a dev WS proxy
const IGNORED_CODES = new Set(['ECONNABORTED', 'ECONNRESET', 'EPIPE', 'ENOTFOUND']);

function isBenign(err) {
  return IGNORED_CODES.has(err?.code) || IGNORED_CODES.has(err?.errno);
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        configure: (proxy) => {
          // Swallow benign disconnect errors so they don't spam the terminal
          proxy.on('error', (err) => {
            if (!isBenign(err)) console.log('[vite] API proxy error:', err.message);
          });
        }
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          // HTTP-level proxy errors (polling fallback)
          proxy.on('error', (err) => {
            if (!isBenign(err)) console.log('[vite] socket.io proxy error:', err.message);
          });

          // WS upgrade — attach error handlers to both ends of the tunnel
          proxy.on('proxyReqWs', (_proxyReq, _req, socket, _options, _head) => {
            // client-side socket (browser → Vite)
            socket.on('error', (err) => {
              if (!isBenign(err)) console.log('[vite] WS client socket error:', err.message);
            });
          });

          // upstream socket (Vite → backend Express/Socket.IO)
          proxy.on('open', (proxySocket) => {
            proxySocket.on('error', (err) => {
              if (!isBenign(err)) console.log('[vite] WS upstream socket error:', err.message);
            });
          });
        }
      }
    }
  }
})

