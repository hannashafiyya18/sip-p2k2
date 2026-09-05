export const AID_VALUES = { hamil: 750000, balita: 750000, sd: 225000, smp: 375000, sma: 500000, lansia: 600000, disabilitas: 600000 };
export const COMPONENT_LABELS = { hamil: "Ibu Hamil", balita: "Balita (0-6)", sd: "Siswa SD", smp: "Siswa SMP", sma: "Siswa SMA", lansia: "Lansia (60+)", disabilitas: "Disabilitas Berat" };

export const PKH_MODULES = {
  "Pengelolaan Keuangan dan Perencanaan Usaha": ["Sesi 1: Mengelola Keuangan Keluarga", "Sesi 2: Cermat Meminjam dan Menabung", "Sesi 3: Memulai Usaha"],
  "Kesehatan dan Gizi": ["Sesi 1: Pentingnya Gizi dan Layanan Kesehatan Ibu Hamil", "Sesi 2: Pentingnya Gizi Untuk Ibu Menyusui dan Balita", "Sesi 3: Kesakitan Pada Anak dan Kesehatan Lingkungan"],
  "Kesejahteraan Sosial": ["Sesi 1: Pelayanan Bagi Penyandang Disabilitas Berat", "Sesi 2: Pentingnya Kesejahteraan Lanjut Usia"],
  "Perlindungan Anak": ["Sesi 1: Upaya Pencegahan Kekerasan dan Perilaku Salah Pada Anak", "Sesi 2: Penelantaran dan Eksploitasi Terhadap Anak"],
  "Pengasuhan dan Pendidikan Anak": ["Sesi 1: Menjadi Orangtua Yang Lebih Baik", "Sesi 2: Memahami Perkembangan dan Perilaku Anak", "Sesi 3: Memahami Cara Anak Usia Dini Belajar", "Sesi 4: Membantu Anak Sukses Di Sekolah"],
  "Pencegahan dan Penanganan Stunting": ["Sesi 1: Permasalahan Stunting", "Sesi 2: Permasalahan Sosial", "Sesi 3: Mendukung Ibu Hamil Mengakses Informasi yang Tepat", "Sesi 4: Mendukung Perawatan Sehari-hari Ibu Hamil", "Sesi 5: Stimulasi pada Janin", "Sesi 6: Kesejahteraan Bayi Baru Lahir & Ibu Menyusui", "Sesi 7: Stimulasi Bayi Baru Lahir", "Sesi 8: Stimulasi Bayi 6-12 Bulan", "Sesi 9: Stimulasi Anak 1-2 Tahun", "Sesi 10: Stimulasi Anak 2-6 Tahun", "Sesi 11: Pemanfaatan Bantuan Sosial", "Sesi 12: Mendukung Praktik Cuci Tangan", "Sesi 13: Pemetaan Potensi Diri", "Sesi 14: Sistem Rujukan Stunting", "Sesi 15: Rencana Tindak Lanjut"],
  "P2K2 Adaptif / Materi Tambahan": []
};

export const INITIAL_DATA = [];
export const UNDERSTANDING_LEVELS = ["-", "Kurang", "Baik", "Sangat Baik", "Tidak Dapat Dinilai"];
export const DEFAULT_CONFIG = { pendamping: "Muhammad As'adur Rofiq", tanggal: new Date().toISOString().split('T')[0], tempat: "Rumah Ketua Kelompok", materi: 'Modul Stunting Sesi 11 "Pemanfaatan Bantuan Sosial"', pemateri: "Pendamping Sosial PKH", fotoKegiatan: null, logoKiri: null, logoKanan: null, desa: "", kecamatan: "", kabupaten: "", provinsi: "" };

export const STORAGE_KEY_DATA = 'pkh_app_data_v2'; 
export const STORAGE_KEY_CONFIG = 'pkh_app_config_v1';
export const STORAGE_KEY_HISTORY = 'pkh_app_history_v1';
export const STORAGE_KEY_VIEW_SETTINGS = 'pkh_app_view_settings_v3'; 
export const STORAGE_KEY_AUTO_ASSESS = 'pkh_app_auto_assess_v1';
export const STORAGE_KEY_LOGO_KIRI = 'pkh_app_logo_kiri_global';
export const STORAGE_KEY_LOGO_KANAN = 'pkh_app_logo_kanan_global';

// --- STATUS KEHADIRAN P2K2 (tri-state) ---
// Ditambahkan untuk entri absensi per KPM per kegiatan.
// PENTING: `presence` (boolean) TETAP satu-satunya sumber data untuk semua cetakan PDF.
// Aturannya presence === (status === 'HADIR'). SAKIT dan ALFA sama-sama presence:false,
// jadi laporan bulanan/semester/absensi keluar persis seperti sebelum fitur ini ada.
// `status` bernilai null artinya BELUM DITANDAI (sesi berjalan, pendamping belum memutuskan).
export const ATTENDANCE_HADIR = 'HADIR';
export const ATTENDANCE_SAKIT = 'SAKIT';
export const ATTENDANCE_ALFA = 'ALFA';
export const ATTENDANCE_STATUSES = [ATTENDANCE_HADIR, ATTENDANCE_SAKIT, ATTENDANCE_ALFA];
export const ATTENDANCE_LABELS = { HADIR: 'Hadir', SAKIT: 'Sakit', ALFA: 'Alfa' };
export const ATTENDANCE_SHORT = { HADIR: 'H', SAKIT: 'S', ALFA: 'A' };

// --- KATEGORI MATERI SIKS-NG (6 opsi dropdown "Materi" form Tambah Kegiatan P2K2) ---
// Teks PERSIS sesuai opsi SIKS (observasi live 2026-09-05). Export SIKS-NG memakai
// daftar ini; bot p2k2-siks mencocokkan teks apa adanya (bukan ID numerik).
export const SIKS_MATERI = [
  'KEGIATAN BIMBINGAN MENTAL DAN SPIRITUAL.',
  'PENGELOLAAN KEUANGAN DAN PERENCANAAN USAHA.',
  'KESEHATAN DAN GIZI.',
  'KESEJAHTERAAN SOSIAL.',
  'FASILITASI ADMINISTRATIF, MEDIASI, EDUKASI KELUARGA, MOTIVASI, DAN ADVOKASI BAGI KPM PKH DALAM MENGAKSES LAYANAN FASILITAS KESEHATAN, PENDIDIKAN, DAN/ATAU LAYANAN SOSIAL.',
  'P2K2 ADAPTIF, MATERI TAMBAHAN, ISU-ISU YANG RELEVAN DI MASYARAKAT SESUAI DENGAN KONDISI TERKINI ATAU SESUAI KEBUTUHAN'
];
