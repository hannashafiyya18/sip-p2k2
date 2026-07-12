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
  history.map(({ fotoKegiatan, logoKiri, logoKanan, ...rest }) => rest);

// Aturan penilaian otomatis saat kehadiran di-set massal (scan foto / hadir semua):
// absen = "Tidak Dapat Dinilai"; hadir dengan komponen lansia tunggal = "Kurang"; hadir lainnya = "Baik".
// Jangan dipakai menimpa nilai jika kpm.understandingManual === true (koreksi manual pendamping).
export const deriveUnderstanding = (kpm, presence = kpm.presence) => {
  if (!presence) return "Tidak Dapat Dinilai";
  if (kpm.components?.lansia === 1) return "Kurang";
  return "Baik";
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