import { forwardToGemini } from '../lib/geminiForward.js';

// Serverless function Vercel: proxy Gemini agar API key tersimpan di server
// (env GEMINI_API_KEY, tanpa awalan VITE_) dan tidak pernah dikirim ke browser.
export default async function handler(req, res) {
  // DIAGNOSTIK SEMENTARA: GET menembak beberapa model kandidat dengan panggilan kecil,
  // melaporkan status & latensi masing-masing. Dihapus setelah daftar model final.
  if (req.method === 'GET') {
    const kandidat = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite'];
    const key = process.env.GEMINI_API_KEY;
    const hasil = [];
    for (const m of kandidat) {
      const t0 = Date.now();
      try {
        const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: 'Balas satu kata: OK' }] }] }) });
        const d = await g.json();
        hasil.push({ model: m, status: g.status, ms: Date.now() - t0, ok: g.status === 200, sample: d?.candidates?.[0]?.content?.parts?.[0]?.text || (d?.error?.message || '').slice(0, 60) });
      } catch (e) { hasil.push({ model: m, status: 'err', ms: Date.now() - t0, ok: false, sample: e.message }); }
    }
    res.status(200).json({ hasil });
    return;
  }
  if (req.method !== 'POST') { res.status(405).json({ error: { message: 'Method not allowed' } }); return; }

  const { model, payload } = req.body || {};
  const result = await forwardToGemini({ model, payload, apiKey: process.env.GEMINI_API_KEY });

  res.status(result.status);
  res.setHeader('Content-Type', 'application/json');
  res.send(result.text ?? JSON.stringify(result.json));
}
