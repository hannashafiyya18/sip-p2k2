import { callGemini } from './ai';
import { PKH_MODULES } from '../utils/constants';

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

/**
 * Scan lembar DAFTAR HADIR yang sudah ditandatangani:
 * membaca 1 atau beberapa foto (multi-halaman) dan menentukan baris mana
 * yang kolom TTD-nya terisi tanda tangan. Nama di lembar TERCETAK urut dari
 * aplikasi, jadi AI hanya menilai ada/tidaknya tanda tangan per baris.
 * Selain tabel TTD, kepala dokumen (Waktu, Kelompok, Modul/Sesi, Tempat) ikut
 * dibaca untuk mengisi otomatis Konfigurasi Laporan — foto yang sama, tanpa
 * permintaan AI tambahan.
 * @param {string[]} dataUrls hasil compressImage (data:image/jpeg;base64,...)
 * @param {string[]} kpmNames daftar nama KPM urut sesuai lembar absen
 * @returns {Promise<{header: {tanggal: string|null, kelompok: string|null, materi: string|null, tempat: string|null}, rows: Array<{no: number|null, name: string, signed: boolean, confidence: 'high'|'low'}>}>}
 */
export const extractAttendanceSheet = async (dataUrls, kpmNames) => {
  const images = (dataUrls || []).map(dataUrl => {
    const match = /^data:(image\/[a-z]+);base64,(.*)$/i.exec(dataUrl || '');
    if (!match) throw new Error('Format gambar tidak dikenali.');
    return { mimeType: match[1], data: match[2] };
  });
  if (images.length === 0) throw new Error('Tidak ada foto yang bisa diproses.');

  const prompt = `Anda membaca foto lembar "DAFTAR HADIR" pertemuan kelompok PKH yang sudah ditandatangani peserta.
Lembar berupa tabel: kolom nomor urut, kolom NAMA (tercetak), dan kolom paling kanan adalah TTD/TANDA TANGAN.
Di BAGIAN ATAS lembar (sebelum tabel) biasanya ada kepala dokumen: Waktu/Tanggal, Kelompok, Modul/Sesi, dan Tempat Pertemuan.
${images.length > 1 ? `Ada ${images.length} foto — semuanya bagian dari SATU daftar yang sama (bersambung halaman berikutnya).` : ''}

Daftar nama yang TERCETAK di lembar, urut dari atas (gunakan ini sebagai acuan, JANGAN menebak nama lain):
${(kpmNames || []).map((n, i) => `${i + 1}. ${n}`).join('\n')}

Tugas Anda:
1. Baca kepala dokumen di bagian atas lembar.
2. Nilai untuk SETIAP baris tabel: apakah kolom TTD berisi coretan/tanda tangan (signed=true) atau kosong (signed=false).

Kembalikan JSON murni (tanpa markdown) dengan format:
{
  "header": { "tanggal": "YYYY-MM-DD atau null", "kelompok": "nama kelompok persis seperti tertulis atau null", "materi": "teks Modul/Sesi persis seperti tertulis atau null", "tempat": "tempat pertemuan persis seperti tertulis atau null" },
  "rows": [ { "no": 1, "name": "NAMA PERSIS DARI DAFTAR", "signed": false, "confidence": "high" } ]
}

Aturan:
- "tanggal": apa pun format tanggal di lembar (2026-07-08, 08/07/2026, 8 Juli 2026), normalisasi ke YYYY-MM-DD. Jika tidak ada atau tidak terbaca, isi null.
- Field kepala dokumen lain: salin persis seperti tertulis; null jika tidak ada. JANGAN mengarang.
- Sertakan SEMUA baris tabel yang terlihat di foto, urut sesuai nomor.
- "signed" = true jika ada coretan/paraf/tanda tangan apa pun di kolom TTD baris itu; false jika benar-benar kosong.
- "confidence" = "low" jika tanda tangan sangat tipis, terpotong di tepi foto, menimpa baris lain, atau Anda ragu; selain itu "high".
- Salin "name" persis dari daftar acuan di atas sesuai barisnya. Jangan mengarang baris yang tidak ada.
Hanya kembalikan JSON.`;

  const result = await callGemini(prompt, images);
  try {
    const cleaned = (result || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    // Toleran terhadap dua bentuk: {header, rows} (baru) atau array rows saja
    const rawRows = Array.isArray(parsed) ? parsed : parsed?.rows;
    if (!Array.isArray(rawRows)) throw new Error('bentuk tidak sesuai');

    const h = (!Array.isArray(parsed) && parsed.header && typeof parsed.header === 'object') ? parsed.header : {};
    const asText = (v) => { const s = String(v ?? '').trim(); return s && s.toLowerCase() !== 'null' ? s : null; };
    const header = {
      tanggal: /^\d{4}-\d{2}-\d{2}$/.test(String(h.tanggal || '')) ? h.tanggal : null,
      kelompok: asText(h.kelompok),
      materi: asText(h.materi),
      tempat: asText(h.tempat),
    };

    const rows = rawRows
      .filter(r => r && typeof r === 'object' && (r.name || r.no))
      .map(r => ({
        no: Number.isFinite(parseInt(r.no)) ? parseInt(r.no) : null,
        name: String(r.name || '').trim(),
        signed: r.signed === true,
        confidence: r.confidence === 'low' ? 'low' : 'high',
      }));
    return { header, rows };
  } catch (error) {
    console.warn('Gagal parse hasil scan absen:', error, result);
    throw new Error('Hasil pembacaan foto tidak valid. Coba foto ulang dengan lebih terang, tegak, dan seluruh tabel terlihat.');
  }
};

/**
 * Cocokkan teks Modul/Sesi hasil baca foto dengan daftar resmi PKH_MODULES.
 * Materi di aplikasi bukan teks bebas (dropdown Modul -> Sesi), jadi hasil OCR
 * harus dipetakan ke pilihan yang sah — atau null bila tidak meyakinkan.
 * @returns {{module: string, session: string}|null}
 */
export const matchMateri = (raw) => {
  const rawTokens = normalizeText(raw).split(' ').filter(Boolean);
  if (rawTokens.length === 0) return null;
  const sesiMatch = /sesi\s*(\d+)/i.exec(raw || '');
  const sesiNum = sesiMatch ? parseInt(sesiMatch[1]) : null;

  let best = null, bestScore = 0;
  for (const [module, sessions] of Object.entries(PKH_MODULES)) {
    const moduleScore = tokenScore(normalizeText(module).split(' ').filter(Boolean), rawTokens);
    for (let i = 0; i < sessions.length; i++) {
      const title = sessions[i].replace(/^sesi\s*\d+:\s*/i, '');
      const titleScore = tokenScore(normalizeText(title).split(' ').filter(Boolean), rawTokens);
      // Nomor sesi yang cocok adalah sinyal kuat: judul di lembar sering disingkat
      const numBonus = sesiNum !== null && sesiNum === i + 1 ? 0.35 : 0;
      const score = moduleScore * 0.45 + titleScore * 0.55 + numBonus;
      if (score > bestScore) { bestScore = score; best = { module, session: sessions[i] }; }
    }
  }
  return bestScore >= 0.75 ? best : null;
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
