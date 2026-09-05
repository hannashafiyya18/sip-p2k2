// siksGenerator.js — Bangun file export SIKS-NG (kontrak v2) dari satu sesi Riwayat.
// Satu file JSON = satu kegiatan P2K2. Bot p2k2-siks-bot membaca file ini untuk
// mengisi form "Tambah Kegiatan P2K2" di siks.kemensos.go.id/pkh/p2k2.
// Kontrak: MY APPS/p2k2-siks-bot/export-contract.md
import { SIKS_MATERI } from './constants';
import { guessSiksMateri } from './helpers';

const KE = { HADIR: 'HADIR', SAKIT: 'SAKIT', ALFA: 'ALFA' };

const normTeks = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const hitungKata = (s) => { const t = normTeks(s); return t ? t.split(/\s+/).length : 0; };

/** Baris peserta dari satu detail riwayat → kontrak. Status lama (tanpa tri-state)
 *  diturunkan sama seperti laporan: presence true = HADIR, false = ALFA. */
const kehadiranDetail = (d) =>
  (KE[d?.status] ? d.status : (d?.presence ? KE.HADIR : KE.ALFA));

/**
 * Susun objek export kontrak v2 dari sesi riwayat + form yang diedit pendamping.
 * @param {object} h       item history (satu kegiatan terarsip)
 * @param {object} form    { nama, materiSiks, tanggal, jamMulai, jamSelesai, tempat,
 *                          pemateriNama, pemateriInstansi, uraian, pendamping }
 * @returns {{ json?: object, pesertaCount: number, kataUraian: number, masalah: string[], peringatan: string[] }}
 */
export function buildExportKegiatan(h, form) {
  const masalah = [];
  const peringatan = [];

  const nama = normTeks(form.nama);
  if (!nama) masalah.push('Nama kegiatan wajib diisi.');

  const tanggal = normTeks(form.tanggal);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) masalah.push('Tanggal kegiatan belum valid (format YYYY-MM-DD).');
  for (const [label, v] of [['Jam mulai', form.jamMulai], ['Jam selesai', form.jamSelesai]]) {
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(normTeks(v))) masalah.push(`${label} belum valid (format HH:MM).`);
  }

  const materiSiksRaw = normTeks(form.materiSiks);
  const materiSiks = SIKS_MATERI.includes(materiSiksRaw)
    ? materiSiksRaw
    : SIKS_MATERI.find((m) => m === materiSiksRaw.toUpperCase());
  if (!materiSiks) masalah.push('Pilih kategori Materi SIKS dari daftar yang tersedia.');

  const tempat = normTeks(form.tempat) || normTeks(h.tempat);
  const pemateriNama = normTeks(form.pemateriNama);
  const pemateriInstansi = normTeks(form.pemateriInstansi) || 'Pendamping Sosial PKH';
  const pemateri = pemateriNama
    ? [{ nama: pemateriNama, instansi: pemateriInstansi }]
    : [];

  const uraian = normTeks(form.uraian);
  const kataUraian = hitungKata(uraian);
  if (kataUraian > 500) masalah.push(`Uraian ${kataUraian} kata melebihi batas SIKS (500 kata) — ringkas dulu.`);
  else if (kataUraian < 10) peringatan.push('Uraian sangat pendek (<10 kata) — pastikan sudah sesuai kegiatan.');

  // Peserta dari details riwayat (nik/noKK dibekukan saat arsip; '-' dianggap kosong)
  const details = Array.isArray(h.details) ? h.details : [];
  const peserta = details.map((d) => ({
    nama: normTeks(d.name),
    nik: String(d.nik || '').replace(/\D/g, ''),
    noKK: String(d.noKK || '').replace(/\D/g, ''),
    kehadiran: kehadiranDetail(d),
  })).filter((p) => p.nama);
  const tanpaNik = peserta.filter((p) => p.nik.length !== 16);
  if (tanpaNik.length) peringatan.push(`${tanpaNik.length} peserta tanpa NIK lengkap — bot hanya mencocokkan nama (kurang andal).`);
  const hadir = peserta.filter((p) => p.kehadiran === KE.HADIR).length;
  const sakit = peserta.filter((p) => p.kehadiran === KE.SAKIT).length;
  const alfa = peserta.filter((p) => p.kehadiran === KE.ALFA).length;

  const json = {
    formatVersion: 2,
    dibuat: new Date().toISOString(),
    sumber: 'sip-p2k2',
    pendamping: { nama: normTeks(form.pendamping), kecamatan: normTeks(h.kecamatan || 'Mlati') },
    kegiatan: {
      id: String(h.id),
      nama,
      materiSiks,
      modulSiks: materiSiks,
      periodeSalur: normTeks(form.periodeSalur),
      tanggal,
      jamMulai: normTeks(form.jamMulai),
      jamSelesai: normTeks(form.jamSelesai),
      tempat,
      pemateri,
      uraian,
      kelompok: normTeks(h.groupName),
      materiAsli: normTeks(h.materi),
    },
    peserta,
    dokumen: {
      // Foto geotag & dokumen pendukung dilampirkan MANUAL oleh pendamping
      // (edit path di file JSON ini) — bot tidak bisa mengambil foto base64
      // dari Firestore sebagai berkas lokal.
      fotoKegiatan: '',
      dokumenPendukung: '',
    },
  };

  return { json, pesertaCount: peserta.length, statHadir: hadir, statSakit: sakit, statAlfa: alfa, kataUraian, masalah, peringatan };
}

/** Nama file aman untuk diunduh: export-siks-<tanggal>-<kelompok>.json */
export function namaFileExport(h, tanggal) {
  const slug = String(h.groupName || 'kegiatan')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'kegiatan';
  return `export-siks-${String(tanggal || '').slice(0, 10) || 'tanpa-tanggal'}-${slug}.json`;
}

/** Isi awal formulir export saat sesi dibuka (default yang bisa diedit). */
export function defaultFormExport(h, pendamping) {
  const tanggal = normTeks(h.date) || new Date().toISOString().split('T')[0];
  return {
    nama: `${normTeks(h.groupName)} — ${normTeks(h.materi) || 'P2K2'}`,
    materiSiks: guessSiksMateri(h.materi),
    tanggal,
    jamMulai: '09:00',
    jamSelesai: '11:00',
    tempat: normTeks(h.tempat),
    pemateriNama: normTeks(pendamping),
    pemateriInstansi: normTeks(h.pemateri) || 'Pendamping Sosial PKH',
    uraian: `Pertemuan P2K2 kelompok ${normTeks(h.groupName)} dengan materi ${normTeks(h.materi) || 'P2K2'} dilaksanakan di ${normTeks(h.tempat) || 'tempat kegiatan'} pada tanggal ${tanggal}.`,
    periodeSalur: '',
    pendamping: normTeks(pendamping),
  };
}

/** Bungkus JSON → objek Blob untuk diunduh browser. */
export function unduhJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Ambil daftar kegiatan.id yang sukses dari file hasil bot (dua format diterima). */
export function bacaIdsSukses(data) {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.sudah)) return data.sudah.map((x) => String(x));
  if (Array.isArray(data.hasil)) {
    return data.hasil.filter((h) => h && h.status === 'sukses').map((h) => String(h.kegiatanId || h.id));
  }
  return [];
}
