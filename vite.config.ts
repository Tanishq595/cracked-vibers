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
import storageDeleteHandler from './api/storage-delete'
import storageListHandler from './api/storage-list'
import storageDownloadUrlHandler from './api/storage-download-url'
import chatHandler from './api/chat'
import synthesizeHandler from './api/synthesize'
import narrateHandler from './api/narrate'
import videoHandler from './api/video'
import musicHandler from './api/music'
import masteryGetHandler from './api/mastery-get'
import masteryUpdateHandler from './api/mastery-update'
import questionsHandler from './api/questions'
import synthesesListHandler from './api/syntheses-list'
import synthesisGetHandler from './api/synthesis-get'
import oralSessionHandler from './api/oral-session'
import ttsElevenHandler from './api/tts-eleven'
import coachResponseHandler from './api/coach-response'
import canvasFetchHandler from './api/canvas-fetch'
import canvasAuthUrlHandler from './api/canvas-auth-url'
import canvasCallbackHandler from './api/canvas-callback'
import googleClassroomAuthHandler from './api/google-classroom-auth'
import googleClassroomAuthCallbackHandler from './api/google-classroom-auth-callback'

function readBody(nodeReq: Connect.IncomingMessage): Promise<Record<string, unknown> | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    nodeReq.on('data', (chunk: Buffer) => chunks.push(chunk))
    nodeReq.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw.trim()) {
        resolve(null)
        return
      }
      const contentType = (nodeReq.headers['content-type'] ?? '') as string
      try {
        if (contentType.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(raw)
          const out: Record<string, unknown> = {}
          params.forEach((v, k) => { out[k] = v })
          resolve(out)
        } else {
          resolve(JSON.parse(raw) as Record<string, unknown>)
        }
      } catch {
        resolve(null)
      }
    })
    nodeReq.on('error', reject)
  })
}

const API_HANDLERS: Record<string, (req: Connect.IncomingMessage, res: Connect.ServerResponse) => Promise<void>> = {
  '/api/init-user': runVercelHandler(initUserHandler),
  '/api/db-test': runVercelHandler(dbTestHandler),
  '/api/me': runVercelHandler(meHandler),
  '/api/health': runVercelHandler(healthHandler),
  '/api/storage-upload-url': runVercelHandlerWithBody(storageUploadUrlHandler),
  '/api/storage-delete': runVercelHandlerWithBody(storageDeleteHandler),
  '/api/storage-list': runVercelHandlerWithBody(storageListHandler),
  '/api/storage-download-url': runVercelHandlerWithBody(storageDownloadUrlHandler),
  '/api/chat': runVercelHandlerWithBody(chatHandler),
  '/api/synthesize': runVercelHandlerWithBody(synthesizeHandler),
  '/api/narrate': runVercelHandlerWithBody(narrateHandler),
  '/api/video': runVercelHandlerWithBody(videoHandler),
  '/api/music': runVercelHandlerWithBody(musicHandler),
  '/api/mastery-get': runVercelHandlerWithBody(masteryGetHandler),
  '/api/mastery-update': runVercelHandlerWithBody(masteryUpdateHandler),
  '/api/questions': runVercelHandlerWithBody(questionsHandler),
  '/api/syntheses-list': runVercelHandlerWithBody(synthesesListHandler),
  '/api/synthesis-get': runVercelHandlerWithBody(synthesisGetHandler),
  '/api/oral-session': runVercelHandlerWithBody(oralSessionHandler),
  '/api/tts-eleven': runVercelHandlerWithBody(ttsElevenHandler),
  '/api/coach-response': runVercelHandlerWithBody(coachResponseHandler),
  '/api/canvas/fetch': runVercelHandlerGet(canvasFetchHandler),
  '/api/canvas/auth-url': runVercelHandlerWithBody(canvasAuthUrlHandler),
  '/api/canvas/callback': runVercelHandlerGetWithRedirect(canvasCallbackHandler),
  '/api/google-classroom-auth': runVercelHandlerGetWithRedirect(googleClassroomAuthHandler),
  '/api/google-classroom-auth/callback': runVercelHandlerGetWithRedirect(googleClassroomAuthCallbackHandler),
}

type VercelReq = {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
  query?: Record<string, string | string[] | undefined>
}
type VercelRes = { status: (n: number) => { json: (b: object) => void } }

function runVercelHandler(handler: (req: VercelReq, res: VercelRes) => Promise<void>) {
  return async (nodeReq: Connect.IncomingMessage, nodeRes: Connect.ServerResponse) => {
    const req: VercelReq = {
      method: nodeReq.method,
      headers: nodeReq.headers as Record<string, string | string[] | undefined>,
    }
    const res: VercelRes = {
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

function runVercelHandlerGet(handler: (req: VercelReq, res: VercelRes) => Promise<void>) {
  return async (nodeReq: Connect.IncomingMessage, nodeRes: Connect.ServerResponse) => {
    const url = nodeReq.url ?? ''
    const q = url.includes('?') ? url.split('?')[1] : ''
    const query: Record<string, string | string[]> = {}
    if (q) {
      for (const part of q.split('&')) {
        const [k, v] = part.split('=')
        if (k) query[decodeURIComponent(k)] = v ? decodeURIComponent(v) : ''
      }
    }
    const req: VercelReq = {
      method: nodeReq.method,
      headers: nodeReq.headers as Record<string, string | string[] | undefined>,
      query,
    }
    const res: VercelRes = {
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

function runVercelHandlerGetWithRedirect(
  handler: (req: VercelReq, res: VercelRes & { redirect: (url: string) => void }) => Promise<void>
) {
  return async (nodeReq: Connect.IncomingMessage, nodeRes: Connect.ServerResponse) => {
    const url = nodeReq.url ?? ''
    const q = url.includes('?') ? url.split('?')[1] : ''
    const query: Record<string, string | string[]> = {}
    if (q) {
      for (const part of q.split('&')) {
        const [k, v] = part.split('=')
        if (k) query[decodeURIComponent(k)] = v ? decodeURIComponent(v) : ''
      }
    }
    const req: VercelReq = {
      method: nodeReq.method,
      headers: nodeReq.headers as Record<string, string | string[] | undefined>,
      query,
    }
    const res: VercelRes & { redirect: (url: string) => void; setHeader?: (name: string, value: string | string[]) => void } = {
      status(code: number) {
        nodeRes.statusCode = code
        return {
          json(body: object) {
            nodeRes.setHeader('Content-Type', 'application/json')
            nodeRes.end(JSON.stringify(body))
          },
        }
      },
      setHeader(name: string, value: string | string[]) {
        nodeRes.setHeader(name, value)
      },
      redirect(redirectUrl: string) {
        nodeRes.statusCode = 302
        nodeRes.setHeader('Location', redirectUrl)
        nodeRes.end()
      },
    }
    await handler(req, res)
  }
}

function runVercelHandlerWithBody(handler: (req: VercelReq, res: VercelRes) => Promise<void>) {
  return async (nodeReq: Connect.IncomingMessage, nodeRes: Connect.ServerResponse) => {
    let body: Record<string, unknown> | null = null
    if (nodeReq.method === 'POST' || nodeReq.method === 'PUT' || nodeReq.method === 'PATCH') {
      body = await readBody(nodeReq)
    }
    const url = nodeReq.url ?? ''
    const q = url.includes('?') ? url.split('?')[1] : ''
    const query: Record<string, string | string[]> = {}
    if (q) {
      for (const part of q.split('&')) {
        const [k, v] = part.split('=')
        if (k) query[decodeURIComponent(k)] = v ? decodeURIComponent(v) : ''
      }
    }
    // Preserve Authorization from rawHeaders (proxy or Node may lowercase/drop it)
    const headers = { ...nodeReq.headers } as Record<string, string | string[] | undefined>
    const raw = nodeReq.rawHeaders
    if (raw && !headers.authorization && !headers.Authorization) {
      for (let i = 0; i < raw.length - 1; i += 2) {
        if (raw[i].toLowerCase() === 'authorization') {
          headers.authorization = raw[i + 1]
          break
        }
      }
    }
    const req: VercelReq = {
      method: nodeReq.method,
      headers,
      body: body ?? undefined,
      query,
    }
    const res: VercelRes & { redirect?: (url: string) => void } = {
      status(code: number) {
        nodeRes.statusCode = code
        return {
          json(body: object) {
            nodeRes.setHeader('Content-Type', 'application/json')
            nodeRes.end(JSON.stringify(body))
          },
        }
      },
      redirect(url: string) {
        nodeRes.statusCode = 302
        nodeRes.setHeader('Location', url)
        nodeRes.end()
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
    port: 3000,
    // Only proxy /api when VITE_API_URL is set (e.g. separate backend). Otherwise api-dev handles /api and keeps headers.
    proxy: process.env.VITE_API_URL
      ? {
          '/api': {
            target: process.env.VITE_API_URL,
            changeOrigin: true,
            configure(proxy) {
              proxy.on('proxyReq', (proxyReq, req: Connect.IncomingMessage) => {
                const h = req.headers?.authorization ?? req.headers?.Authorization
                if (h) proxyReq.setHeader('Authorization', typeof h === 'string' ? h : h[0] ?? '')
              })
            },
          },
        }
      : undefined,
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
