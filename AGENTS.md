# SIP-P2K2 — Pendamping PKH (package: laporan-pkh)

Aplikasi web laporan Pendamping PKH (P2K2 = Pertemuan Peningkatan Kemampuan Keluarga),
Kecamatan Mlati, Sleman. Stack: React + Vite + Tailwind CSS, deploy ke Firebase Hosting (SPA).

## Perintah penting
- `npm run dev` — dev server Vite (localhost:5173)
- `npm run build` — build produksi ke `dist/` — WAJIB dijalankan sebelum deploy
- `npm run lint` — ESLint (jalankan setelah perubahan besar)
- `npm run preview` — pratinjau hasil build lokal
- Deploy: `npm run build && firebase deploy` (hosting saja; SPA rewrite → index.html)

## Struktur kode
- `src/App.jsx` — akar aplikasi
- `src/components/layout` — kerangka halaman (header/nav/dll.)
- `src/components/tabs` — modul per-tab (bagian fitur)
- `src/components/ui` — komponen UI kecil yang dipakai ulang
- `src/services` — akses data / logika eksternal
- `src/hooks` — custom hooks React
- `src/config` — konfigurasi aplikasi (JANGAN taruh rahasia; pakai `import.meta.env`)
- `src/utils` — fungsi bantu
- `dist/` — hasil build, JANGAN diedit manual
- `.env*` — rahasia lokal; jangan pernah menampilkan/menyebar isinya

## Konvensi
- Komponen: JSX + Tailwind utility classes (hindari file CSS baru kecuali diperlukan)
- Nama komponen: PascalCase, satu komponen per file
- Perubahan minimal & terarah; jangan refactor di luar lingkup tugas
- Sebelum mengubah logic penting, cek pemakaiannya di tempat lain (grep dulu)
- Ikuti pola komponen yang sudah ada (konsistensi > gaya baru)

## Git
- Fitur dikerjakan di branch terpisah dari `main`
- Commit kecil dengan pesan jelas (conventional: `feat:`, `fix:`, `refactor:`, `chore:`)
- Jangan commit `dist/`, `node_modules/`, `.env`
- Verifikasi `npm run lint` & `npm run build` sebelum menyatakan selesai

## Catatan domain
- Istilah: KPM = Keluarga Penerima Manfaat; P2K2 = Pertemuan Peningkatan Kemampuan Keluarga
- Data sensitif warga (nama/NIK/komitmen) — jangan log atau tampilkan berlebihan
