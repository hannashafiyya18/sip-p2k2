# Prompt untuk Claude Code — Fitur "Scan Absen dari Foto" + Mesin Aturan Penilaian

> Salin seluruh teks di bawah `---` ini dan tempel ke Claude Code di dalam folder proyek SIP-P2K2.

---

Kamu adalah developer aplikasi senior yang paham React modern dan UI/UX dengan baik. Kerjakan penambahan fitur pada aplikasi ini secara rapi, aman, dan konsisten dengan gaya kode yang sudah ada. Jangan merombak arsitektur; ikuti pola yang sudah dipakai.

## Konteks proyek (sudah ada, jangan dibuat ulang)

- Stack: React 19 + Vite + TailwindCSS + Firebase (Auth + Firestore) + jsPDF/jspdf-autotable + SheetJS (xlsx) + lucide-react. Deploy Firebase/Vercel.
- Aplikasi ini alat pendamping PKH untuk absensi pertemuan P2K2 dan cetak laporan (bulanan, semester).
- Integrasi AI sudah ada dan HARUS dipakai ulang:
  - `src/services/ai.js` → `callGemini(prompt, images)` sudah mendukung multimodal (kirim gambar base64). Model fallback: gemini-3.5-flash / 2.5-flash / 2.0-flash. API key dari `import.meta.env.VITE_GEMINI_API_KEY`.
  - `src/services/aiAgent.js` → sudah ada `extractKtpData(dataUrl)` (OCR KTP/KK via Gemini) dan `matchKpmByName(spoken, kpmList)` + `matchGroup(...)` (fuzzy match lokal). Tiru pola `extractKtpData` untuk fitur baru.
  - `src/utils/helpers.js` → `compressImage(file)` mengembalikan `data:image/jpeg;base64,...` (maks lebar 800px). Pakai ini sebelum kirim ke Gemini.
- Model data KPM (di `src/App.jsx`): objek dengan field `{ id, name, nik, noKK, address, bpnt, components: { sd, smp, sma, balita, hamil, disabilitas, lansia }, presence: bool, understanding: string, group, note, graduationStatus }`.
- `UNDERSTANDING_LEVELS` (di `src/utils/constants.js`) = `["-", "Kurang", "Baik", "Sangat Baik", "Tidak Dapat Dinilai"]`.
- Handler kehadiran yang sudah ada di `App.jsx`:
  - `handleStatusChange(item)` (baris ~276): toggle `presence`, set `understanding` = "Baik" saat hadir, "-" saat tidak.
  - `handleMarkAllPresent()` (~325): tandai semua hadir + "Baik", sinkron ke Firestore via batch.
  - `updateKpmItem(item)`: helper untuk update 1 KPM (state + Firestore). Pakai ini untuk menyimpan perubahan.
- Absensi diinput per kelompok. Kelompok aktif ada di state `selectedGroup`. Data yang tampil difilter jadi `filteredData`.

## Tujuan

Tambahkan 3 hal, dengan tetap menjaga fitur lama tidak rusak:

### FITUR 1 — Scan Absen dari Foto lembar tanda tangan

Pendamping memotret lembar "DAFTAR HADIR" yang sudah ditandatangani KPM (nama tercetak urut dari app; kolom paling kanan = TTD/tanda tangan). Aplikasi membaca foto, menentukan siapa yang hadir (baris yang ada tanda tangan) vs tidak hadir (kolom TTD kosong), lalu mengisi kehadiran kelompok aktif otomatis.

1. Buat fungsi baru di `src/services/aiAgent.js`, contoh nama `extractAttendanceSheet(dataUrls, kpmNames)`:
   - Terima 1 ATAU beberapa gambar (satu lembar bisa jadi 2 halaman bila KPM banyak). `dataUrls` = array hasil `compressImage`.
   - Kirim ke `callGemini` dengan gambar-gambar itu. Sertakan daftar `kpmNames` (urut sesuai app) di prompt sebagai acuan, karena nama TERCETAK — jadi tugas AI hanya menilai tiap baris "ada tanda tangan di kolom TTD atau tidak", bukan menebak nama.
   - Minta Gemini kembalikan JSON MURNI (tanpa markdown), bentuk:
     ```json
     { "rows": [ { "no": 1, "name": "AMBAR WIDYASTUTI", "signed": false, "confidence": "high|low" } ] }
     ```
   - `signed` = true jika kolom TTD berisi coretan/tanda tangan; false jika kosong. `confidence` = "low" bila tanda tangan tipis/di tepi/ragu.
   - Bersihkan hasil (strip ```json), `JSON.parse`, validasi. Jika gagal, lempar error yang ramah (ikuti gaya pesan error di `ai.js`).
2. Cocokkan hasil ke KPM kelompok aktif memakai `matchKpmByName` (yang sudah ada) supaya tahan beda ejaan. Hasil akhir: untuk tiap KPM di kelompok aktif → `presence` (dari `signed`) + tandai mana yang `confidence:"low"` atau tak terpetakan.

### FITUR 2 — Mesin aturan penilaian otomatis (dapat dikoreksi manual)

Buat helper murni, mis. `deriveUnderstanding(kpm)`:
- Tidak hadir (`presence === false`) → `"Tidak Dapat Dinilai"`.
- Hadir dan `components?.lansia === 1` → `"Kurang"`.
- Hadir selain itu → `"Baik"`.

Terapkan aturan ini setiap kali kehadiran di-set massal (hasil scan foto, dan opsional saat "Hadir Semua"), MENGGANTIKAN default lama yang selalu "Baik". PENTING:
- Jangan menimpa penilaian yang sudah DIKOREKSI MANUAL oleh pendamping. Tambahkan penanda per-KPM, mis. `understandingManual: true`, yang di-set saat pendamping mengubah dropdown Pemahaman lewat `handleUnderstandingChange`. Jika `understandingManual` true, aturan otomatis tidak mengubahnya.
- Sediakan toggle di Konfigurasi Laporan (accordion yang sudah ada di `InputTab.jsx`): "Terapkan penilaian otomatis (hadir=Baik, lansia tunggal=Kurang, absen=Tidak Dapat Dinilai)" — default ON. Supaya aturan transparan, bukan kotak hitam.

### FITUR 3 — Layar review & konfirmasi (bagian akurasi)

Setelah scan foto selesai, JANGAN langsung commit. Tampilkan modal review (pakai komponen modal / pola modal yang sudah ada, konsisten Tailwind):
- Daftar seluruh KPM kelompok aktif: status terdeteksi Hadir/Tidak Hadir, dan nilai penilaian hasil aturan.
- Baris `confidence:"low"` atau yang tak terpetakan DISOROT (mis. badge kuning "perlu cek") dan diletakkan di atas.
- Tiap baris bisa di-toggle cepat Hadir/Tidak Hadir.
- Tombol "Terapkan" → baru menulis ke data via `updateKpmItem` (atau batch) + sinkron Firestore. Tombol "Batal" → tidak mengubah apa pun.
- Tampilkan ringkasan: "X hadir, Y tidak hadir, Z perlu dicek".

## UI/UX

- Ikuti bahasa desain yang sudah ada: `rounded-2xl`/`rounded-xl`, shadow lembut, ikon `lucide-react`, dukung dark mode (`dark:` classes), animasi `animate-in` seperti komponen lain, dan gunakan `showToast`/`showAlert` yang sudah ada untuk umpan balik.
- Titik masuk fitur scan: tambahkan tombol di menu Tools (grid) `InputTab.jsx` atau dekat tombol Preview/Unduh Absensi, mis. label "Scan Absen (Foto)" dengan ikon kamera. Dukung ambil dari kamera HP (`<input type="file" accept="image/*" capture="environment">`) dan pilih dari galeri (bisa banyak file untuk multi-halaman).
- Tampilkan loader saat proses AI (pola `isCompressing`/`Loader2` sudah ada).
- Bahasa UI: Indonesia, singkat dan jelas.

## Batasan & kriteria penerimaan

- JANGAN merusak alur lama: input manual per KPM, "Hadir Semua", arsip sesi ke Riwayat, dan cetak laporan (`exportLaporanBulananPDF`, `exportSemesterPDF`) harus tetap jalan.
- Semua perubahan data lewat helper yang sudah ada (`updateKpmItem`, pola batch Firestore) supaya sinkron ke Firestore dan aman kuota localStorage (`safeSetItem`).
- Aturan penilaian tidak boleh menimpa koreksi manual (lihat `understandingManual`).
- Tangani kasus: foto buram/gagal baca, tak ada wajah baris cocok, jumlah baris beda dengan jumlah KPM (jangan crash — laporkan lewat modal review).
- Jangan menambah dependensi baru bila tidak perlu; manfaatkan Gemini + util yang sudah ada.
- Kerjakan bertahap dan jelaskan tiap perubahan file. Sebelum refactor besar, tanya dulu. Setelah selesai, jalankan `npm run lint` dan pastikan bersih.

## Keamanan data & rollback (WAJIB dipatuhi)

- Ini penambahan fitur, bukan penggantian. JANGAN menghapus atau mengganti fitur lama apa pun. Bila suatu perubahan berpotensi mengubah perilaku fitur lama, tanyakan dulu.
- JANGAN mengubah struktur/skema data KPM yang sudah tersimpan di Firestore secara destruktif. Field baru (mis. `understandingManual`) harus opsional dan aman bila tidak ada (backward compatible) — data KPM & riwayat sesi yang sudah ada tidak boleh hilang atau rusak.
- Jangan menyentuh alur cetak/unduh laporan (`exportLaporanBulananPDF`, `exportSemesterPDF`, `generateAbsensiPDF`, `exportGraduationLetter`) selain jika memang diminta.
- Kerjakan di git branch baru (mis. `fitur-scan-absen`), commit bertahap dengan pesan jelas, jangan langsung di `main`. Sebutkan perintah git yang kamu jalankan.
- Setelah selesai, beri instruksi cara uji lokal (`npm run dev`) dan checklist regresi singkat: input manual, "Hadir Semua", arsip sesi ke Riwayat, unduh laporan bulanan & semester harus tetap normal.

## Definition of Done

1. Bisa memotret/mengunggah 1–2 foto lembar absen → muncul modal review terisi otomatis → konfirmasi → kehadiran & penilaian kelompok aktif terisi dan tersinkron.
2. Penilaian mengikuti aturan (hadir=Baik, lansia tunggal=Kurang, absen=Tidak Dapat Dinilai), dan koreksi manual tidak tertimpa.
3. Toggle aturan otomatis tersedia dan berfungsi.
4. Tidak ada regresi pada input manual, arsip sesi, dan cetak laporan. Lint bersih.
