import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { forwardToGemini } from './lib/geminiForward.js'

// Di produksi, /api/gemini dilayani serverless function Vercel. Server dev Vite tidak
// menjalankan folder api/, jadi plugin ini menirukan endpoint yang sama secara lokal
// memakai logika penerus yang sama. Key dibaca dari env server (GEMINI_API_KEY), dengan
// fallback ke VITE_GEMINI_API_KEY agar .env lama tetap berfungsi saat dev.
const devGeminiApi = (env) => ({
  name: 'dev-gemini-api',
  configureServer(server) {
    server.middlewares.use('/api/gemini', (req, res, next) => {
      if (req.method !== 'POST') return next();
      let raw = '';
      req.on('data', (c) => { raw += c; });
      req.on('end', async () => {
        try {
          const { model, payload } = JSON.parse(raw || '{}');
          const result = await forwardToGemini({ model, payload, apiKey: env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY });
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(result.text ?? JSON.stringify(result.json));
        } catch (e) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: { message: 'dev proxy error: ' + (e.message || '') } }));
        }
      });
    });
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // '' = muat semua env, termasuk yang tanpa awalan VITE_
  return {
    plugins: [react(), devGeminiApi(env)],
    // SheetJS (xlsx) rusak jika di-pre-bundle esbuild Vite ("Unsupported ZIP Compression
    // method NaN"). Kecualikan agar disajikan sebagai ESM asli tanpa transformasi.
    optimizeDeps: {
      exclude: ['xlsx'],
    },
  }
})
