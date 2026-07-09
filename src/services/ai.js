const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

/**
 * @param {string} prompt
 * @param {Array<{mimeType: string, data: string}>} [images] gambar (base64 tanpa prefix data URL) untuk permintaan multimodal
 */
export const callGemini = async (prompt, images = []) => {
  const models = [
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
  ];

  const parts = [{ text: prompt }];
  for (const img of images) {
    if (img && img.data) parts.push({ inline_data: { mime_type: img.mimeType || 'image/jpeg', data: img.data } });
  }

  const statuses = new Set();
  let lastStatus = null;
  let isNetworkError = false;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
          }),
        }
      );

      if (!response.ok) { lastStatus = response.status; statuses.add(response.status); continue; }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (error) {
      isNetworkError = true;
      console.error(`Error with ${model}:`, error);
    }
  }

  const err = new Error(
    isNetworkError && !lastStatus
      ? "Tidak dapat terhubung ke server AI. Periksa koneksi internet Anda."
      : statuses.has(403) || statuses.has(400)
      ? "API Key Gemini tidak valid atau aksesnya diblokir. Ganti API Key Gemini Anda."
      : statuses.has(429)
      ? "Kuota AI habis untuk saat ini. Coba lagi nanti atau tingkatkan paket API Gemini Anda."
      : "Layanan AI sedang bermasalah. Silakan coba beberapa saat lagi."
  );
  err.status = lastStatus;
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
