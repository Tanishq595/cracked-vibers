import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { handleInitUser } from './server/init-user'
import { handleDbTest } from './server/db-test'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    // Handle /api in dev (init-user, db-test) without a separate backend
    {
      name: 'api-handlers',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url?.split('?')[0]
          if (url === '/api/init-user' && req.method === 'POST') {
            const auth = req.headers.authorization ?? null
            const { status, body } = await handleInitUser(auth)
            res.statusCode = status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(body))
            return
          }
          if (url === '/api/db-test' && req.method === 'GET') {
            const { status, body } = await handleDbTest()
            res.statusCode = status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(body))
            return
          }
          next()
        })
      },
    },
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Proxy other /api requests to a backend (e.g. Next.js on 3000). /api/init-user is handled above in dev.
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
