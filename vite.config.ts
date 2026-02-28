import 'dotenv/config'
import { defineConfig } from 'vite'
import path from 'path'
import type { Connect } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import initUserHandler from './api/init-user'
import dbTestHandler from './api/db-test'
import meHandler from './api/me'
import healthHandler from './api/health'
import storageUploadUrlHandler from './api/storage-upload-url'

const API_HANDLERS: Record<string, (req: Connect.IncomingMessage, res: Connect.ServerResponse) => Promise<void>> = {
  '/api/init-user': runVercelHandler(initUserHandler),
  '/api/db-test': runVercelHandler(dbTestHandler),
  '/api/me': runVercelHandler(meHandler),
  '/api/health': runVercelHandler(healthHandler),
  '/api/storage-upload-url': runVercelHandler(storageUploadUrlHandler),
}

function runVercelHandler(
  handler: (req: { method?: string; headers: Record<string, string | string[] | undefined> }, res: { status: (n: number) => { json: (b: object) => void } }) => Promise<void>
) {
  return async (nodeReq: Connect.IncomingMessage, nodeRes: Connect.ServerResponse) => {
    const req = {
      method: nodeReq.method,
      headers: nodeReq.headers as Record<string, string | string[] | undefined>,
    }
    const res = {
      status(code: number) {
        nodeRes.statusCode = code
        return {
          json(body: object) {
            nodeRes.setHeader('Content-Type', 'application/json')
            nodeRes.end(JSON.stringify(body))
          },
        }
      },
    }
    await handler(req, res)
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'api-dev',
      configureServer(server) {
        server.middlewares.use(async (nodeReq: Connect.IncomingMessage, nodeRes: Connect.ServerResponse, next: Connect.NextFunction) => {
          const url = nodeReq.url?.split('?')[0] ?? ''
          const run = API_HANDLERS[url]
          if (!run) return next()
          try {
            await run(nodeReq, nodeRes)
          } catch (err) {
            console.error('[api-dev]', err)
            nodeRes.statusCode = 500
            nodeRes.setHeader('Content-Type', 'application/json')
            nodeRes.end(JSON.stringify({ error: 'Internal server error' }))
          }
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    proxy: process.env.VITE_API_URL
      ? {
          '/api': {
            target: process.env.VITE_API_URL,
            changeOrigin: true,
          },
        }
      : undefined,
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
