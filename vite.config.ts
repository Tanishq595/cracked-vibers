import 'dotenv/config'
import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
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
import searchExaHandler from './api/search-exa'
import searchLibraryHandler from './api/search-library'

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
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>)
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
  '/api/search-exa': runVercelHandlerWithBody(searchExaHandler),
  '/api/search-library': runVercelHandlerWithBody(searchLibraryHandler),
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
    const req: VercelReq = {
      method: nodeReq.method,
      headers: nodeReq.headers as Record<string, string | string[] | undefined>,
      body: body ?? undefined,
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

// Copy PDF.js worker to public so it's served from same origin (avoids CDN/CORS issues)
function copyPdfWorker() {
  const src = path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.js')
  const dest = path.resolve(__dirname, 'public/pdf.worker.min.js')
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'copy-pdf-worker',
      buildStart() {
        copyPdfWorker()
      },
      configureServer() {
        copyPdfWorker()
      },
    },
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
