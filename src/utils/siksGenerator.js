// siksGenerator.js — Bangun file export SIKS-NG (kontrak v2) dari satu sesi Riwayat.
// Satu file JSON = satu kegiatan P2K2. Bot p2k2-siks-bot membaca file ini untuk
// mengisi form "Tambah Kegiatan P2K2" di siks.kemensos.go.id/pkh/p2k2.
// Kontrak: MY APPS/p2k2-siks-bot/export-contract.md
import { SIKS_MATERI } from './constants';
import { guessSiksMateri } from './helpers';

const KE = { HADIR: 'HADIR', SAKIT: 'SAKIT', ALFA: 'ALFA' };

const normTeks = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const hitungKata = (s) => { const t = normTeks(s); return t ? t.split(/\s+/).length : 0; };
// Validasi & normalisasi jam HH:mm — kosong bila tidak valid (dipakai utk nilai riwayat lama).
const HHmm = (s) => (/^([01]?\d|2[0-3]):[0-5]\d$/.test(String(s == null ? '' : s).trim()) ? String(s).trim() : '');

// Batas SIKS-NG: field "Nama Kegiatan" di wizard menolak isi > 100 karakter
// (temuan 2026-09-12: muncul teks merah "Nama Kegiatan maksimal 100 karakter"
// dan tombol Proses tidak lolos). Nama lama "<KELOMPOK> — <judul modul + slogan>"
// panjangnya 121-129 karakter sehingga SELALU ditolak portal.
// Baku yang dipakai: "P2K2 <KELOMPOK> - <modul ringkas>".
export const NAMA_SIKS_MAX = 100;

// Batas field "Uraian Kegiatan" di SIKS-NG = 1000 KARAKTER (portal menampilkan
// penghitung "n / 1000 karakter", temuan 2026-09-12). Aturan lama kita (500 kata,
// ± 3.400 karakter) jauh lebih longgar sehingga TIDAK menangkap uraian 1.500
// karakter yang ditolak — atau lebih buruk dipotong diam-diam oleh portal.
export const URAIAN_SIKS_MAX = 1000;

// ---------------------------------------------------------------------------
// Baku PEMATERI (keputusan Mas 2026-09-15, setelah melihat CETAKAN laporan SIKS):
//   form SIKS : "Nama Pemateri"  +  "Instansi Pemateri"
//   cetak PDF : "Nama Pemateri"  +  "Jabatan / Instansi"     <- LABEL BERBEDA
// Kesimpulannya: kolom "Nama Pemateri" diisi NAMA ORANG, kolom kedua diisi
// LEMBAGA INDUK. Peran/jabatan tidak ikut ke kolom kedua (pilihan Mas: "nama
// bersih + instansi saja") — peran tetap muncul di RANGKUMAN kegiatan lewat
// buildUraianSIKS() ("..., dipandu oleh <nama> (<jabatan>) dari <lembaga>.").
// ---------------------------------------------------------------------------
export const PEMATERI_JABATAN_DEFAULT = 'Pendamping Sosial PKH';
export const INSTANSI_DEFAULT = 'Kementerian Sosial RI';

// Pilihan cepat ISI KOLOM KEDUA (lembaga induk) di dialog export.
export const INSTANSI_CEPAT = [
  'Kementerian Sosial RI',
  'Kementerian Agama RI',
  'Dinas Kesehatan Kabupaten',
  'Pemerintah Kabupaten Sleman',
];

// Kata penanda PERAN/jabatan (dipakai mendeteksi kolom Nama yang isinya peran,
// bukan nama orang) dan kata penanda LEMBAGA (memeriksa kolom kedua).
const KATA_PERAN = /(pendamping|penyuluh|petugas|kader|bidan|perawat|dokter|guru|ustad|pemateri|fasilitator|koordinator|kepala|sekretaris|babinsa|asn|pppk|pns|pegawai|anggota|relawan|konselor|psikolog|perangkat|kades|lurah|ketua|dinas|kementerian|lembaga|badan|puskesmas|posyandu|kua|balai|uptd|pemerintah|sekolah)/i;

const KATA_LEMBAGA = /(kementerian|dinas|pemerintah|pemkab|pemkot|badan|lembaga|balai|uptd|puskesmas|sekolah|kampus|universitas|polres|kodim|kua|bkkbn|bpn|baznas|kejaksaan|pengadilan)/i;

/** Kolom "Nama Pemateri" ternyata berisi PERAN (mis. "Pendamping Sosial PKH"),
 *  bukan nama orang -> laporan SIKS akan tercetak tanpa nama pemateri.
 *  HANYA peringatan (tidak memblokir): pendamping yang tahu kondisi nyata. */
export function tampakPeranSaja(teks) {
  const t = normTeks(teks);
  if (!t) return false;
  if (!KATA_PERAN.test(t)) return false;      // "Muhammad As'adur Rofiq" -> tidak kena
  return t.split(' ').length <= 6;            // kalimat panjang -> bukan sekadar peran
}

/** Kolom kedua berisi LEMBAGA INDUK? (yang dicetak di baris "Jabatan / Instansi") */
export function tampakLembaga(teks) {
  const t = normTeks(teks);
  if (!t) return false;
  return KATA_LEMBAGA.test(t);
}

// Jargon judul modul yang selalu berulang -> dibuang supaya nama pendek.
const JARGON_MODUL_SIKS = [
  /^(modul\s+)?p2k2\s+adaptif\s*\/\s*/i,
  /^materi\s+tambahan\s*[-–—]\s*/i,
  /^(modul\s+)?p2k2\s*[-–—]\s*/i,
];

/** Potong di batas kata (kata tak pernah terbelah) supaya nama tetap terbaca. */
export function potongKataSiks(teks, maks) {
  const t = normTeks(teks);
  if (maks <= 0) return '';
  if (t.length <= maks) return t;
  const awal = t.slice(0, maks);
  const spasi = awal.lastIndexOf(' ');
  return normTeks((spasi > 0 ? awal.slice(0, spasi) : awal).replace(/[\s,;:\-–—]+$/, ''));
}

/** Inti topik modul: buang jargon + slogan dalam tanda kutip.
 *  'Modul P2K2 Adaptif / Materi Tambahan - Bahaya Judi Online "Jangan …"'
 *   -> 'Bahaya Judi Online' */
export function ringkasModulSiks(judul) {
  let t = normTeks(judul).split(/["“”]/)[0];
  for (const re of JARGON_MODUL_SIKS) t = t.replace(re, '');
  return t.replace(/^[\s,\-–—:]+|[\s,\-–—:]+$/g, '').trim();
}

/** Nama kegiatan baku untuk form SIKS: "P2K2 <KELOMPOK> - <modul ringkas>",
 *  dipastikan <= NAMA_SIKS_MAX karakter. Kelompok = identitas kegiatan, tak
 *  pernah dibuang; bagian modul yang mengalah lebih dulu. */
export function namaKegiatanSIKS(h) {
  const kelompok = normTeks(h && h.groupName);
  const modul = ringkasModulSiks(h && h.materi);
  const kepala = kelompok ? `P2K2 ${kelompok}` : 'P2K2';
  const gabung = (m) => (kelompok
    ? (m ? `${kepala} - ${m}` : kepala)
    : normTeks(`P2K2 ${m}`));
  let nama = gabung(modul);
  if (nama.length > NAMA_SIKS_MAX) {
    const jatah = NAMA_SIKS_MAX - (kelompok ? kepala.length + 3 : 5);
    nama = gabung(potongKataSiks(modul, jatah));
  }
  if (nama.length > NAMA_SIKS_MAX) nama = potongKataSiks(nama, NAMA_SIKS_MAX);
  return nama;
}

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
  // Batas portal SIKS-NG (2026-09-12): >100 karakter ditolak ("Nama Kegiatan
  // maksimal 100 karakter") -> export diblokir supaya bot tidak mengisi buta.
  if (nama.length > NAMA_SIKS_MAX) {
    masalah.push(`Nama kegiatan ${nama.length} karakter — SIKS menolak di atas ${NAMA_SIKS_MAX} karakter. Contoh baku: "P2K2 <KELOMPOK> - <modul>".`);
  } else if (!/^p2k2\b/i.test(nama)) {
    peringatan.push('Nama kegiatan belum diawali "P2K2" — disarankan "P2K2 <KELOMPOK> - <modul>".');
  }

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
  // Pemateri: SIKS punya 3 pasang kolom. Yang dikirim: NAMA ORANG -> kolom "Nama
  // Pemateri"; LEMBAGA INDUK -> kolom "Instansi Pemateri" (tercetak sebagai baris
  // "Jabatan / Instansi"). Slot 2-3 hanya bila ada pemateri tambahan.
  const slotsPemateri = [
    ['', form.pemateriNama, form.pemateriInstansi, true],
    [' 2', form.pemateri2Nama, form.pemateri2Instansi, false],
    [' 3', form.pemateri3Nama, form.pemateri3Instansi, false],
  ];
  const pemateri = [];
  for (const [slot, namaMentah, instansiMentah, utama] of slotsPemateri) {
    const namaPemateri = normTeks(namaMentah);
    // Instansi default (Kemensos) hanya bila memang ada nama pematerinya,
    // supaya kolom nama yang dikosongkan tidak diam-diam mengirim instansi.
    const instansiPemateri = normTeks(instansiMentah) || (utama && namaPemateri ? INSTANSI_DEFAULT : '');
    if (!namaPemateri && !instansiPemateri) continue;
    if (tampakPeranSaja(namaPemateri)) {
      peringatan.push(`Nama Pemateri${slot} berisi PERAN ("${namaPemateri}"), bukan nama orang — laporan SIKS akan tercetak tanpa nama pemateri (perannya sudah muncul di rangkuman). Isi nama orangnya.`);
    }
    if (!instansiPemateri) {
      peringatan.push(`Instansi Pemateri${slot} belum diisi — tulis lembaga induknya (mis. "Kementerian Agama RI"); baris "Jabatan / Instansi" di laporan cetak diambil dari kolom ini.`);
    } else if (!tampakLembaga(instansiPemateri)) {
      peringatan.push(`Instansi Pemateri${slot} ("${instansiPemateri}") sepertinya bukan nama lembaga — isi lembaga induknya (mis. "${INSTANSI_DEFAULT}").`);
    }
    pemateri.push({ nama: namaPemateri, instansi: instansiPemateri });
  }

  const uraian = normTeks(form.uraian);
  const kataUraian = hitungKata(uraian);
  const karakterUraian = uraian.length;
  // Batas MENGIKAT = karakter (counter portal). Uraian >1000 karakter = export diblokir.
  if (karakterUraian > URAIAN_SIKS_MAX) {
    masalah.push(`Uraian ${karakterUraian} karakter — SIKS membatasi ${URAIAN_SIKS_MAX} karakter (lebih dari itu ditolak atau dipotong portal). Ringkas dulu.`);
  } else if (kataUraian > 500) {
    masalah.push(`Uraian ${kataUraian} kata melebihi aturan lama 500 kata — ringkas dulu.`);
  } else if (kataUraian < 10) {
    peringatan.push('Uraian sangat pendek (<10 kata) — pastikan sudah sesuai kegiatan.');
  }
  // Ketentuan SIKS: uraian memuat 5 aspek. Kurangnya aspek hanya diperingatkan
  // (tidak memblokir) — pendamping yang tahu kondisi nyata di lapangan.
  const aspekUraian = deteksiAspekUraian(uraian);
  const kurangAspek = URAIAN_ASPEK_WAJIB.filter((kkunci) => !aspekUraian[kkunci]);
  if (kurangAspek.length) {
    peringatan.push(`Uraian belum menyebut: ${kurangAspek.map((kkunci) => URAIAN_ASPEK_LABEL[kkunci]).join(', ')}.`);
  }

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

  return { json, pesertaCount: peserta.length, statHadir: hadir, statSakit: sakit, statAlfa: alfa, kataUraian, karakterUraian, aspekUraian, masalah, peringatan };
}

/** Nama file aman untuk diunduh: export-siks-<tanggal>-<kelompok>.json */
export function namaFileExport(h, tanggal) {
  const slug = String(h.groupName || 'kegiatan')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'kegiatan';
  return `export-siks-${String(tanggal || '').slice(0, 10) || 'tanpa-tanggal'}-${slug}.json`;
}

// ---------------------------------------------------------------------------
// Uraian kegiatan: 5 aspek ketentuan SIKS + anggaran 1000 karakter
// ---------------------------------------------------------------------------
// Ketentuan (placeholder portal + arahan Mas 2026-09-12): uraian harus memuat
// (1) proses pelaksanaan, (2) materi yang disampaikan, (3) partisipasi peserta,
// (4) hasil kegiatan, serta (5) kendala & tindak lanjut bila ada. Plafon portal
// = 1000 KARAKTER. Generator di bawah menyusun uraian dari DATA SESI (tidak
// mengarang): 3 segmen inti selalu masuk, lalu hasil/kendala/tindak lanjut
// dimasukkan selama masih muat — yang tidak muat dicatat, bukan dipotong buta.
export const URAIAN_ASPEK_WAJIB = ['proses', 'materi', 'partisipasi', 'hasil', 'kendala'];
export const URAIAN_ASPEK_LABEL = {
  proses: 'proses pelaksanaan',
  materi: 'materi yang disampaikan',
  partisipasi: 'partisipasi peserta',
  hasil: 'hasil kegiatan',
  kendala: 'kendala & tindak lanjut',
};

const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** "2026-09-04" -> "Jumat, 4 September 2026" (aman untuk format lain: dikembalikan apa adanya). */
export function tanggalPanjangID(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normTeks(iso));
  if (!m) return normTeks(iso);
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  if (Number.isNaN(d.getTime())) return normTeks(iso);
  return `${HARI_ID[d.getDay()]}, ${Number(m[3])} ${BULAN_ID[Number(m[2]) - 1]} ${m[1]}`;
}

/** Statistik kehadiran dari details[] riwayat (tri-state status/presence). */
export function statistikPeserta(h) {
  const det = Array.isArray(h && h.details) ? h.details : [];
  const nama = (d) => normTeks(d && d.name);
  const stat = (d) => (KE[d && d.status] ? d.status : (d && d.presence ? KE.HADIR : KE.ALFA));
  const hadir = det.filter((d) => stat(d) === KE.HADIR);
  const sakit = det.filter((d) => stat(d) === KE.SAKIT);
  const alfa = det.filter((d) => stat(d) === KE.ALFA);
  return {
    total: det.length,
    hadir: hadir.length,
    sakit: sakit.length,
    alfa: alfa.length,
    namaSakit: sakit.map(nama).filter(Boolean),
    namaAlfa: alfa.map(nama).filter(Boolean),
    persenHadir: det.length ? Math.round((hadir.length / det.length) * 100) : 0,
  };
}

/** Deteksi 5 aspek wajib pada teks uraian (checklist di app & peringatan di bot). */
export function deteksiAspekUraian(teks) {
  const t = ` ${normTeks(teks).toLowerCase()} `;
  return {
    proses: /(pelaksanaan|dilaksanakan|berlangsung|pukul|dipandu|dibuka|dimulai)/.test(t),
    materi: /(materi|modul|disampaikan|tema|topik)/.test(t),
    partisipasi: /(peserta|dihadiri|hadir|sakit|alfa|kpm)/.test(t),
    hasil: /(hasil|terlaksana|tercapai|memahami|sepakat|manfaat|tersampaikan)/.test(t),
    kendala: /(kendala|hambatan|tindak lanjut|tindaklanjut|kunjungan|pertemuan berikutnya|penjadwalan ulang)/.test(t),
  };
}

/** Potong pada batas KALIMAT terakhir (selalu berakhir titik), bukan batas kata. */
export function potongKalimatSiks(teks, maks = URAIAN_SIKS_MAX) {
  const t = normTeks(teks);
  if (t.length <= maks) return t;
  const awal = t.slice(0, maks);
  const titik = Math.max(awal.lastIndexOf('.'), awal.lastIndexOf('!'), awal.lastIndexOf('?'));
  if (titik > 0) return normTeks(awal.slice(0, titik + 1));
  return potongKataSiks(t, maks);
}

/** Sisa teks setelah bagian yang dipakai (untuk dilaporkan ke pengguna). */
function sisaSetelahTeks(teks, dipakai) {
  const t = normTeks(teks);
  const d = normTeks(dipakai);
  if (!d || !t.startsWith(d)) return '';
  return normTeks(t.slice(d.length));
}

/** Padatkan uraian supaya muat <= maks karakter (paritas dgn bot p2k2-siks-bot):
 *  1) buang jargon berulang + normalkan tanda kutip/tanda pisah,
 *  2) buang kalimat kembar (sisa tempel-ulang),
 *  3) potong di batas KALIMAT (selalu berakhir titik),
 *  4) terakhir potong di batas KATA.
 *  Mengembalikan jejak (tahap + sisa) supaya pemotongan tidak pernah diam-diam. */
export function padatkanUraianSiks(teks, maks = URAIAN_SIKS_MAX) {
  const asli = normTeks(teks);
  // Teks yang sudah patuh DIBIARKAN apa adanya - "padatkan" tidak pernah
  // menulis ulang uraian yang sudah <= batas (mencegah perubahan diam-diam).
  if (asli.length <= maks) return { teks: asli, asli, dipadatkan: false, tahap: [], hilang: 0, sisa: '' };
  const tahap = [];
  let t = asli;

  // 1. buang jargon berulang + normalkan tanda kutip/tanda pisah
  const bersih = normTeks(t
    .replace(/[\u201c\u201d\u201e]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/(modul\s+)?p2k2\s+adaptif\s*\/\s*materi\s+tambahan\s*[-:]\s*/gi, '')
    .replace(/\bmateri\s+tambahan\s*[-:]\s*/gi, '')
    .replace(/[""][^""]{20,}[""]/g, ' ')
    .replace(/\s{2,}/g, ' '));
  if (bersih.length < t.length) { tahap.push('buang jargon & rapikan tanda baca'); t = bersih; }
  if (t.length <= maks) return { teks: t, asli, dipadatkan: true, tahap, hilang: asli.length - t.length, sisa: sisaSetelahTeks(asli, t) };

  // 2. buang kalimat kembar (sisa tempel-ulang). Pemisah kalimat memakai penanda
  //    agar "pukul 14.00." tidak terbelah di titik desimal.
  let dibuang = 0;
  const sudah = new Set();
  const unik = [];
  for (const k of t.replace(/([.!?])\s+/g, '$1\u0001').split('\u0001').filter((x) => normTeks(x))) {
    const kunci = k.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (kunci && sudah.has(kunci)) { dibuang++; continue; }
    sudah.add(kunci);
    unik.push(k);
  }
  if (dibuang > 0) {
    const tanpaKembar = normTeks(unik.join(' '));
    if (tanpaKembar.length < t.length) { tahap.push(`buang ${dibuang} kalimat kembar`); t = tanpaKembar; }
    if (t.length <= maks) return { teks: t, asli, dipadatkan: true, tahap, hilang: asli.length - t.length, sisa: sisaSetelahTeks(asli, t) };
  }

  // 3. potong di batas KALIMAT (selalu berakhir titik), 4. terakhir batas KATA
  const hasilKalimat = potongKalimatSiks(t, maks);
  if (hasilKalimat.length <= maks && hasilKalimat.length < t.length) {
    // label jujur: kalau sumbernya tak punya tanda baca kalimat, hasilnya potong kata
    tahap.push(/[.!?]$/.test(hasilKalimat) ? 'potong di batas kalimat' : 'potong di batas kata');
    return { teks: hasilKalimat, asli, dipadatkan: true, tahap, hilang: asli.length - hasilKalimat.length, sisa: sisaSetelahTeks(t, hasilKalimat) };
  }
  const hasilKata = potongKataSiks(t, maks);
  tahap.push('potong di batas kata');
  return { teks: hasilKata, asli, dipadatkan: true, tahap, hilang: asli.length - hasilKata.length, sisa: sisaSetelahTeks(t, hasilKata) };
}

/** Susun uraian 5 aspek dari data sesi, dijamin <= URAIAN_SIKS_MAX karakter.
 *  opsi: { sebutNama, tanggal, jamMulai, jamSelesai, tempat, pemateriNama,
 *          pemateriInstansi, pendamping } — nilai form yang sedang diedit menang. */
export function buildUraianSIKS(h, opsi = {}) {
  const st = statistikPeserta(h);
  const grup = normTeks(h && h.groupName) || 'KPM';
  const tanggal = normTeks(opsi.tanggal || (h && h.date));
  const j1 = HHmm(opsi.jamMulai || (h && h.jamMulai));
  const j2 = HHmm(opsi.jamSelesai || (h && h.jamSelesai));
  const jam = j1 && j2 ? `${j1}-${j2}` : (j1 || j2 || '');
  const tempat = normTeks(opsi.tempat || (h && h.tempat)) || 'tempat kegiatan';
  // "... dipandu oleh <nama orang> (<jabatan>) dari <lembaga induk>." — peran tetap
  // disebut di rangkuman walau kolom SIKS hanya memuat nama + lembaga.
  const daftarPemateri = [
    [normTeks(opsi.pemateriNama), normTeks(opsi.pemateriJabatan) || PEMATERI_JABATAN_DEFAULT, normTeks(opsi.pemateriInstansi) || INSTANSI_DEFAULT],
    [normTeks(opsi.pemateri2Nama), normTeks(opsi.pemateri2Jabatan), normTeks(opsi.pemateri2Instansi)],
    [normTeks(opsi.pemateri3Nama), normTeks(opsi.pemateri3Jabatan), normTeks(opsi.pemateri3Instansi)],
  ].filter(([n, j, i]) => n || j || i);
  const rangkaiPemateri = ([n, j, i]) => {
    const inti = n && j ? `${n} (${j})` : (n || j || i);
    return i && inti !== i ? `${inti} dari ${i}` : inti;
  };
  const frasePemateri = daftarPemateri.length
    ? `, dipandu oleh ${rangkaiPemateri(daftarPemateri[0])}`
      + (daftarPemateri.length > 1 ? ` bersama ${daftarPemateri.slice(1).map(rangkaiPemateri).join(' dan ')}` : '')
    : '';
  const materi = ringkasModulSiks((h && h.materi) || '') || 'P2K2';
  const takHadir = st.sakit + st.alfa;
  const namaTakHadir = [...st.namaSakit, ...st.namaAlfa];
  const sebut = !!opsi.sebutNama && namaTakHadir.length > 0;

  const proses = `Pertemuan P2K2 kelompok ${grup} dilaksanakan pada ${tanggalPanjangID(tanggal)}`
    + `${jam ? ` pukul ${jam} WIB` : ''} di ${tempat}`
    + `${frasePemateri}.`;
  const segMateri = `Materi yang disampaikan: ${materi}.`;
  const partisipasi = `Peserta: dari ${st.total} KPM terdaftar, hadir ${st.hadir} KPM, sakit ${st.sakit}, alfa ${st.alfa} (${st.persenHadir}% hadir)`
    + `${sebut ? `; tidak hadir: ${namaTakHadir.join(', ')}` : ''}.`;
  const hasil = `Hasil: kegiatan terlaksana sesuai jadwal dan materi tersampaikan kepada ${st.hadir} KPM yang hadir.`;
  const kendala = takHadir
    ? `Kendala: ${takHadir} KPM tidak hadir (${[st.sakit ? `${st.sakit} sakit` : '', st.alfa ? `${st.alfa} alfa` : ''].filter(Boolean).join(', ')}) sehingga materi tidak diterima secara langsung.`
    : 'Kendala: tidak ada kendala berarti, seluruh KPM terdaftar hadir.';
  const tindak = takHadir
    ? `Tindak lanjut: ${sebut ? `kunjungan rumah ke ${namaTakHadir.join(', ')}` : 'materi disampaikan ulang kepada KPM yang tidak hadir'} pada pertemuan atau kunjungan berikutnya.`
    : 'Tindak lanjut: pendamping memantau penerapan materi pada pertemuan berikutnya.';

  // Anggaran karakter: inti selalu masuk, lalu tambahan selama masih muat.
  let teks = [proses, segMateri, partisipasi].join(' ');
  const dilewati = [];
  for (const [nama, kalimat] of [['hasil', hasil], ['kendala', kendala], ['tindakLanjut', tindak]]) {
    if (teks.length + 1 + kalimat.length <= URAIAN_SIKS_MAX) teks = `${teks} ${kalimat}`;
    else dilewati.push(nama);
  }
  let dipotong = false;
  if (teks.length > URAIAN_SIKS_MAX) {   // kasus ekstrem: nama kelompok/tempat/pemateri panjang
    teks = potongKalimatSiks(teks, URAIAN_SIKS_MAX);
    dipotong = true;
  }
  return { uraian: teks, karakter: teks.length, aspek: deteksiAspekUraian(teks), dilewati, dipotong, statistik: st };
}

/** Isi awal formulir export saat sesi dibuka (default yang bisa diedit). */
export function defaultFormExport(h, pendamping) {
  const tanggal = normTeks(h.date) || new Date().toISOString().split('T')[0];
  const jabatan = normTeks(h && h.pemateri) || PEMATERI_JABATAN_DEFAULT;
  return {
    nama: namaKegiatanSIKS(h),
    materiSiks: guessSiksMateri(h.materi),
    tanggal,
    jamMulai: HHmm(h.jamMulai) || '09:00',
    jamSelesai: HHmm(h.jamSelesai) || '11:00',
    tempat: normTeks(h.tempat),
    // Kolom "Nama Pemateri" = NAMA ORANG (nama pendamping dari Identitas; diganti
    // kalau pematerinya orang lain). Jabatan dipakai di rangkuman saja; kolom
    // "Instansi Pemateri" = lembaga induk.
    pemateriNama: normTeks(pendamping),
    pemateriJabatan: jabatan,
    pemateriInstansi: INSTANSI_DEFAULT,
    pemateri2Nama: '', pemateri2Jabatan: '', pemateri2Instansi: '',
    pemateri3Nama: '', pemateri3Jabatan: '', pemateri3Instansi: '',
    uraian: buildUraianSIKS(h, { pemateriNama: normTeks(pendamping), pemateriJabatan: jabatan, pemateriInstansi: INSTANSI_DEFAULT }).uraian,
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

/** Unduh berkas dari dataURL (mis. foto kegiatan base64) sebagai file nyata.
 *  Dipakai fitur Export Berkas SIKS: foto disimpan dengan nama
 *  foto-<tanggal>-<kelompok>.jpg — bot p2k2-siks-bot mencarinya lewat nama polos. */
export function unduhDataUrl(filename, dataUrl) {
  if (!dataUrl) return;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
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
