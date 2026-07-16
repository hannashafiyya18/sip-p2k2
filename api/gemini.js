import { forwardToGemini } from '../lib/geminiForward.js';

// Serverless function Vercel: proxy Gemini agar API key tersimpan di server
// (env GEMINI_API_KEY, tanpa awalan VITE_) dan tidak pernah dikirim ke browser.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: { message: 'Method not allowed' } }); return; }

  const { model, payload } = req.body || {};
  const result = await forwardToGemini({ model, payload, apiKey: process.env.GEMINI_API_KEY });

  res.status(result.status);
  res.setHeader('Content-Type', 'application/json');
  res.send(result.text ?? JSON.stringify(result.json));
}
