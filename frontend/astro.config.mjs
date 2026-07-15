// astro.config.mjs
import { defineConfig } from 'astro/config';


//re-routing to flask server
export default defineConfig({
  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  },
});