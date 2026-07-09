import { callGemini } from './ai';

/**
 * AI Agent Command Parser:
 * Menerjemahkan kalimat natural (hasil dikte suara / ketikan) menjadi
 * perintah terstruktur yang bisa dieksekusi aplikasi.
 */
export const parseAgentCommand = async (text, { groups, currentGroup, todayISO }) => {
  const prompt = `Anda adalah parser perintah untuk aplikasi absensi pertemuan kelompok PKH (SIP-P2K2).
Tugas Anda HANYA menerjemahkan kalimat pengguna menjadi JSON perintah. Jangan menjawab pertanyaan.

Konteks:
- Tanggal hari ini: ${todayISO}
- Kelompok yang sedang dipilih di layar: "${currentGroup}"
- Daftar nama kelompok yang tersedia: ${groups.join(' | ')}

Kalimat pengguna: "${text}"

Kembalikan JSON murni (tanpa markdown) dengan format:
{
  "intent": "attendance" | "mark_all" | "save_session" | "select_group" | "set_date" | "add_kpm" | "chat",
  "group": "nama kelompok yang disebut (persis dari daftar di atas jika mirip, atau apa adanya) atau null",
  "date": "YYYY-MM-DD jika pengguna menyebut tanggal, atau null",
  "presence": true | false | null,
  "names": ["nama-nama KPM yang disebut"],
  "othersPresence": true | false | null,
  "kpm": {
    "name": "nama lengkap KPM baru atau null",
    "nik": "digit NIK atau null",
    "noKK": "digit No. KK atau null",
    "address": "alamat/RT/RW atau null",
    "bpnt": true | false | null,
    "components": { "sd": 0, "smp": 0, "sma": 0, "balita": 0, "hamil": 0, "disabilitas": 0, "lansia": 0 }
  }
}

Aturan intent:
- "attendance": pengguna menandai kehadiran/ketidakhadiran KPM tertentu berdasarkan nama. presence=false jika tidak hadir/absen/izin/sakit, presence=true jika hadir. Isi "names" dengan setiap nama KPM yang disebut.
- "othersPresence": HANYA diisi jika pengguna secara eksplisit menyebut nasib KPM selain yang disebut, contoh "yang lain hadir semua" -> othersPresence=true. Selain itu null.
- "mark_all": pengguna menandai SEMUA KPM sekaligus tanpa menyebut nama (contoh: "hadirkan semua", "kosongkan semua ceklis"). presence sesuai maksudnya.
- "save_session": pengguna minta menyimpan/mengarsipkan sesi absensi ke riwayat (contoh: "simpan", "simpan sesinya", "arsipkan absensi").
- "select_group": pengguna hanya ingin berpindah/memilih kelompok tanpa aksi lain.
- "set_date": pengguna hanya ingin mengubah tanggal pertemuan tanpa aksi lain.
- "add_kpm": pengguna ingin MENAMBAH/MENDAFTARKAN KPM baru (contoh: "tambah KPM baru nama Siti Aminah kelompok Rajek Depok komponen 2 SD 1 balita", "daftarkan KPM atas nama Budi"). Isi objek "kpm". Kelompok KPM baru ditaruh di field "group" (di luar objek kpm). Untuk components: hitung jumlah tiap jenis yang disebut — SD, SMP, SMA, Balita, Bumil/hamil (pakai key "hamil"), Disabilitas, Lansia; isi 0 jika tidak disebut. bpnt=true jika disebut punya BPNT/KKS/sembako, false jika disebut tidak punya, null jika tidak disebut. Field kpm yang tidak disebut isi null.
- "chat": pertanyaan atau obrolan biasa yang bukan perintah (contoh: "berapa total KPM?", "apa itu P2K2?").

Aturan tanggal: "hari ini" = ${todayISO}. "tanggal 5 bulan ini" = tanggal 5 pada bulan & tahun dari ${todayISO}. Jika tidak disebut, date=null.
Aturan kelompok: "dusun X" / "kelompok X" -> cocokkan ke daftar kelompok di atas (abaikan kata "dusun"/"kelompok"). Jika tidak ada yang mirip, tulis apa adanya.

Hanya kembalikan JSON.`;

  const result = await callGemini(prompt);
  try {
    const cleaned = result.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed.intent !== 'string') return null;
    parsed.names = Array.isArray(parsed.names) ? parsed.names.filter(n => typeof n === 'string' && n.trim()) : [];
    return parsed;
  } catch (error) {
    console.warn('Gagal parse perintah AI agent:', error, result);
    return null;
  }
};

/**
 * OCR KTP / Kartu Keluarga:
 * Membaca foto dokumen kependudukan dan mengembalikan data terstruktur
 * untuk mengisi form KPM otomatis.
 * @param {string} dataUrl hasil compressImage (data:image/jpeg;base64,...)
 */
export const extractKtpData = async (dataUrl) => {
  const match = /^data:(image\/[a-z]+);base64,(.*)$/i.exec(dataUrl || '');
  if (!match) throw new Error('Format gambar tidak dikenali.');
  const mimeType = match[1];
  const base64 = match[2];

  const prompt = `Anda membaca foto dokumen kependudukan Indonesia (bisa KTP/e-KTP atau Kartu Keluarga/KK).
Ekstrak data dan kembalikan JSON murni (tanpa markdown) dengan format:
{
  "docType": "KTP" | "KK" | "LAINNYA",
  "name": "nama lengkap (untuk KK gunakan nama KEPALA KELUARGA) atau null",
  "nik": "16 digit NIK (untuk KK ambil NIK kepala keluarga) atau null",
  "noKK": "16 digit Nomor Kartu Keluarga (hanya jika dokumen KK) atau null",
  "address": "alamat jalan beserta RT/RW atau null",
  "desa": "Kelurahan/Desa atau null",
  "kecamatan": "Kecamatan atau null",
  "kabupaten": "Kabupaten/Kota atau null",
  "provinsi": "Provinsi atau null"
}

Aturan:
- Salin angka NIK dan No. KK persis apa adanya, tanpa spasi. Jika ragu satu digit, tetap tulis yang paling mungkin.
- Jangan mengarang. Jika sebuah field tidak terbaca atau tidak ada di dokumen, isi null.
- Jangan sertakan tanggal lahir, agama, pekerjaan, atau data lain di luar format.
Hanya kembalikan JSON.`;

  const result = await callGemini(prompt, [{ mimeType, data: base64 }]);
  try {
    const cleaned = (result || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object') return null;
    // Bersihkan digit
    if (parsed.nik) parsed.nik = String(parsed.nik).replace(/\D/g, '');
    if (parsed.noKK) parsed.noKK = String(parsed.noKK).replace(/\D/g, '');
    return parsed;
  } catch (error) {
    console.warn('Gagal parse hasil OCR KTP/KK:', error, result);
    return null;
  }
};

// --- FUZZY MATCHING (dijalankan lokal, tahan salah dengar dikte suara) ---

const normalizeText = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(dusun|kelompok|ibu|bu|bapak|pak|kpm|atas|nama)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenScore = (spokenTokens, candidateTokens) => {
  if (spokenTokens.length === 0) return 0;
  let hit = 0;
  for (const st of spokenTokens) {
    if (candidateTokens.some(ct => ct === st || ct.startsWith(st) || st.startsWith(ct))) hit++;
  }
  return hit / spokenTokens.length;
};

/** Cocokkan nama kelompok yang diucapkan dengan daftar kelompok yang ada. */
export const matchGroup = (spoken, groups) => {
  const spokenTokens = normalizeText(spoken).split(' ').filter(Boolean);
  if (spokenTokens.length === 0) return null;
  let best = null, bestScore = 0;
  for (const g of groups) {
    const score = tokenScore(spokenTokens, normalizeText(g).split(' ').filter(Boolean));
    if (score > bestScore) { bestScore = score; best = g; }
  }
  return bestScore >= 0.5 ? best : null;
};

/**
 * Cocokkan nama KPM yang diucapkan dengan daftar KPM.
 * Mengembalikan { match } jika yakin, atau { candidates } jika ambigu/tidak ketemu.
 */
export const matchKpmByName = (spoken, kpmList) => {
  const spokenTokens = normalizeText(spoken).split(' ').filter(Boolean);
  if (spokenTokens.length === 0) return { match: null, candidates: [] };

  const scored = kpmList
    .map(kpm => ({ kpm, score: tokenScore(spokenTokens, normalizeText(kpm.name).split(' ').filter(Boolean)) }))
    .filter(x => x.score >= 0.5)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { match: null, candidates: [] };

  const top = scored[0];
  const runnersUp = scored.filter(x => x.score === top.score);
  // Yakin jika skor sempurna dan hanya satu, atau jelas unggul dari kandidat lain
  if (runnersUp.length === 1 && (top.score === 1 || scored.length === 1 || top.score - scored[1].score >= 0.25)) {
    return { match: top.kpm, candidates: [] };
  }
  return { match: null, candidates: scored.slice(0, 4).map(x => x.kpm) };
};
