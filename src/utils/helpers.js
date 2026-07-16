import { AID_VALUES } from './constants';

export const formatRupiah = (number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(number);

export const calculateTotalAid = (components) => { 
  if (!components) return 0; 
  let total = 0; 
  Object.keys(components).forEach(key => { total += (components[key] || 0) * (AID_VALUES[key] || 0); }); 
  return total; 
};

export const loadScript = (src) => {
  return new Promise((resolve, reject) => {
      let script = document.querySelector(`script[src="${src}"]`);
      if (script) { if (script.dataset.loaded === 'true') { resolve(); return; } script.addEventListener('load', () => resolve()); script.addEventListener('error', () => reject(new Error(`Gagal memuat ${src}`))); return; }
      script = document.createElement('script'); script.src = src; script.async = true; script.onload = () => { script.dataset.loaded = 'true'; resolve(); }; script.onerror = () => reject(new Error(`Gagal memuat script: ${src}`)); document.head.appendChild(script);
  });
};

// localStorage dibatasi ±5MB per situs; setItem melempar QuotaExceededError saat penuh.
// Selalu pakai helper ini agar kuota penuh tidak pernah membuat aplikasi crash (blank putih).
export const safeSetItem = (key, value) => {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
};

// Buang field gambar base64 (foto kegiatan & logo) dari item riwayat — versi ringan
// untuk cadangan lokal saat kuota localStorage penuh. Data lengkap tetap ada di Firestore.
export const stripHeavyHistoryFields = (history) =>
  // eslint-disable-next-line no-unused-vars -- destrukturisasi hanya untuk membuang field berat
  history.map(({ fotoKegiatan, logoKiri, logoKanan, ...rest }) => rest);

// Aturan penilaian otomatis saat kehadiran di-set massal (scan foto / hadir semua):
// absen = "Tidak Dapat Dinilai"; hadir dengan komponen lansia tunggal = "Kurang"; hadir lainnya = "Baik".
// Jangan dipakai menimpa nilai jika kpm.understandingManual === true (koreksi manual pendamping).
export const deriveUnderstanding = (kpm, presence = kpm.presence) => {
  if (!presence) return "Tidak Dapat Dinilai";
  if (kpm.components?.lansia === 1) return "Kurang";
  return "Baik";
};

// --- DETEKSI KPM GANDA ---
// ID KPM dibuat dari Date.now() saat import/tambah, bukan dari identitas orangnya.
// Akibatnya file yang sama diimpor dua kali, atau data dari dua perangkat digabung,
// menghasilkan dokumen berbeda untuk orang yang sama.

const isNikValid = (v) => /^\d{16}$/.test(String(v || '').replace(/\D/g, ''));
const normNama = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Skor kelengkapan data: dipakai memilih kartu mana yang sebaiknya dipertahankan. */
export const scoreKpmCompleteness = (k) => {
  let score = 0;
  if (isNikValid(k.nik)) score += 3;
  if (String(k.noKK || '').replace(/\D/g, '').length === 16) score += 2;
  if (k.address && k.address !== '-') score += 1;
  if (k.components && Object.keys(k.components).length > 0) score += 2;
  if (k.bpnt) score += 1;
  if (k.note) score += 1;
  if (k.graduationStatus) score += 1;
  for (const f of ['desa', 'kecamatan', 'kabupaten', 'provinsi']) if (k[f] && k[f] !== '-') score += 0.25;
  return score;
};

/**
 * Kelompokkan KPM yang merujuk orang yang sama.
 * Kunci utama NIK (paling andal); cadangannya nama+kelompok — ini ditandai
 * needsCheck karena dua orang bisa saja benar-benar bernama sama.
 * @returns {Array<{key: string, by: 'nik'|'nama', needsCheck: boolean, keep: object, remove: object[]}>}
 */
export const findDuplicateKpm = (data) => {
  const buckets = new Map();
  for (const k of data || []) {
    if (!k || !k.name) continue;
    const nik = String(k.nik || '').replace(/\D/g, '');
    const key = isNikValid(nik) ? `nik:${nik}` : `nama:${normNama(k.name)}|${normNama(k.group)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(k);
  }

  const clusters = [];
  for (const [key, items] of buckets) {
    if (items.length < 2) continue;
    // Pertahankan yang datanya paling lengkap; seri -> yang hadir; seri lagi -> yang pertama
    const sorted = [...items].sort((a, b) => {
      const d = scoreKpmCompleteness(b) - scoreKpmCompleteness(a);
      if (d !== 0) return d;
      if (a.presence !== b.presence) return a.presence ? -1 : 1;
      return 0;
    });
    clusters.push({
      key,
      by: key.startsWith('nik:') ? 'nik' : 'nama',
      needsCheck: !key.startsWith('nik:'),
      keep: sorted[0],
      remove: sorted.slice(1),
    });
  }
  return clusters;
};

export const sanitizeForFirestore = (obj) => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(item => sanitizeForFirestore(item));
  if (typeof obj === 'object') {
    const newObj = {};
    Object.keys(obj).forEach(key => { if (obj[key] === undefined) newObj[key] = null; else newObj[key] = sanitizeForFirestore(obj[key]); });
    return newObj;
  }
  return obj;
};

export const getImageDimensions = (src) => {
  return new Promise((resolve) => { const img = new Image(); img.src = src; img.onload = () => resolve({ width: img.width, height: img.height }); img.onerror = () => resolve({ width: 0, height: 0 }); });
};

export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (event) => { const img = new Image(); img.src = event.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const MAX_WIDTH = 800; const scaleSize = MAX_WIDTH / img.width; canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', 0.7)); }; img.onerror = (err) => reject(err); }; reader.onerror = (err) => reject(err);
  });
};