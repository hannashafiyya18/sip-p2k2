// Logika penerus ke Gemini — dipakai BERSAMA oleh serverless function Vercel
// (api/gemini.js) dan middleware dev di vite.config.js. Hanya berjalan di sisi
// server; API key tidak pernah sampai ke browser. Jangan diimpor dari kode klien.

// Whitelist model: mencegah endpoint dipakai memanggil model sembarangan.
export const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-2.0-flash'];

/**
 * Teruskan satu permintaan generateContent ke Google, dengan API key disuntik di server.
 * Mengembalikan { status, text } (respons mentah Google diteruskan apa adanya) atau
 * { status, json } untuk error yang dihasilkan proxy sendiri.
 */
export async function forwardToGemini({ model, payload, apiKey }) {
  if (!apiKey) return { status: 500, json: { error: { message: 'GEMINI_API_KEY belum diset di server.' } } };
  if (!ALLOWED_MODELS.includes(model)) return { status: 400, json: { error: { message: 'Model tidak diizinkan.' } } };
  if (!payload || typeof payload !== 'object') return { status: 400, json: { error: { message: 'Payload permintaan tidak valid.' } } };

  const g = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
  );
  // Teruskan status & body Google apa adanya, supaya klien tetap bisa membaca
  // pesan error asli Google (yang menjelaskan penyebab sebenarnya).
  const text = await g.text();
  return { status: g.status, text };
}
