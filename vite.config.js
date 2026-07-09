import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // SheetJS (xlsx) rusak jika di-pre-bundle esbuild Vite ("Unsupported ZIP Compression
  // method NaN"). Kecualikan agar disajikan sebagai ESM asli tanpa transformasi.
  optimizeDeps: {
    exclude: ['xlsx'],
  },
})
