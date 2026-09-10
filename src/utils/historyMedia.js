// historyMedia.js — FOTO KEGIATAN dari sesi yang sudah diarsipkan.
//
// Mulai 2026-09, sesi BARU tidak lagi menyimpan foto (base64, ±100–200 KB) di dalam
// dokumen riwayatnya. Fotonya dipindah ke koleksi terpisah `history_media/{id}`, dan
// dokumen riwayat hanya menyimpan penanda ringan `hasFoto: true`.
//
// Alasannya: daftar Riwayat menyiarkan SELURUH dokumen sesi ke aplikasi. Selama foto
// ikut di dalamnya, sekadar membuka Riwayat = mengunduh semua foto dari semua tahun
// (lambat, berat di HP, dan boros kuota pendamping).
//
// Sesi LAMA sengaja TIDAK disentuh/dimigrasi: fotonya masih ada di dalam dokumennya.
// Pembaca di bawah ini memakai foto inline lebih dulu, jadi dua-duanya jalan.
import { doc, getDoc } from 'firebase/firestore';

// Foto hanya diambil saat benar-benar dibutuhkan (kartu yang tampil, buka/edit sesi,
// export SIKS, cetak laporan bulanan, cadangan). Hasilnya di-cache di MEMORI saja —
// tidak pernah masuk localStorage (kuotanya hanya ±5 MB).
const cache = new Map();

const jalurMedia = (appId, uid, id) => `artifacts/${appId}/users/${uid}/history_media/${id}`;

/** true bila sesi punya foto — baik yang masih menempel di dokumen (lama) maupun terpisah (baru). */
export const adaFotoSesi = (item) => !!(item && (item.fotoKegiatan || item.hasFoto));

/** Simpan foto yang sudah kita pegang ke cache supaya tidak diunduh dua kali. */
export const ingatFotoSesi = (id, foto) => { if (id != null && foto) cache.set(String(id), foto); };

/** Buang satu entri cache (foto sesi diganti atau dihapus). */
export const lupakanFotoSesi = (id) => cache.delete(String(id));

/**
 * Ambil foto sebuah sesi (data URL).
 * Mengembalikan null bila sesi memang tidak punya foto — bukan error.
 */
export const muatFotoSesi = async ({ db, appId, uid, item }) => {
  if (!item) return null;
  if (item.fotoKegiatan) return item.fotoKegiatan;            // sesi lama: masih di dalam dokumennya
  if (!item.hasFoto || !db || !uid) return null;
  const key = String(item.id);
  if (cache.has(key)) return cache.get(key);
  try {
    const snap = await getDoc(doc(db, jalurMedia(appId, uid, key)));
    const foto = snap.exists() ? (snap.data().fotoKegiatan || null) : null;
    cache.set(key, foto);
    return foto;
  } catch (e) {
    console.error('Gagal memuat foto sesi', e);
    return null;
  }
};

/**
 * Ambil foto banyak sesi sekaligus (dipakai sebelum mengunduh cadangan, karena
 * cadangan harus utuh). Dijalankan berurutan supaya ramah koneksi HP.
 * @returns {Promise<Object<string, string|null>>} peta id sesi -> foto
 */
export const muatBanyakFotoSesi = async ({ db, appId, uid, items, onProgress }) => {
  const hasil = {};
  const daftar = (items || []).filter(adaFotoSesi);
  for (let i = 0; i < daftar.length; i++) {
    hasil[String(daftar[i].id)] = await muatFotoSesi({ db, appId, uid, item: daftar[i] });
    if (onProgress) onProgress(i + 1, daftar.length);
  }
  return hasil;
};
