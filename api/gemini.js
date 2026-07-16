import { forwardToGemini } from '../lib/geminiForward.js';

// Serverless function Vercel: proxy Gemini agar API key tersimpan di server
// (env GEMINI_API_KEY, tanpa awalan VITE_) dan tidak pernah dikirim ke browser.
export default async function handler(req, res) {
  // DIAGNOSTIK SEMENTARA: GET mengembalikan daftar model yang didukung key server.
  // Dihapus setelah daftar model final ditetapkan.
  if (req.method === 'GET') {
    try {
      const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}&pageSize=100`);
      const data = await g.json();
      const flash = (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && /flash/i.test(m.name))
        .map(m => m.name.replace('models/', ''));
      res.status(g.status).json({ flashModels: flash, error: data.error });
    } catch (e) { res.status(502).json({ error: { message: e.message } }); }
    return;
  }
  if (req.method !== 'POST') { res.status(405).json({ error: { message: 'Method not allowed' } }); return; }

  const { model, payload } = req.body || {};
  const result = await forwardToGemini({ model, payload, apiKey: process.env.GEMINI_API_KEY });

  res.status(result.status);
  res.setHeader('Content-Type', 'application/json');
  res.send(result.text ?? JSON.stringify(result.json));
}
