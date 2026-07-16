const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

/**
 * @param {string} prompt
 * @param {Array<{mimeType: string, data: string}>} [images] gambar (base64 tanpa prefix data URL) untuk permintaan multimodal
 */
// gemini-2.5-flash didahulukan: kualitasnya memadai untuk OCR & chat, tapi ~6-9x lebih
// cepat daripada gemini-3.5-flash (model thinking, ~20 detik/permintaan). Di jaringan
// seluler permintaan selambat itu sering diputus sebelum selesai.
const MODELS = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.0-flash"];

// Batas tunggu per model; tanpa ini sebuah permintaan yang menggantung bisa menahan
// seluruh proses tanpa pernah mencoba model cadangan.
const TIMEOUT_MS = 25000;

// Batas keseluruhan: tanpa ini, 3 model yang sama-sama menggantung membuat pengguna
// menunggu 3x TIMEOUT_MS. Lebih baik menyerah lebih awal dan memberi pesan yang jelas.
const TOTAL_BUDGET_MS = 45000;

export const callGemini = async (prompt, images = []) => {
  const mulai = Date.now();
  const parts = [{ text: prompt }];
  for (const img of images) {
    if (img && img.data) parts.push({ inline_data: { mime_type: img.mimeType || 'image/jpeg', data: img.data } });
  }

  const body = JSON.stringify({
    contents: [{ parts }],
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  });

  const attempts = [];

  for (const model of MODELS) {
    const sisaWaktu = TOTAL_BUDGET_MS - (Date.now() - mulai);
    if (sisaWaktu <= 0) { attempts.push({ model, status: 'timeout', googleMessage: 'Waktu keseluruhan habis sebelum model ini dicoba.' }); break; }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(TIMEOUT_MS, sisaWaktu));
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: controller.signal }
      );

      if (!response.ok) {
        // Simpan pesan asli dari Google — ini yang sebenarnya menjelaskan penyebabnya.
        let googleMessage = '';
        try { googleMessage = (await response.json())?.error?.message || ''; } catch { /* body bukan JSON */ }
        attempts.push({ model, status: response.status, googleMessage });
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      attempts.push({ model, status: 200, googleMessage: 'Respons kosong dari model.' });
    } catch (error) {
      const timedOut = error.name === 'AbortError';
      attempts.push({ model, status: timedOut ? 'timeout' : 'network', googleMessage: error.message || '' });
    } finally {
      clearTimeout(timer);
    }
  }

  // Semua model gagal. Susun pesan sejujurnya berdasarkan apa yang benar-benar terjadi.
  console.error('Semua model Gemini gagal:', attempts);

  const has = (s) => attempts.some(a => a.status === s);
  const httpStatuses = attempts.map(a => a.status).filter(s => typeof s === 'number');
  const lastGoogleMessage = [...attempts].reverse().find(a => a.googleMessage)?.googleMessage || '';

  let message;
  if (attempts.every(a => a.status === 'timeout' || a.status === 'network')) {
    message = has('timeout')
      ? "Permintaan ke server AI terlalu lama dan dihentikan. Sinyal internet Anda mungkin lemah — coba lagi di jaringan yang lebih stabil."
      : "Tidak dapat terhubung ke server AI. Periksa koneksi internet Anda.";
  } else if (httpStatuses.length && httpStatuses.every(s => s === 429)) {
    message = "Kuota AI Gemini habis untuk saat ini. Coba lagi nanti (kuota harian akan pulih sendiri).";
  } else if (has(400) || has(403)) {
    // Jangan langsung menuduh API Key: 400/403 juga muncul saat key kosong di hasil build,
    // akses diblokir jaringan, atau permintaan ditolak. Tampilkan alasan asli dari Google.
    message = `Permintaan ke AI ditolak (kode ${has(403) ? 403 : 400}).${lastGoogleMessage ? ` Pesan Google: ${lastGoogleMessage}` : ''}`;
  } else if (has(429)) {
    message = "Kuota AI Gemini habis untuk saat ini. Coba lagi nanti (kuota harian akan pulih sendiri).";
  } else {
    message = `Layanan AI sedang bermasalah. Silakan coba beberapa saat lagi.${lastGoogleMessage ? ` (${lastGoogleMessage})` : ''}`;
  }

  const err = new Error(message);
  err.status = httpStatuses[httpStatuses.length - 1] ?? null;
  err.attempts = attempts;
  throw err;
};

/**
 * AI Journal Generator:
 * Generates a narrative report based on attendance and understanding levels.
 */
export const generateJournalSummary = async (sessionInfo, groupData) => {
  const presentKpm = groupData.filter(k => k.presence);
  const understandingCounts = presentKpm.reduce((acc, curr) => {
    const level = curr.understanding || "Baik";
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  const prompt = `Buatkan narasi laporan singkat (1 paragraf) untuk jurnal perkembangan kelompok PKH.
Data Sesi:
- Kelompok: ${sessionInfo.groupName}
- Materi: ${sessionInfo.materi}
- Tanggal: ${sessionInfo.tanggal}
- Kehadiran: ${presentKpm.length} hadir dari ${groupData.length} total KPM.
- Tingkat Pemahaman: ${Object.entries(understandingCounts).map(([k, v]) => `${v} KPM ${k}`).join(', ')}.

Syarat:
- Bahasa Indonesia yang profesional dan formal.
- Berikan narasi yang menggambarkan jalannya pertemuan dan respon KPM.
- Jangan terlalu panjang.`;

  return await callGemini(prompt);
};

/**
 * AI Auto-Graduation Predictor:
 * Analyzes component data to suggest graduation.
 */
export const predictGraduation = (kpm) => {
  if (!kpm.components) return { eligible: false, reason: "" };

  const comps = kpm.components;
  const totalComponents = Object.values(comps).reduce((a, b) => a + (b || 0), 0);
  if (totalComponents === 0) return { eligible: false, reason: "" };

  const totalChildren = (comps.sd || 0) + (comps.smp || 0) + (comps.sma || 0) + (comps.balita || 0) + (comps.hamil || 0);

  // Rule simple: Jika sudah tidak punya anak sekolah, bumil, atau balita (hanya lansia/disabilitas)
  if (totalChildren === 0) {
    if (comps.lansia || comps.disabilitas) {
      return { eligible: true, reason: "Hanya memiliki komponen Lansia/Disabilitas (Potensi Graduasi Alami)" };
    }
    return { eligible: true, reason: "Sudah tidak memiliki komponen tanggungan (SD/SMP/SMA/Balita/Bumil)" };
  }

  return { eligible: false, reason: "" };
};

/**
 * Natural Language Search:
 * Parses query to filter data.
 */
export const parseAisearchQuery = async (query, groups) => {
  const prompt = `Bantu saya memproses pencarian data KPM PKH.
Daftar Kelompok yang tersedia: ${groups.join(', ')}
Query User: "${query}"

Berdasarkan query tersebut, kembalikan dalam format JSON murni:
{
  "group": "Nama Kelompok atau 'Semua'",
  "status": "Hadir" | "Absen" | "Semua",
  "nameSearch": "Nama yang dicari atau null",
  "component": "SD" | "SMP" | "SMA" | "Lansia" | "Balita" | "Bumil" | "Disabilitas" | "Semua"
}

Hanya kembalikan JSON.`;

  const result = await callGemini(prompt);
  try {
    const cleaned = result.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.warn("Gagal parse query AI search:", error);
    return null;
  }
};
