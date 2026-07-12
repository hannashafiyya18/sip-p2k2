// Rekap Kecamatan Pemantauan Pelaksanaan P2K2 (format Excel resmi kecamatan).
// Menghasilkan satu baris data milik pendamping ini dari arsip Riwayat,
// dengan tata letak sheet meniru persis template rekap kecamatan.

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/**
 * Hitung angka rekap satu bulan dari arsip Riwayat.
 * - Kelompok dengan lebih dari satu sesi di bulan itu: diambil sesi TERBARU
 *   sebagai perwakilan, supaya KPM tidak terhitung dobel.
 * - Aturan "tidak dapat dinilai" mengikuti exportLaporanBulananPDF:
 *   KPM tidak hadir + KPM hadir yang nilainya kosong/"Tidak Dapat Dinilai".
 * @returns objek rekap, atau null jika bulan itu belum punya sesi di Riwayat.
 */
export const buildRekapKecamatan = ({ history, data, currentConfig, month, year }) => {
  const sessions = (history || []).filter(h => {
    if (!h || !h.date) return false;
    const d = new Date(h.date);
    return d.getFullYear() === parseInt(year) && d.getMonth() === parseInt(month);
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  if (sessions.length === 0) return null;

  // Perwakilan per kelompok = sesi terbaru bulan itu. Sesi "Semua Kelompok"
  // dipecah per kelompok berdasarkan field group tiap KPM di details.
  const perGroup = new Map();
  let totalPecahanSesi = 0;
  for (const s of sessions) {
    const details = Array.isArray(s.details) ? s.details : Object.values(s.details || {});
    const byGroup = new Map();
    for (const d of details) {
      const g = (d.group || s.groupName || 'Umum').trim() || 'Umum';
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(d);
    }
    totalPecahanSesi += byGroup.size;
    for (const [g, rows] of byGroup) {
      const prev = perGroup.get(g);
      if (!prev || new Date(s.date) >= new Date(prev.date)) {
        perGroup.set(g, { date: s.date, materi: s.materi || '', pemateri: s.pemateri || '', rows });
      }
    }
  }

  let totalKPM = 0, hadir = 0, tidakHadir = 0, kurang = 0, baik = 0, sangatBaik = 0, tddHadir = 0;
  const materiSet = new Set(); const pemateriSet = new Set();
  for (const g of perGroup.values()) {
    if (g.materi.trim()) materiSet.add(g.materi.trim());
    if (g.pemateri.trim()) pemateriSet.add(g.pemateri.trim());
    for (const d of g.rows) {
      totalKPM++;
      if (d.presence) {
        hadir++;
        if (d.understanding === 'Kurang') kurang++;
        else if (d.understanding === 'Baik') baik++;
        else if (d.understanding === 'Sangat Baik') sangatBaik++;
        else tddHadir++;
      } else {
        tidakHadir++;
      }
    }
  }

  const groupsDampingan = new Set((data || []).map(k => (k.group || '').trim()).filter(Boolean));

  return {
    month: parseInt(month), year: parseInt(year),
    bulanLabel: `${MONTH_NAMES[parseInt(month)]} ${year}`,
    kecamatan: currentConfig?.kecamatan || '',
    kabupaten: currentConfig?.kabupaten || '',
    pendamping: currentConfig?.pendamping || '',
    totalKelompok: Math.max(groupsDampingan.size, perGroup.size),
    kelompokTerrealisasi: perGroup.size,
    alasan: '',
    materi: [...materiSet].join('; '),
    pemateri: [...pemateriSet].join('; ') || 'Pendamping',
    totalKPM, hadir, tidakHadir, kurang, baik, sangatBaik,
    tidakDapatDinilai: tidakHadir + tddHadir,
    adaKelompokMultiSesi: totalPecahanSesi > perGroup.size,
  };
};

/** Nilai baris data urut kolom C..P (untuk fitur "Salin Angka" — tempel langsung ke sheet master). */
export const rekapRowValues = (r) => [
  r.kecamatan, r.pendamping, r.totalKelompok, r.kelompokTerrealisasi, r.alasan,
  r.materi, r.pemateri, r.totalKPM, r.hadir, r.tidakHadir,
  r.kurang, r.baik, r.sangatBaik, r.tidakDapatDinilai,
];

/** Susun workbook meniru template resmi (judul, header merge bertingkat, baris data, total, catatan kaki). */
export const buildRekapWorkbook = (XLSX, r) => {
  const E = ''; // kolom A template kosong
  const aoa = [
    [E, 'Rekap Kecamatan Pemantauan Pelaksanaan P2K2'],
    [E, 'Kecamatan', E, E, r.kecamatan],
    [E, 'Bulan', E, E, r.bulanLabel],
    [E, 'Kabupaten/Kota', E, E, r.kabupaten],
    [],
    [],
    [E, 'No', 'Kecamatan', 'Nama Pendamping', 'Pelaksanaan P2K2', E, 'Alasan Jika Tidak Melaksanakan', 'Materi', 'Pemateri', 'Total KPM Dampingan', 'Kehadiran P2K2', E, 'Pengetahuan & pemahaman', E, E, E],
    [E, E, E, E, 'Total Jumlah Kelompok', 'Jumlah Kelompok Terrealisasi P2K2', E, E, E, E, 'KPM hadir', 'KPM tidak hadir', 'kurang', 'baik', 'sangat baik', 'tidak dapat dinilai'],
    [E, 1, ...rekapRowValues(r)],
    [E, E, E, E, E, E, E, E, E, E, r.hadir, r.tidakHadir, r.kurang, r.baik, r.sangatBaik, r.tidakDapatDinilai],
    [],
    [E, E, E, '*Nama pendamping diisi seluruh nama pendamping di kecamatan tsb'],
    [],
    [E, 'Catatan Dinamika Pelaksanaan P2K2'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Merge header bertingkat, persis pola template (baris 7-8 pada Excel = indeks 6-7)
  ws['!merges'] = [
    { s: { r: 6, c: 1 }, e: { r: 7, c: 1 } },   // No
    { s: { r: 6, c: 2 }, e: { r: 7, c: 2 } },   // Kecamatan
    { s: { r: 6, c: 3 }, e: { r: 7, c: 3 } },   // Nama Pendamping
    { s: { r: 6, c: 4 }, e: { r: 6, c: 5 } },   // Pelaksanaan P2K2
    { s: { r: 6, c: 6 }, e: { r: 7, c: 6 } },   // Alasan
    { s: { r: 6, c: 7 }, e: { r: 7, c: 7 } },   // Materi
    { s: { r: 6, c: 8 }, e: { r: 7, c: 8 } },   // Pemateri
    { s: { r: 6, c: 9 }, e: { r: 7, c: 9 } },   // Total KPM Dampingan
    { s: { r: 6, c: 10 }, e: { r: 6, c: 11 } }, // Kehadiran P2K2
    { s: { r: 6, c: 12 }, e: { r: 6, c: 15 } }, // Pengetahuan & pemahaman
  ];
  ws['!cols'] = [
    { wch: 3 }, { wch: 5 }, { wch: 14 }, { wch: 26 }, { wch: 14 }, { wch: 16 },
    { wch: 20 }, { wch: 42 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, MONTH_NAMES[r.month].toUpperCase());
  return wb;
};

/** Unduh file .xlsx rekap (dipanggil dari browser). */
export const downloadRekapXLSX = async (r) => {
  const XLSX = await import('xlsx');
  const wb = buildRekapWorkbook(XLSX, r);
  XLSX.writeFile(wb, `Rekap_P2K2_${MONTH_NAMES[r.month]}_${r.year}.xlsx`);
};
