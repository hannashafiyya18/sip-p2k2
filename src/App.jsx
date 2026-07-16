import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CheckCircle, Loader2, Eye, X, FileText, Plus, RefreshCw,
  History, CheckCheck, Save, Search, Check, Minus, AlertTriangle,
  Camera, Image as ImageIcon, HelpCircle, ScanLine, Copy, Download, FileSpreadsheet,
  ChevronDown, ImageOff, LogIn, UserX, CloudUpload, CopyX
} from 'lucide-react';

// --- IMPORT FIREBASE ---
import { auth, db, appId } from './config/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";

// --- IMPORT CONSTANTS, HELPERS, & PDF ---
import { AID_VALUES, COMPONENT_LABELS, PKH_MODULES, INITIAL_DATA, UNDERSTANDING_LEVELS, DEFAULT_CONFIG, STORAGE_KEY_DATA, STORAGE_KEY_CONFIG, STORAGE_KEY_HISTORY, STORAGE_KEY_VIEW_SETTINGS, STORAGE_KEY_AUTO_ASSESS, STORAGE_KEY_LOGO_KIRI, STORAGE_KEY_LOGO_KANAN } from './utils/constants';
import { calculateTotalAid, sanitizeForFirestore, compressImage, safeSetItem, stripHeavyHistoryFields, deriveUnderstanding, findDuplicateKpm } from './utils/helpers';
import { exportGraduationLetter, exportSemesterPDF, exportLaporanBulananPDF, exportAbsensiPDF } from './utils/pdfGenerator';
import { buildRekapKecamatan, rekapRowValues, downloadRekapXLSX } from './utils/rekapGenerator';

// --- IMPORT KOMPONEN UI ---
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import InputTab from './components/tabs/InputTab';
import JurnalTab from './components/tabs/JurnalTab';
import HistoryTab from './components/tabs/HistoryTab';
import GraduasiTab from './components/tabs/GraduasiTab';
import ChatBot from './components/layout/ChatBot';

// --- IMPORT AI SERVICES ---
// import { generateJournalSummary, predictGraduation, parseAisearchQuery } from './services/ai';
import { parseAgentCommand, matchGroup, matchKpmByName, extractKtpData, extractAttendanceSheet, matchMateri } from './services/aiAgent';

// --- KOMPONEN BANTUAN UI ---
const renderComponentBadges = (comps, isCompact) => {
    if (!comps) return null; const badges = [];
    if (comps.sd) badges.push({ label: `${comps.sd} SD`, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' });
    if (comps.smp) badges.push({ label: `${comps.smp} SMP`, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' });
    if (comps.sma) badges.push({ label: `${comps.sma} SMA`, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' });
    if (comps.hamil) badges.push({ label: `${comps.hamil} Bumil`, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300' });
    if (comps.balita) badges.push({ label: `${comps.balita} Balita`, color: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300' });
    if (comps.disabilitas) badges.push({ label: `${comps.disabilitas} Disab`, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' });
    if (comps.lansia) badges.push({ label: `${comps.lansia} Lansia`, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' });
    if (badges.length === 0) return null; 
    const sizeClass = isCompact ? 'text-[9px] px-1 py-0' : 'text-[10px] px-2 py-0.5';
    return badges.map((b, i) => <span key={i} className={`${sizeClass} rounded-full ${b.color} font-bold tracking-tight border border-current/10`}>{b.label}</span>);
};

// --- MAIN COMPONENT ---
export default function App() {
  // STATE MANAGEMENT
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  // Menandai snapshot pertama dari Firestore sudah tiba. Dipakai layar penyelamatan sesi
  // Tamu agar tidak menyimpulkan "tidak ada data" saat datanya sebenarnya masih dimuat.
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [viewSettings, setViewSettings] = useState(() => { try { const saved = localStorage.getItem(STORAGE_KEY_VIEW_SETTINGS); return saved ? JSON.parse(saved) : { theme: 'light', density: 'normal' }; } catch { return { theme: 'light', density: 'normal' }; } });
  const [showViewMenu, setShowViewMenu] = useState(false); 
  const [data, setData] = useState([]);
  const [history, setHistory] = useState([]);
  const [groupConfigs, setGroupConfigs] = useState({});
  const [currentConfig, setCurrentConfig] = useState(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState('input');
  const [selectedGroup, setSelectedGroup] = useState("Semua Kelompok");
  const [selectedGroupJurnal, setSelectedGroupJurnal] = useState("Semua Kelompok");
  const [searchTerm, setSearchTerm] = useState("");
  const [showReportConfig, setShowReportConfig] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(true); 
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [showGroupFilter, setShowGroupFilter] = useState(false);
  const [groupSearchTerm, setGroupSearchTerm] = useState(""); 
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedModule, setSelectedModule] = useState("");
  const [visibleCount, setVisibleCount] = useState(50); 
  const [isCompressing, setIsCompressing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isScanningAbsen, setIsScanningAbsen] = useState(false);
  const [scanReview, setScanReview] = useState(null); // { groupName, rows, unmatchedNames } hasil scan lembar absen, menunggu konfirmasi
  const [autoAssess, setAutoAssess] = useState(() => { try { return localStorage.getItem(STORAGE_KEY_AUTO_ASSESS) !== 'false'; } catch { return true; } });
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [semesterYear, setSemesterYear] = useState(new Date().getFullYear());
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [semesterGroup, setSemesterGroup] = useState("Semua Kelompok");
  const [bulananMonth, setBulananMonth] = useState(new Date().getMonth());
  const [bulananYear, setBulananYear] = useState(new Date().getFullYear());
  const [bulananGroup, setBulananGroup] = useState("Semua Kelompok");
  const [showBulananMonthModal, setShowBulananMonthModal] = useState(false);
  const [showBulananGroupModal, setShowBulananGroupModal] = useState(false);
  const [bulananGroupSearchTerm, setBulananGroupSearchTerm] = useState("");
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [showSemesterGroupModal, setShowSemesterGroupModal] = useState(false);
  const [semesterGroupSearchTerm, setSemesterGroupSearchTerm] = useState("");
  const [isLaporanBulananOpen, setIsLaporanBulananOpen] = useState(false);
  const [isLaporanSemesterOpen, setIsLaporanSemesterOpen] = useState(false);
  const [isRekapOpen, setIsRekapOpen] = useState(false);
  const [rekapMonth, setRekapMonth] = useState(new Date().getMonth());
  const [rekapYear, setRekapYear] = useState(new Date().getFullYear());
  const [showRekapMonthModal, setShowRekapMonthModal] = useState(false);
  const [rekapPreview, setRekapPreview] = useState(null); // hasil buildRekapKecamatan + koreksi manual pengguna
  const [editingHistory, setEditingHistory] = useState(null);
  const [tempHistoryDetails, setTempHistoryDetails] = useState([]);
  const [historyFilterYear, setHistoryFilterYear] = useState(new Date().getFullYear());
  const [historyFilterMonth, setHistoryFilterMonth] = useState('all'); 
  const [historyFilterGroup, setHistoryFilterGroup] = useState('Semua Kelompok');
  const [showHistoryGroupFilter, setShowHistoryGroupFilter] = useState(false);
  const [historyGroupSearchTerm, setHistoryGroupSearchTerm] = useState("");
  
  const [tempHistoryMeta, setTempHistoryMeta] = useState({ tempat: "", materi: "", pemateri: "", fotoKegiatan: null, tanggal: "" });
  const [historyEditSearch, setHistoryEditSearch] = useState("");
  const [historyMetaOpen, setHistoryMetaOpen] = useState(false); // accordion "Detail Sesi" di modal edit riwayat

  const [dedupReview, setDedupReview] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // REFS
  const mobileLoadMoreRef = useRef(null);
  const fileInputRef = useRef(null);
  const ktpInputRef = useRef(null);
  const scrollContainerRef = useRef(null); 
  const prevSelectedGroupRef = useRef(selectedGroup);
  const quotaWarnedRef = useRef(false);
  const toastTimerRef = useRef(null);

  // MODALS
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });
  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
  const [noteModal, setNoteModal] = useState({ isOpen: false, kpmId: null, kpmName: '', text: '' });
  const [editModal, setEditModal] = useState({ isOpen: false, data: null });
  // const [isAiLoading, setIsAiLoading] = useState(false);

  // EFFECTS
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); setIsInstallable(true); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if (import.meta.env.PROD && 'serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').then(() => console.log('SW registered'), (err) => console.log('SW failed', err)); }); }
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return; deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstallable(false); setDeferredPrompt(null);
  };

  useEffect(() => {
    // 1. Handle jika auth tidak ada / mode offline
    if (!auth) {
        setLoadingAuth(false);
        try {
            const savedData = localStorage.getItem(STORAGE_KEY_DATA);
            setData(savedData ? (Array.isArray(JSON.parse(savedData)) ? JSON.parse(savedData) : []) : []);
            const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY); 
            setHistory(savedHistory ? (Array.isArray(JSON.parse(savedHistory)) ? JSON.parse(savedHistory) : []) : []);
            const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG); 
            setGroupConfigs(savedConfig ? JSON.parse(savedConfig) : {});
        } catch { 
            setData(INITIAL_DATA); setHistory([]); 
        }
        return;
    }

    // 2. Gunakan onAuthStateChanged sebagai penentu utama (Single Source of Truth).
    // Sesi Tamu (anonim) TIDAK lagi dibuat: data terikat per-UID, sehingga tiap perangkat
    // mendapat lemari sendiri dan tidak pernah tersinkron. Aplikasi ini mensyaratkan login
    // Google. Sesi anonim lama tetap diterima di sini agar datanya tidak terlantar —
    // penanganannya ada di layar penyelamatan (lihat GuestRescueScreen di bawah).
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser || null);
        setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && db) {
        setCloudLoaded(false);
        const qData = query(collection(db, `artifacts/${appId}/users/${user.uid}/kpm_data`));
        const unsubData = onSnapshot(qData, (snapshot) => { const items = []; snapshot.forEach(doc => items.push(doc.data())); setData(items.length > 0 ? items.sort((a,b) => a.name.localeCompare(b.name)) : []); setCloudLoaded(true); });
        const qHist = query(collection(db, `artifacts/${appId}/users/${user.uid}/history`));
        const unsubHist = onSnapshot(qHist, (snapshot) => { const items = []; snapshot.forEach(doc => items.push(doc.data())); setHistory(items.sort((a,b) => b.id - a.id)); });
        return () => { unsubData(); unsubHist(); };
    }
  }, [user]);

  useEffect(() => { safeSetItem(STORAGE_KEY_DATA, JSON.stringify(data)); }, [data]);
  useEffect(() => {
    // localStorage hanya cache teks offline; foto riwayat hidup di Firestore (saat login)
    // dan dari sanalah PDF/tampilan mengambilnya. Foto base64 sangat besar dan cepat
    // menembus kuota localStorage (~5MB), jadi TIDAK pernah disimpan ke sini — inilah yang
    // membuat notice "penyimpanan penuh" muncul berulang meski data KPM sudah dirapikan.
    const slim = JSON.stringify(stripHeavyHistoryFields(history));
    if (safeSetItem(STORAGE_KEY_HISTORY, slim)) return;
    // Versi ringan pun gagal = perangkat benar-benar penuh (jarang). Data tetap aman di akun.
    if (!quotaWarnedRef.current) {
      quotaWarnedRef.current = true;
      showToast("Penyimpanan perangkat hampir penuh. Data Anda tetap aman di akun — hanya cadangan offline yang tak tersimpan.", 'warning');
    }
  }, [history]);
  useEffect(() => { safeSetItem(STORAGE_KEY_VIEW_SETTINGS, JSON.stringify(viewSettings)); if (viewSettings.theme === 'dark') document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); }, [viewSettings]);
  useEffect(() => { safeSetItem(STORAGE_KEY_AUTO_ASSESS, String(autoAssess)); }, [autoAssess]);

  // MEMOS
  const dynamicGroups = useMemo(() => ["Semua Kelompok", ...[...new Set(data.map(item => item.group))].sort()], [data]);
  const handleGroupSelection = (group) => { if (activeTab === 'jurnal') setSelectedGroupJurnal(group); else setSelectedGroup(group); setShowGroupFilter(false); setGroupSearchTerm(""); };

  useEffect(() => {
    let nextConfig = groupConfigs[selectedGroup] || { ...DEFAULT_CONFIG, tempat: `Rumah Ketua Kelompok ${selectedGroup}` };
    if (selectedGroup === "Semua Kelompok") nextConfig = groupConfigs["Semua Kelompok"] || DEFAULT_CONFIG;
    nextConfig = { ...DEFAULT_CONFIG, ...nextConfig };
    const savedLogoKiri = localStorage.getItem(STORAGE_KEY_LOGO_KIRI); const savedLogoKanan = localStorage.getItem(STORAGE_KEY_LOGO_KANAN);
    if (savedLogoKiri) nextConfig.logoKiri = savedLogoKiri; if (savedLogoKanan) nextConfig.logoKanan = savedLogoKanan;
    setCurrentConfig(nextConfig);

    const groupChanged = prevSelectedGroupRef.current !== selectedGroup;
    prevSelectedGroupRef.current = selectedGroup;

    if (nextConfig.materi) {
      const foundModule = Object.keys(PKH_MODULES).find(key => nextConfig.materi.includes(key));
      if (foundModule) setSelectedModule(foundModule);
      else setSelectedModule("");
    } else if (groupChanged) {
      setSelectedModule("");
    }
  }, [selectedGroup, groupConfigs]); 
  const filteredHistory = useMemo(() => {
      if (!Array.isArray(history)) return [];
      return history.filter(h => {
          if (!h || !h.date) return false;
          const hDate = new Date(h.date); const matchYear = hDate.getFullYear() === parseInt(historyFilterYear); const matchMonth = historyFilterMonth === 'all' || hDate.getMonth() === parseInt(historyFilterMonth); const matchGroup = historyFilterGroup === 'Semua Kelompok' || h.groupName === historyFilterGroup;
          return matchYear && matchMonth && matchGroup;
      });
  }, [history, historyFilterYear, historyFilterMonth, historyFilterGroup]);

  const filteredData = useMemo(() => { return data.filter(item => { const matchesGroup = selectedGroup === "Semua Kelompok" || item.group === selectedGroup; const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || (item.nik && item.nik.includes(searchTerm)); return matchesGroup && matchesSearch; }); }, [data, selectedGroup, searchTerm]);
  const filteredJurnalData = useMemo(() => { return data.filter(i => { const hasNote = i.note && i.note.trim() !== ""; const matchesGroup = selectedGroupJurnal === "Semua Kelompok" || i.group === selectedGroupJurnal; return hasNote && matchesGroup; }); }, [data, selectedGroupJurnal]);
  const filteredGraduationData = useMemo(() => { return data.filter(item => item.graduationStatus === 'proposed' || item.graduationStatus === 'ready'); }, [data]);

  const stats = useMemo(() => {
    const total = filteredData.length; const present = filteredData.filter(d => d.presence).length;
    let totalAid = 0; let totalComponents = 0; let componentsCount = { hamil:0, balita:0, sd:0, smp:0, sma:0, lansia:0, disabilitas:0 }; let understandingCount = { kurang: 0, baik: 0, sangatBaik: 0, tidakDinilai: 0 };
    filteredData.forEach(item => {
        totalAid += calculateTotalAid(item.components);
        if(item.components) { Object.keys(item.components).forEach(k => { if(item.components[k]) { componentsCount[k] = (componentsCount[k] || 0) + item.components[k]; totalComponents += item.components[k]; } }); }
        if (item.presence) {
            if (item.understanding === 'Kurang') understandingCount.kurang++; else if (item.understanding === 'Baik') understandingCount.baik++; else if (item.understanding === 'Sangat Baik') understandingCount.sangatBaik++; else understandingCount.tidakDinilai++;
        }
    });
    return { total, present, absent: total - present, totalAid, componentsCount, totalComponents, understandingCount };
  }, [filteredData]);

  const paginatedData = useMemo(() => filteredData.slice(0, visibleCount), [filteredData, visibleCount]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => { if (entries.some(e => e.isIntersecting) && visibleCount < filteredData.length) setVisibleCount(p => Math.min(p + 50, filteredData.length)); }, { threshold: 0.1 });
    if (mobileLoadMoreRef.current) observer.observe(mobileLoadMoreRef.current); return () => observer.disconnect();
  }, [filteredData.length, visibleCount]);

  // UI ACTIONS
  const showToast = (message, variant = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ show: true, message, variant });
    // Peringatan diberi waktu baca lebih lama daripada notifikasi sukses biasa.
    toastTimerRef.current = setTimeout(() => setToast({ show: false, message: '', variant: 'success' }), variant === 'warning' ? 5500 : 3000);
  };
  const showAlert = (title, message) => setModal({ isOpen: true, type: 'alert', title, message, onConfirm: null, variant: 'danger' });
  const showConfirm = (title, message, onConfirm, variant = 'danger') => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm, variant });
  const closeModal = () => setModal({ ...modal, isOpen: false });
  const openNoteModal = (kpmId, kpmName, currentNote) => setNoteModal({ isOpen: true, kpmId, kpmName, text: currentNote || '' });
  const closeNoteModal = () => setNoteModal({ isOpen: false, kpmId: null, kpmName: '', text: '' });
  const openEditModal = (item) => setEditModal({ isOpen: true, data: { ...item, components: item.components || {} } });
  const closeEditModal = () => setEditModal({ isOpen: false, data: null });

  // DATA ACTIONS
  const updateKpmItem = async (updatedItem) => {
    const cleanItem = sanitizeForFirestore(updatedItem);
    setData(prev => prev.some(item => item.id === cleanItem.id) ? prev.map(item => item.id === cleanItem.id ? cleanItem : item) : [cleanItem, ...prev]);
    if (user && db) { await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/kpm_data`, String(cleanItem.id)), cleanItem); }
  };
  // Toggle kehadiran manual mereset penilaian ke default, jadi penanda koreksi manual ikut dihapus
  const handleStatusChange = (item) => updateKpmItem({ ...item, presence: !item.presence, understanding: !item.presence ? "Baik" : "-", understandingManual: false });
  // Pendamping mengubah dropdown Pemahaman = koreksi manual; penilaian otomatis tidak boleh menimpanya lagi
  const handleUnderstandingChange = (item, newVal) => updateKpmItem({ ...item, understanding: newVal, understandingManual: true });
  // Nilai pemahaman saat kehadiran di-set massal: hormati koreksi manual, lalu aturan otomatis (jika aktif), lalu default lama
  const massUnderstanding = (item, presence) => item.understandingManual === true ? item.understanding : (autoAssess ? deriveUnderstanding(item, presence) : (presence ? "Baik" : "-"));
  const saveNote = () => { const item = data.find(i => i.id === noteModal.kpmId); if (item) { updateKpmItem({ ...item, note: noteModal.text }); showToast("Catatan disimpan"); } closeNoteModal(); };
  const deleteNote = (item) => updateKpmItem({ ...item, note: "" });
  const saveEditedKPM = () => {
    if (!editModal.data.name || !editModal.data.name.trim()) { showAlert("Nama Kosong", "Nama lengkap KPM wajib diisi."); return; }
    updateKpmItem({ ...editModal.data, name: editModal.data.name.trim(), group: (editModal.data.group || "").trim() || "Umum" });
    closeEditModal();
    showToast(editModal.isNew ? "KPM baru berhasil ditambahkan" : "Data berhasil diperbarui");
  };
  const handleEditChange = (field, value) => setEditModal(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));

  // Scan KTP/KK -> OCR -> isi field form yang masih kosong
  const handleScanKtp = async (e) => {
    const file = e.target.files[0];
    if (ktpInputRef.current) ktpInputRef.current.value = "";
    if (!file) return;
    setIsScanning(true);
    try {
      const dataUrl = await compressImage(file);
      const ocr = await extractKtpData(dataUrl);
      if (!ocr || (!ocr.name && !ocr.nik && !ocr.noKK)) {
        showAlert("Tidak Terbaca", "Data pada foto tidak terbaca jelas. Coba foto ulang dengan pencahayaan lebih baik dan dokumen tegak/tidak buram.");
        return;
      }
      // Hanya isi field yang masih kosong agar tidak menimpa input manual pengguna
      setEditModal(prev => {
        if (!prev.data) return prev;
        const d = { ...prev.data };
        const fill = (key, val) => { if (val && (!d[key] || String(d[key]).trim() === "")) d[key] = String(val).trim(); };
        fill('name', ocr.name);
        fill('nik', ocr.nik);
        fill('noKK', ocr.noKK);
        fill('address', ocr.address);
        fill('desa', ocr.desa);
        fill('kecamatan', ocr.kecamatan);
        fill('kabupaten', ocr.kabupaten);
        fill('provinsi', ocr.provinsi);
        return { ...prev, data: d };
      });
      showToast(`Data ${ocr.docType === 'KK' ? 'Kartu Keluarga' : 'KTP'} terbaca — mohon periksa kembali`);
    } catch (err) {
      showAlert("Scan Gagal", err.message || "Gagal memproses foto dokumen. Periksa koneksi internet Anda.");
    } finally {
      setIsScanning(false);
    }
  };
  // Scan lembar DAFTAR HADIR (1-2 foto) -> AI baca kolom TTD -> modal review (tidak langsung commit)
  const handleScanAbsen = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    if (filteredData.length === 0) { showAlert("Belum Ada KPM", "Pilih kelompok yang berisi KPM terlebih dahulu sebelum scan lembar absen."); return; }
    setIsScanningAbsen(true);
    try {
      const dataUrls = [];
      for (const f of files) dataUrls.push(await compressImage(f));
      const { header, rows } = await extractAttendanceSheet(dataUrls, filteredData.map(k => k.name));
      if (rows.length === 0) { showAlert("Tidak Terbaca", "Tidak ada baris daftar hadir yang terbaca di foto. Coba foto ulang dengan lebih terang dan seluruh tabel terlihat."); return; }

      // Kepala dokumen -> usulan isi Konfigurasi Laporan. Field yang tidak terbaca
      // dibiarkan null (nilai konfigurasi lama dipertahankan, tidak dikosongkan).
      const materiMatch = header.materi ? matchMateri(header.materi) : null;
      const scanConfig = {
        tanggal: header.tanggal,
        tempat: header.tempat,
        materi: materiMatch ? `Modul ${materiMatch.module} - ${materiMatch.session}` : null,
        materiRaw: header.materi,
        // Lembar milik kelompok lain? matchGroup null = nama di foto tidak mirip kelompok aktif
        groupMismatch: (header.kelompok && selectedGroup !== 'Semua Kelompok' && !matchGroup(header.kelompok, [selectedGroup])) ? header.kelompok : null,
        apply: true,
      };
      const adaUsulan = scanConfig.tanggal || scanConfig.tempat || scanConfig.materi || scanConfig.materiRaw || scanConfig.groupMismatch;

      // Petakan tiap baris hasil baca ke KPM kelompok aktif: fuzzy nama dulu, lalu nomor urut
      const rowByKpmId = new Map();
      const unmatchedNames = [];
      for (const row of rows) {
        let target = null;
        if (row.name) { const res = matchKpmByName(row.name, filteredData); if (res.match) target = res.match; }
        if (!target && row.no && filteredData[row.no - 1]) target = filteredData[row.no - 1];
        if (target) {
          const prev = rowByKpmId.get(target.id);
          // Baris dobel (foto tumpang tindih antar halaman): utamakan yang terbaca bertanda tangan
          if (!prev || (row.signed && !prev.signed)) rowByKpmId.set(target.id, row);
        } else if (row.name) {
          unmatchedNames.push(row.name);
        }
      }

      const reviewRows = filteredData.map(k => {
        const row = rowByKpmId.get(k.id);
        return {
          id: k.id, name: k.name,
          presence: row ? row.signed : k.presence,
          needsCheck: !row || row.confidence === 'low',
          reason: !row ? 'tidak terbaca di foto' : (row.confidence === 'low' ? 'tanda tangan samar' : null),
          manual: k.understandingManual === true,
          understanding: k.understanding || '-',
          lansiaSingle: k.components?.lansia === 1,
        };
      });
      setScanReview({ groupName: selectedGroup, rows: reviewRows, unmatchedNames, config: adaUsulan ? scanConfig : null });
    } catch (err) {
      showAlert("Scan Absen Gagal", err.message || "Gagal memproses foto lembar absen. Periksa koneksi internet Anda.");
    } finally {
      setIsScanningAbsen(false);
    }
  };

  const toggleScanRow = (id) => setScanReview(prev => prev ? { ...prev, rows: prev.rows.map(r => r.id === id ? { ...r, presence: !r.presence } : r) } : prev);
  const toggleScanConfig = () => setScanReview(prev => prev?.config ? { ...prev, config: { ...prev.config, apply: !prev.config.apply } } : prev);

  // --- BERSIHKAN KPM GANDA ---
  const handleFindDuplicates = () => {
    const clusters = findDuplicateKpm(data);
    if (clusters.length === 0) { showAlert("Tidak Ada Data Ganda", "Semua KPM sudah unik — tidak ditemukan data dobel."); return; }
    setDedupReview({ clusters: clusters.map(c => ({ ...c, apply: true })) });
  };
  const toggleDedupCluster = (key) => setDedupReview(prev => prev ? { ...prev, clusters: prev.clusters.map(c => c.key === key ? { ...c, apply: !c.apply } : c) } : prev);

  // Tombol "Bersihkan" di modal: baru di sinilah penghapusan terjadi (state + Firestore)
  const applyDedup = async () => {
    if (!dedupReview) return;
    const toRemove = dedupReview.clusters.filter(c => c.apply).flatMap(c => c.remove);
    if (toRemove.length === 0) { setDedupReview(null); return; }
    const removeIds = new Set(toRemove.map(r => r.id));
    setData(prev => prev.filter(item => !removeIds.has(item.id)));
    setDedupReview(null);
    try {
      if (user && db) {
        const ids = [...removeIds];
        const chunkSize = 400;
        for (let i = 0; i < ids.length; i += chunkSize) {
          const batch = writeBatch(db);
          ids.slice(i, i + chunkSize).forEach(id => batch.delete(doc(db, `artifacts/${appId}/users/${user.uid}/kpm_data`, String(id))));
          await batch.commit();
        }
      }
      showToast(`${toRemove.length} data ganda dihapus — tersisa ${data.length - toRemove.length} KPM`);
    } catch (e) {
      console.error("Hapus data ganda gagal", e);
      showAlert("Error", "Sebagian penghapusan gagal tersimpan ke database. Periksa koneksi lalu jalankan Bersihkan Data Ganda sekali lagi.");
    }
  };

  // Tombol "Terapkan" di modal review: baru di sinilah data kehadiran ditulis (state + Firestore batch)
  const applyScanReview = async () => {
    if (!scanReview) return;
    const rowById = new Map(scanReview.rows.map(r => [r.id, r]));
    const updates = [];
    const updatedData = data.map(item => {
      const row = rowById.get(item.id);
      if (!row) return item;
      const understanding = massUnderstanding(item, row.presence);
      if (item.presence === row.presence && item.understanding === understanding) return item;
      const next = sanitizeForFirestore({ ...item, presence: row.presence, understanding });
      updates.push(next);
      return next;
    });
    setData(updatedData);

    // Isi Konfigurasi Laporan dari kepala dokumen foto (bila sakelar "Isi otomatis" aktif).
    // Hanya field yang terbaca yang ditimpa; sisanya mempertahankan nilai lama.
    let configApplied = false;
    const cfg = scanReview.config;
    if (cfg?.apply) {
      const patch = {};
      if (cfg.tanggal) patch.tanggal = cfg.tanggal;
      if (cfg.tempat) patch.tempat = cfg.tempat;
      if (cfg.materi) patch.materi = cfg.materi;
      if (Object.keys(patch).length > 0) {
        const newConfig = { ...currentConfig, ...patch };
        setCurrentConfig(newConfig);
        const newConfigs = { ...groupConfigs, [scanReview.groupName]: newConfig };
        setGroupConfigs(newConfigs);
        safeSetItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfigs));
        configApplied = true;
      }
    }

    try {
      if (user && db && updates.length > 0) {
        const chunkSize = 400;
        for (let i = 0; i < updates.length; i += chunkSize) {
          const batch = writeBatch(db);
          updates.slice(i, i + chunkSize).forEach(item => batch.set(doc(db, `artifacts/${appId}/users/${user.uid}/kpm_data`, String(item.id)), item));
          await batch.commit();
        }
      }
      const hadir = scanReview.rows.filter(r => r.presence).length;
      showToast(`Hasil scan diterapkan: ${hadir} hadir, ${scanReview.rows.length - hadir} tidak hadir${configApplied ? ' · konfigurasi terisi dari foto' : ''}`);
    } catch (e) {
      console.error("Apply scan review error", e);
      showAlert("Error", "Sebagian perubahan gagal tersimpan ke database. Periksa koneksi lalu coba lagi.");
    } finally {
      setScanReview(null);
    }
  };

  const handleComponentChange = (key, delta) => { setEditModal(prev => { const comps = prev.data.components || {}; const currentVal = comps[key] || 0; const newVal = Math.max(0, currentVal + delta); return { ...prev, data: { ...prev.data, components: { ...comps, [key]: newVal } } }; }); };

  const handleMarkAllPresent = () => { 
    if (filteredData.length === 0) return; 
    showConfirm("Konfirmasi Hadir Semua", "Hadirkan semua KPM di list ini?", async () => { 
        const updatedData = data.map(item => { const isInFiltered = filteredData.some(f => f.id === item.id); if (isInFiltered && !item.presence) { return { ...item, presence: true, understanding: massUnderstanding(item, true) }; } return item; });
        setData(updatedData);
        if (user && db) {
            const batch = writeBatch(db);
            filteredData.forEach(item => { if (!item.presence) { const newItem = { ...item, presence: true, understanding: massUnderstanding(item, true) }; const ref = doc(db, `artifacts/${appId}/users/${user.uid}/kpm_data`, String(item.id)); batch.set(ref, sanitizeForFirestore(newItem)); } });
            await batch.commit();
        }
        closeModal(); showToast("Semua KPM ditandai Hadir");
    }, 'primary');
  };

  const handleAddKPM = () => {
    const newId = Date.now(); const groupToAdd = selectedGroup === "Semua Kelompok" ? (dynamicGroups[1] || "Umum") : selectedGroup;
    const newItem = { id: newId, name: "", nik: "", noKK: "", bpnt: false, group: groupToAdd, address: "", components: {}, presence: false, understanding: "-", note: "", graduationStatus: null, desa: "", kecamatan: "", kabupaten: "", provinsi: "" };
    setEditModal({ isOpen: true, data: newItem, isNew: true });
  };

  const handleDeleteKPM = async (id) => showConfirm("Hapus Data", "Permanen?", async () => { if (user && db) await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/kpm_data`, String(id))); else setData(prev => prev.filter(item => item.id !== id)); closeModal(); showToast("Dihapus"); });
  const handleDeleteAllData = async () => {
    showConfirm("Hapus SEMUA Data KPM?", "Tindakan ini akan menghapus SELURUH data KPM Anda secara permanen. Data tidak bisa dikembalikan.", async () => {
        if (user && db) {
            const chunkSize = 400; 
            for (let i = 0; i < data.length; i += chunkSize) {
                const chunk = data.slice(i, i + chunkSize); const batch = writeBatch(db);
                chunk.forEach(item => { const ref = doc(db, `artifacts/${appId}/users/${user.uid}/kpm_data`, String(item.id)); batch.delete(ref); });
                await batch.commit();
            }
        }
        setData([]); closeModal(); showToast("Semua data KPM berhasil dihapus");
    });
  };

  const handleDeleteHistory = async (id) => { showConfirm("Hapus Riwayat", "Data ini akan dihapus permanen. Lanjutkan?", async () => { if (user && db) { await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/history`, String(id))); } setHistory(prev => prev.filter(h => h.id !== id)); closeModal(); showToast("Riwayat dihapus"); }); };

  const handleEditHistory = (historyItem) => {
      let detailsToEdit = [];
      if (historyItem.details) { if (Array.isArray(historyItem.details)) { detailsToEdit = JSON.parse(JSON.stringify(historyItem.details)); } else if (typeof historyItem.details === 'object') { detailsToEdit = Object.values(historyItem.details); } } 
      else { if (historyItem.groupName === "Semua Kelompok") { detailsToEdit = data.map(item => ({ name: item.name, group: item.group, presence: false, understanding: "-" })); } else { detailsToEdit = data.filter(item => item.group === historyItem.groupName).map(item => ({ name: item.name, group: item.group, presence: false, understanding: "-" })); } }
      setTempHistoryDetails(detailsToEdit); 
      setTempHistoryMeta({
          tempat: historyItem.tempat || "",
          materi: historyItem.materi || "",
          pemateri: historyItem.pemateri || "",
          fotoKegiatan: historyItem.fotoKegiatan || null,
          tanggal: historyItem.date || ""
      });
      setHistoryEditSearch("");
      setHistoryMetaOpen(false);
      setEditingHistory(historyItem);
  };

  const handleTempHistoryChange = (index, field, value) => { const newDetails = [...tempHistoryDetails]; newDetails[index] = { ...newDetails[index], [field]: value }; if (field === 'presence') { if (value === true) newDetails[index].understanding = 'Baik'; else newDetails[index].understanding = '-'; } setTempHistoryDetails(newDetails); };
  const handleMarkAllTempPresent = (status) => { const newDetails = tempHistoryDetails.map(item => ({ ...item, presence: status, understanding: status ? 'Baik' : '-' })); setTempHistoryDetails(newDetails); };
  const handleMarkAllTempBaik = () => { setTempHistoryDetails(prev => prev.map(item => item.presence ? { ...item, understanding: 'Baik' } : item)); };

  const handleHistoryPhotoUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setIsCompressing(true);
      try {
          const compressed = await compressImage(file);
          setTempHistoryMeta(prev => ({ ...prev, fotoKegiatan: compressed }));
          showToast("Foto dokumentasi diperbarui sementara");
      } catch {
          showAlert("Error", "Gagal memproses foto dokumentasi");
      } finally {
          setIsCompressing(false);
      }
  };

  const saveHistoryEdit = async () => {
      if (!editingHistory) return;
      const presentCount = tempHistoryDetails.filter(d => d.presence).length; const totalCount = tempHistoryDetails.length; const absentCount = totalCount - presentCount;
      const { tanggal, ...restMeta } = tempHistoryMeta;
      const updatedHistoryItem = { ...editingHistory, ...restMeta, date: tanggal || editingHistory.date, details: tempHistoryDetails, stats: { total: totalCount, present: presentCount, absent: absentCount } };
      setHistory(prev => prev.map(h => h.id === editingHistory.id ? updatedHistoryItem : h));
      if (user && db) { try { const histRef = doc(db, `artifacts/${appId}/users/${user.uid}/history`, String(editingHistory.id)); await setDoc(histRef, sanitizeForFirestore(updatedHistoryItem)); showToast("Perubahan Riwayat Disimpan"); } catch (e) { console.error("Update History Error", e); showAlert("Error", "Gagal menyimpan perubahan ke database."); } } else { showToast("Perubahan Riwayat Disimpan (Lokal)"); }
      setEditingHistory(null); setTempHistoryDetails([]); setTempHistoryMeta({ tempat: "", materi: "", pemateri: "", fotoKegiatan: null, tanggal: "" }); setHistoryEditSearch("");
  };

  const handleProposeGraduation = (item) => { if (item.graduationStatus) { showToast("KPM sudah dalam daftar usulan graduasi."); return; } updateKpmItem({ ...item, graduationStatus: 'proposed' }); showToast("Berhasil diusulkan graduasi"); };
  const handleUpdateGraduationStatus = (item, status) => { updateKpmItem({ ...item, graduationStatus: status }); showToast(`Status diubah menjadi: ${status === 'ready' ? 'Siap Graduasi' : 'Usulan'}`); };
  const handleCancelGraduation = (item) => { updateKpmItem({ ...item, graduationStatus: null }); showToast("Usulan graduasi dibatalkan"); };

  // --- AI ACTIONS (DISABELD / NOT USED AS PER USER REQUEST) ---
  /*
  const handleAisearch = async (query) => {
    if (!query.trim()) return;
    setIsAiLoading(true);
    try {
      const parsed = await parseAisearchQuery(query, dynamicGroups);
      if (parsed) {
        if (parsed.group && parsed.group !== "Semua") setSelectedGroup(parsed.group);
        if (parsed.nameSearch) setSearchTerm(parsed.nameSearch);
        // Bisa dikembangkan lebih lanjut untuk filter status & component
        showToast("Pencarian AI diterapkan");
      }
    } catch {
      showAlert("Pencarian AI Gagal", "Gagal memproses kalimat Anda.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerateSummary = async (groupName) => {
    const sessionInfo = { groupName, materi: currentConfig.materi, tanggal: currentConfig.tanggal };
    const groupData = data.filter(item => item.group === groupName);
    if (groupData.length === 0) { showAlert("Data Kosong", "Tidak ada KPM dalam kelompok ini."); return; }
    
    setIsAiLoading(true);
    try {
      const summary = await generateJournalSummary(sessionInfo, groupData);
      if (summary) {
          // Cari KPM pertama di kelompok ini untuk menempelkan catatan jurnal
          const firstKpm = groupData.find(k => k.presence);
          if (firstKpm) {
              setNoteModal({ isOpen: true, kpmId: firstKpm.id, kpmName: firstKpm.name, text: summary });
              showToast("Summary AI berhasil dibuat");
          } else {
              showAlert("Kehadiran Kosong", "Summary hanya bisa dibuat jika ada KPM yang hadir.");
          }
      }
    } catch {
      showAlert("AI Gagal", "Gagal membuat summary otomatis.");
    } finally {
      setIsAiLoading(false);
    }
  };
  */

  // --- AI AGENT (DIKTE SUARA / PERINTAH TEKS) ---
  // Menerima kalimat natural, menerjemahkannya ke perintah, lalu mengeksekusi aksi
  // pada data kehadiran. Mengembalikan { message } untuk ditampilkan di chat,
  // atau null agar chatbot memprosesnya sebagai obrolan biasa.
  const handleAgentCommand = async (text) => {
    const cleanGroups = dynamicGroups.filter(g => g !== "Semua Kelompok");
    const todayISO = currentConfig.tanggal || new Date().toISOString().split('T')[0];

    let cmd;
    try {
      cmd = await parseAgentCommand(text, { groups: cleanGroups, currentGroup: selectedGroup, todayISO });
    } catch (e) {
      return { message: `⚠️ ${e.message || 'Gagal memproses perintah suara.'}` };
    }
    if (!cmd || cmd.intent === 'chat') return null; // biarkan chatbot menjawab biasa

    // Tentukan kelompok target
    let targetGroup = selectedGroup;
    if (cmd.group) {
      const mg = matchGroup(cmd.group, cleanGroups);
      if (mg) { targetGroup = mg; setSelectedGroup(mg); }
      else targetGroup = cmd.group;
    }

    // Tentukan tanggal target
    const targetDate = cmd.date || currentConfig.tanggal;
    if (cmd.date) handleConfigChange('tanggal', cmd.date);

    const groupList = targetGroup === "Semua Kelompok" ? data : data.filter(d => d.group === targetGroup);

    switch (cmd.intent) {
      case 'select_group': {
        if (!cleanGroups.includes(targetGroup)) return { message: `⚠️ Kelompok "${cmd.group}" tidak ditemukan. Kelompok tersedia: ${cleanGroups.join(', ') || '-'}.` };
        return { message: `✅ Kelompok **${targetGroup}** dipilih (${groupList.length} KPM).` };
      }

      case 'set_date':
        return { message: `✅ Tanggal pertemuan diubah menjadi **${targetDate}**.` };

      case 'mark_all': {
        if (groupList.length === 0) return { message: `⚠️ Tidak ada KPM di kelompok "${targetGroup}".` };
        const presence = cmd.presence !== false;
        const updates = groupList.filter(k => k.presence !== presence);
        for (const k of updates) await updateKpmItem({ ...k, presence, understanding: presence ? 'Baik' : '-' });
        return { message: `✅ ${updates.length} KPM di **${targetGroup}** ditandai **${presence ? 'HADIR' : 'TIDAK HADIR'}**.` };
      }

      case 'save_session': {
        if (groupList.length === 0) return { message: `⚠️ Tidak ada data di "${targetGroup}" untuk disimpan.` };
        const cfg = cmd.date ? { ...currentConfig, tanggal: cmd.date } : currentConfig;
        await performArchive(groupList, targetGroup, cfg);
        setActiveTab('history');
        return { message: `💾 Sesi **${targetGroup}** (${targetDate}) disimpan ke Riwayat dan ceklis kehadiran direset.` };
      }

      case 'add_kpm': {
        const k = cmd.kpm || {};
        const name = (k.name || '').trim();
        if (!name) return { message: '⚠️ Nama KPM belum tertangkap. Sebutkan minimal nama lengkapnya, contoh: "Tambah KPM baru nama Siti Aminah kelompok Rajek Depok, komponen 2 SD 1 balita".' };

        // Tentukan kelompok KPM: dari perintah, atau kelompok yang sedang dibuka
        let kpmGroup = cmd.group ? (matchGroup(cmd.group, cleanGroups) || cmd.group.trim()) : (selectedGroup !== 'Semua Kelompok' ? selectedGroup : null);
        if (!kpmGroup) return { message: `⚠️ Kelompok belum jelas untuk KPM "${name}". Sebutkan kelompoknya, contoh: "...kelompok Rajek Depok".` };

        // Cegah dobel: nama sama persis di kelompok yang sama
        const dup = data.find(d => d.group === kpmGroup && (d.name || '').trim().toLowerCase() === name.toLowerCase());
        if (dup) return { message: `⚠️ KPM "${dup.name}" sudah ada di kelompok **${kpmGroup}**, jadi tidak ditambahkan agar tidak dobel. Kalau memang orang berbeda, tambahkan lewat tombol +.` };

        const compLabels = { sd: 'SD', smp: 'SMP', sma: 'SMA', balita: 'Balita', hamil: 'Bumil', disabilitas: 'Disabilitas', lansia: 'Lansia' };
        const rawComp = k.components || {};
        const components = {};
        for (const key of Object.keys(compLabels)) { const v = parseInt(rawComp[key]); if (!isNaN(v) && v > 0) components[key] = v; }

        const newItem = {
          id: Date.now(), name,
          nik: (k.nik || '').toString().replace(/\s/g, '').trim(),
          noKK: (k.noKK || '').toString().replace(/\s/g, '').trim(),
          bpnt: k.bpnt === true, group: kpmGroup, address: (k.address || '').trim(),
          components, presence: false, understanding: '-', note: '', graduationStatus: null,
          desa: '', kecamatan: '', kabupaten: '', provinsi: ''
        };
        await updateKpmItem(newItem);
        setSelectedGroup(kpmGroup);

        const compSummary = Object.keys(components).length ? Object.entries(components).map(([kk, v]) => `${v} ${compLabels[kk]}`).join(', ') : 'belum ada';
        const details = [
          `👤 **${name}**`,
          `🏘️ Kelompok: ${kpmGroup}`,
          newItem.nik ? `🆔 NIK: ${newItem.nik}` : null,
          newItem.noKK ? `📄 No. KK: ${newItem.noKK}` : null,
          newItem.address ? `📍 Alamat: ${newItem.address}` : null,
          `🧩 Komponen: ${compSummary}`,
          `🛒 BPNT: ${newItem.bpnt ? 'Ya' : 'Tidak'}`
        ].filter(Boolean).join('\n');
        return { message: `✅ KPM baru ditambahkan:\n${details}\n\nSilakan cek di daftar. Kalau NIK/alamat perlu dilengkapi, ketuk kartu KPM untuk mengedit.` };
      }

      case 'attendance': {
        if (groupList.length === 0) return { message: `⚠️ Tidak ada KPM di kelompok "${targetGroup}".` };
        const presence = cmd.presence !== false; // default: hadir, kecuali eksplisit "tidak hadir"
        const done = [], notFound = [], ambiguous = [];
        const matchedIds = new Set();

        for (const name of cmd.names) {
          const res = matchKpmByName(name, groupList);
          if (res.match) {
            await updateKpmItem({ ...res.match, presence, understanding: presence ? 'Baik' : '-' });
            done.push(res.match.name); matchedIds.add(res.match.id);
          } else if (res.candidates.length) {
            ambiguous.push(`❓ "${name}" mirip beberapa nama: ${res.candidates.map(c => c.name).join(', ')}. Sebutkan lebih lengkap.`);
          } else {
            notFound.push(name);
          }
        }

        if (cmd.othersPresence === true || cmd.othersPresence === false) {
          const others = groupList.filter(k => !matchedIds.has(k.id) && k.presence !== cmd.othersPresence);
          for (const k of others) await updateKpmItem({ ...k, presence: cmd.othersPresence, understanding: cmd.othersPresence ? 'Baik' : '-' });
        }

        const parts = [];
        if (done.length) parts.push(`${presence ? '✅ Ditandai HADIR' : '❌ Ditandai TIDAK HADIR'} di **${targetGroup}**: ${done.join(', ')}`);
        parts.push(...ambiguous);
        if (notFound.length) parts.push(`⚠️ Tidak ditemukan: ${notFound.join(', ')}`);
        if (cmd.othersPresence === true || cmd.othersPresence === false) parts.push(`KPM lainnya di **${targetGroup}** ditandai ${cmd.othersPresence ? 'HADIR' : 'TIDAK HADIR'}.`);
        return { message: parts.join('\n') || 'Tidak ada perubahan yang dilakukan.' };
      }

      default:
        return null;
    }
  };

  // --- PDF WRAPPERS ---
  const generateGraduationLetter = (kpm) => exportGraduationLetter({ kpm, currentConfig, setIsGeneratingPDF, showAlert, showToast });
  const generateSemesterPDF = (action = 'download') => exportSemesterPDF({ action, history, data, semesterYear, selectedSemester, semesterGroup, groupConfigs, currentConfig, setIsGeneratingPDF, showAlert, setPdfPreviewUrl });
  const generateLaporanBulananPDF = (action = 'download') => exportLaporanBulananPDF({ action, history, bulananYear, bulananMonth, bulananGroup, groupConfigs, currentConfig, setIsGeneratingPDF, showAlert, setPdfPreviewUrl });
  const generateAbsensiPDF = (action = 'download') => exportAbsensiPDF({ action, data, selectedGroup, groupConfigs, currentConfig, setIsGeneratingPDF, showAlert, setPdfPreviewUrl });

  // --- REKAP KECAMATAN (EXCEL) ---
  // Hitung angka rekap bulan terpilih dari Riwayat, tampilkan dulu untuk dikoreksi (materi/alasan dll), baru diunduh/disalin.
  const handleBuildRekap = () => {
    const r = buildRekapKecamatan({ history, data, currentConfig, month: rekapMonth, year: rekapYear });
    if (!r) {
      showAlert("Belum Ada Sesi Bulan Ini", `Tidak ada sesi ${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][rekapMonth]} ${rekapYear} di Riwayat. Rekap dihitung dari sesi yang sudah diarsipkan — selesaikan pertemuan lalu tekan "Selesai & Reset" di tab Input terlebih dahulu.`);
      return;
    }
    setRekapPreview(r);
  };
  const handleRekapField = (field, value) => setRekapPreview(prev => prev ? { ...prev, [field]: value } : prev);
  const handleCopyRekap = async () => {
    if (!rekapPreview) return;
    try {
      await navigator.clipboard.writeText(rekapRowValues(rekapPreview).join('\t'));
      showToast("Angka rekap disalin — tempel di baris Anda pada kolom Kecamatan");
    } catch {
      showAlert("Gagal Menyalin", "Browser menolak akses clipboard. Salin angka secara manual dari tampilan ini.");
    }
  };
  const handleDownloadRekap = async () => {
    if (!rekapPreview) return;
    try {
      await downloadRekapXLSX(rekapPreview);
      showToast("File Excel rekap berhasil diunduh");
    } catch (e) {
      console.error("Rekap XLSX error", e);
      showAlert("Error", "Gagal membuat file Excel rekap.");
    }
  };

  // --- CONFIG & FILES ---
  const handleConfigChange = (field, value) => { const newConfig = { ...currentConfig, [field]: value }; setCurrentConfig(newConfig); const newConfigs = { ...groupConfigs, [selectedGroup]: newConfig }; setGroupConfigs(newConfigs); safeSetItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfigs)); };
  // Nama Pendamping bersifat global: satu kali ubah, berlaku ke semua kelompok.
  const handlePendampingChange = (value) => { const newConfig = { ...currentConfig, pendamping: value }; setCurrentConfig(newConfig); const newConfigs = { ...groupConfigs }; Object.keys(newConfigs).forEach(g => { newConfigs[g] = { ...newConfigs[g], pendamping: value }; }); newConfigs[selectedGroup] = newConfig; setGroupConfigs(newConfigs); safeSetItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfigs)); };
  const handlePhotoUpload = async (e) => { const file = e.target.files[0]; if (!file) return; setIsCompressing(true); try { const compressed = await compressImage(file); handleConfigChange('fotoKegiatan', compressed); showToast("Foto berhasil dimuat"); } catch { showAlert("Error", "Gagal memproses foto"); } finally { setIsCompressing(false); } };
  const handleLogoKiriUpload = async (e) => { const file = e.target.files[0]; if (!file) return; try { const compressed = await compressImage(file); handleConfigChange('logoKiri', compressed); const ok = safeSetItem(STORAGE_KEY_LOGO_KIRI, compressed); showToast(ok ? "Logo Kiri Tersimpan Permanen" : "Logo dimuat, tapi memori lokal penuh — tidak tersimpan permanen"); } catch { showAlert("Error", "Gagal upload logo"); } };
  const handleLogoKananUpload = async (e) => { const file = e.target.files[0]; if (!file) return; try { const compressed = await compressImage(file); handleConfigChange('logoKanan', compressed); const ok = safeSetItem(STORAGE_KEY_LOGO_KANAN, compressed); showToast(ok ? "Logo Kanan Tersimpan Permanen" : "Logo dimuat, tapi memori lokal penuh — tidak tersimpan permanen"); } catch { showAlert("Error", "Gagal upload logo"); } };

  // Ubah baris tabel (array of array) menjadi data KPM. Dipakai bersama oleh CSV & Excel.
  // Baris ke-0 dianggap header dan dilewati. Urutan kolom mengikuti format ekspor resmi.
  const rowsToKpmData = (rows) => {
     const newData = []; let currentId = Date.now();
     for (let i = 1; i < rows.length; i++) {
         const raw = rows[i] || [];
         const clean = raw.map(c => (c === null || c === undefined) ? "" : String(c).trim());
         if (!clean[1]) continue; // lewati baris tanpa nama (termasuk baris kosong di Excel)
         const components = {}; const parseComp = (idx, key) => { const val = parseInt(clean[idx]); if (!isNaN(val) && val > 0) components[key] = val; };
         parseComp(11, 'balita'); parseComp(12, 'sd'); parseComp(13, 'smp'); parseComp(14, 'sma'); parseComp(15, 'disabilitas'); parseComp(16, 'lansia'); parseComp(17, 'hamil');
         newData.push(sanitizeForFirestore({ id: currentId++, name: clean[1] || "No Name", noKK: clean[2] || "-", nik: clean[3] || "-", address: clean[4] || "-", group: clean[21] || "Umum", desa: clean[5] || "-", kecamatan: clean[6] || "-", kabupaten: clean[7] || "-", provinsi: clean[8] || "-", bpnt: clean[22] === 'YA', components, presence: false, understanding: '-', note: "", graduationStatus: null }));
     }
     return newData;
  };

  const handleFileUpload = (event) => {
     const file = event.target.files[0]; if (!file) return;
     const fileName = (file.name || "").toLowerCase();
     const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
     const reader = new FileReader();
     reader.onload = async (e) => {
         try {
             let rows = [];
             if (isExcel) {
                 const XLSX = await import('xlsx');
                 const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                 const sheet = wb.Sheets[wb.SheetNames[0]];
                 rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
             } else {
                 const text = typeof e.target.result === 'string' ? e.target.result : new TextDecoder().decode(e.target.result);
                 rows = text.split('\n').map(line => {
                     const l = line.replace(/\r$/, '');
                     const parts = l.includes(';') ? l.split(';') : l.split(',');
                     return parts.map(p => p ? p.replace(/^"|"$/g, '').trim() : "");
                 });
             }
             const newData = rowsToKpmData(rows);
             if (newData.length > 0) { setPendingImport(newData); setImportModalOpen(true); }
             else { showAlert("Import Gagal", `Tidak ada baris data valid yang ditemukan di file ${isExcel ? 'Excel' : 'CSV'} ini. Periksa kembali format & urutan kolomnya.`); }
         } catch (err) { console.error("Import gagal", err); showAlert("Error", `Gagal membaca file ${isExcel ? 'Excel' : 'CSV'}. Pastikan file tidak rusak dan urutan kolomnya sesuai.`); } finally { if(fileInputRef.current) fileInputRef.current.value = ""; }
     };
     if (isExcel) reader.readAsArrayBuffer(file); else reader.readAsText(file);
  };

  const processImport = async (newData, shouldReplace) => {
      try {
          if (user && db) {
              if (shouldReplace && data.length > 0) {
                  const deleteChunkSize = 400;
                  for (let i = 0; i < data.length; i += deleteChunkSize) {
                      const chunk = data.slice(i, i + deleteChunkSize); const batch = writeBatch(db);
                      chunk.forEach(item => { const ref = doc(db, `artifacts/${appId}/users/${user.uid}/kpm_data`, String(item.id)); batch.delete(ref); });
                      await batch.commit();
                  }
              }
              const chunkSize = 400;
              for (let i = 0; i < newData.length; i += chunkSize) {
                    const chunk = newData.slice(i, i + chunkSize); const batch = writeBatch(db);
                    chunk.forEach(item => { const ref = doc(db, `artifacts/${appId}/users/${user.uid}/kpm_data`, String(item.id)); batch.set(ref, item); });
                    await batch.commit();
              }
          } else { if (shouldReplace) setData(newData); else setData(prev => [...prev, ...newData]); }
          showToast(`Berhasil mengimpor ${newData.length} data (${shouldReplace ? 'Ganti Data' : 'Tambah Data'})`); setImportModalOpen(false); setPendingImport(null);
      } catch (e) { console.error("Import failed", e); showAlert("Error", "Gagal menyimpan data import ke database."); }
  };

  // --- BACKUP & RESTORE ---
  const handleBackupData = () => {
    if (data.length === 0 && history.length === 0) { showAlert("Data Kosong", "Belum ada data KPM atau riwayat untuk dibackup."); return; }
    const backup = { app: 'SIP-P2K2', version: 1, exportedAt: new Date().toISOString(), data, history, groupConfigs };
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Backup_SIP-P2K2_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast("File backup berhasil diunduh");
  };

  const restoreBackup = async (backup) => {
    try {
        const newData = (backup.data || []).map(item => sanitizeForFirestore(item));
        const newHistory = (backup.history || []).map(item => sanitizeForFirestore(item));
        const newConfigs = backup.groupConfigs || {};
        if (user && db) {
            const chunkSize = 400;
            for (let i = 0; i < data.length; i += chunkSize) {
                const chunk = data.slice(i, i + chunkSize); const batch = writeBatch(db);
                chunk.forEach(item => batch.delete(doc(db, `artifacts/${appId}/users/${user.uid}/kpm_data`, String(item.id))));
                await batch.commit();
            }
            for (let i = 0; i < history.length; i += chunkSize) {
                const chunk = history.slice(i, i + chunkSize); const batch = writeBatch(db);
                chunk.forEach(item => batch.delete(doc(db, `artifacts/${appId}/users/${user.uid}/history`, String(item.id))));
                await batch.commit();
            }
            for (let i = 0; i < newData.length; i += chunkSize) {
                const chunk = newData.slice(i, i + chunkSize); const batch = writeBatch(db);
                chunk.forEach(item => batch.set(doc(db, `artifacts/${appId}/users/${user.uid}/kpm_data`, String(item.id)), item));
                await batch.commit();
            }
            for (let i = 0; i < newHistory.length; i += chunkSize) {
                const chunk = newHistory.slice(i, i + chunkSize); const batch = writeBatch(db);
                chunk.forEach(item => batch.set(doc(db, `artifacts/${appId}/users/${user.uid}/history`, String(item.id)), item));
                await batch.commit();
            }
        }
        setData(newData); setHistory(newHistory); setGroupConfigs(newConfigs);
        safeSetItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfigs));
        showToast("Backup berhasil dipulihkan");
    } catch (e) { console.error("Restore failed", e); showAlert("Error", "Gagal memulihkan backup ke database."); }
  };

  const handleRestoreFile = (event) => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const backup = JSON.parse(e.target.result);
            if (!backup || backup.app !== 'SIP-P2K2' || !Array.isArray(backup.data)) { showAlert("File Tidak Valid", "File ini bukan file backup SIP-P2K2."); return; }
            showConfirm("Pulihkan Backup?", `Backup berisi ${backup.data.length} data KPM dan ${(backup.history || []).length} riwayat (dibuat ${backup.exportedAt ? new Date(backup.exportedAt).toLocaleString('id-ID') : '-'}). SEMUA data saat ini akan DIGANTI dengan isi backup. Lanjutkan?`, () => restoreBackup(backup));
        } catch { showAlert("Error", "Gagal membaca file backup."); }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const performArchive = async (list, groupName, cfg) => {
     const present = list.filter(d=>d.presence).length;
     const sessionDetails = list.map(k => ({ name: k.name, group: k.group, presence: k.presence, understanding: k.understanding || "-", nik: k.nik || "-", noKK: k.noKK || "-", address: k.address || "-", components: k.components || {}, note: k.note || "" }));
     const newHist = sanitizeForFirestore({ id: Date.now(), date: cfg.tanggal, groupName, materi: cfg.materi, tempat: cfg.tempat, pemateri: cfg.pemateri, fotoKegiatan: cfg.fotoKegiatan, logoKiri: cfg.logoKiri, logoKanan: cfg.logoKanan, stats: { total: list.length, present, absent: list.length - present }, details: sessionDetails, savedAt: new Date().toLocaleString() });
     setHistory(prev => [newHist, ...prev]);

     if(user && db) { await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/history`, String(newHist.id)), newHist); }

     const idSet = new Set(list.map(i => i.id));
     setData(prev => prev.map(item => idSet.has(item.id) ? { ...item, presence: false, understanding: "-", note: "", understandingManual: false } : item));

     if (user && db) {
         const batch = writeBatch(db);
         list.forEach(item => {
             // Reset ke Firestore untuk KPM yang punya sesuatu untuk dibersihkan.
             // Kondisi understanding/manual ditambahkan agar nilai hasil penilaian otomatis pada
             // KPM yang absen (mis. "Tidak Dapat Dinilai") tidak tertinggal di database setelah reset.
             if (item.presence || item.note || (item.understanding && item.understanding !== "-") || item.understandingManual) {
                 const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/kpm_data`, String(item.id));
                 const cleanItem = { ...item, presence: false, understanding: "-", note: "", understandingManual: false };
                 batch.set(docRef, sanitizeForFirestore(cleanItem));
             }
         });
         await batch.commit();
     }
     return newHist;
  };

  const handleArchiveSession = async () => {
     if(filteredData.length===0) return;
     showConfirm("Selesai & Reset Sesi?", `Simpan ${filteredData.length} data ke Riwayat, lalu RESET ceklis kehadiran agar kosong untuk bulan depan?`,
         async () => {
             await performArchive(filteredData, selectedGroup, currentConfig);
             closeModal(); setActiveTab('history'); showToast("Sesi Disimpan & Data Direset");
         },
         'primary'
     );
  };

  const doGoogleLogin = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { showAlert("Login Gagal", e.message); } };

  // Salin data sesi Tamu ke akun Google yang baru login. Digabung per-ID dokumen,
  // jadi data yang sudah ada di akun Google tidak hilang.
  const migrateGuestData = async (guestData, guestHistory, targetUid) => {
    const chunkSize = 400;
    for (let i = 0; i < guestData.length; i += chunkSize) {
        const batch = writeBatch(db);
        guestData.slice(i, i + chunkSize).forEach(item => batch.set(doc(db, `artifacts/${appId}/users/${targetUid}/kpm_data`, String(item.id)), sanitizeForFirestore(item)));
        await batch.commit();
    }
    for (let i = 0; i < guestHistory.length; i += chunkSize) {
        const batch = writeBatch(db);
        guestHistory.slice(i, i + chunkSize).forEach(item => batch.set(doc(db, `artifacts/${appId}/users/${targetUid}/history`, String(item.id)), sanitizeForFirestore(item)));
        await batch.commit();
    }
  };

  const doGoogleLoginWithMigration = async (guestData, guestHistory) => {
    let result;
    try { result = await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { showAlert("Login Gagal", e.message); return; } // login batal: sesi Tamu & datanya tidak berubah
    if (!db) return;
    try {
        showToast("Memindahkan data Tamu ke akun Google…");
        await migrateGuestData(guestData, guestHistory, result.user.uid);
        showToast(`${guestData.length} data KPM & ${guestHistory.length} riwayat berhasil dipindahkan`);
    } catch (e) {
        console.error("Migrasi data Tamu gagal", e);
        // Jangan sampai ada data hilang: unduh cadangan darurat dari snapshot Tamu.
        try {
            const backup = { app: 'SIP-P2K2', version: 1, exportedAt: new Date().toISOString(), data: guestData, history: guestHistory, groupConfigs };
            const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `Backup_Darurat_DataTamu_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
            showAlert("Migrasi Terputus", "Login berhasil, tapi pemindahan data Tamu terputus di tengah jalan. File cadangan darurat sudah diunduh otomatis — pulihkan lewat menu Tools > Restore Backup.");
        } catch {
            showAlert("Migrasi Terputus", "Login berhasil, tapi pemindahan data Tamu terputus. Jangan hapus data di perangkat ini, lalu coba ulangi dari menu Tools > Backup & Restore.");
        }
    }
  };

  const handleLogin = async () => {
    if (!auth) { showAlert("Error", "Ganti API Key Firebase Anda terlebih dahulu di file config."); return; }
    if (user?.isAnonymous && (data.length > 0 || history.length > 0)) {
        const guestData = [...data]; const guestHistory = [...history];
        showConfirm("Pindahkan Data Tamu?", `Ada ${guestData.length} data KPM dan ${guestHistory.length} riwayat di sesi Tamu ini. Setelah login, semuanya akan otomatis dipindahkan ke akun Google Anda dan tersinkron antar perangkat. Lanjutkan?`, () => { closeModal(); doGoogleLoginWithMigration(guestData, guestHistory); }, 'primary');
        return;
    }
    doGoogleLogin();
  };
  const handleLogout = async () => { if (user) await signOut(auth); setUser(null); };
  const handleScroll = () => { if (scrollContainerRef.current) { const scrollLeft = scrollContainerRef.current.scrollLeft; const width = scrollContainerRef.current.offsetWidth; const index = Math.round(scrollLeft / width); setCurrentSlide(index); } };

  if (loadingAuth) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  const themeClass = viewSettings.theme === 'dark' ? 'dark' : '';
  const bgColor = 'bg-gray-50 dark:bg-gray-950';
  const cardColor = 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800';
  const textColor = 'text-gray-800 dark:text-gray-100';
  const subText = 'text-gray-500 dark:text-gray-400';
  const isCompact = viewSettings.density === 'compact';
  const cardPadding = isCompact ? 'p-2' : 'p-4';
  const cardGap = isCompact ? 'gap-2' : 'gap-4';
  const textSizeBase = isCompact ? 'text-sm' : 'text-base';
  const textSizeSub = isCompact ? 'text-[10px]' : 'text-xs';

  // Modal & toast dipakai di layar utama maupun layar penyelamatan sesi Tamu.
  const toastNode = toast.show && (() => {
    const isWarn = toast.variant === 'warning';
    const ToastIcon = isWarn ? AlertTriangle : CheckCircle;
    const chip = isWarn
      ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
      : 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400';
    const ring = isWarn ? 'ring-amber-300/50 dark:ring-amber-500/25' : 'ring-black/5 dark:ring-white/10';
    return (
      <div className="fixed top-4 inset-x-0 z-[100] flex justify-center px-3 pointer-events-none animate-in slide-in-from-top-4 fade-in duration-300">
        <div className={`pointer-events-auto flex items-center gap-3 w-full max-w-sm rounded-2xl px-4 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/70 dark:border-gray-700/70 shadow-xl shadow-black/10 ring-1 ${ring}`}>
          <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${chip}`}><ToastIcon size={18} strokeWidth={2.5} /></span>
          <p className="text-sm font-semibold leading-snug text-gray-800 dark:text-gray-100">{toast.message}</p>
        </div>
      </div>
    );
  })();
  const modalNode = modal.isOpen && (
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${modal.variant === 'primary' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>{modal.variant === 'primary' ? <HelpCircle size={32}/> : <AlertTriangle size={32}/>}</div>
              <h3 className="font-bold text-lg mb-2 dark:text-white">{modal.title}</h3><p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{modal.message}</p>
              <div className="flex gap-3">
                  <button onClick={closeModal} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-[0.98] transition">Batal</button>
                  {modal.type === 'confirm' && (<button onClick={() => { modal.onConfirm(); closeModal(); }} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg active:scale-[0.98] transition ${modal.variant === 'primary' ? 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700' : 'bg-red-600 shadow-red-600/20 hover:bg-red-700'}`}>Ya, Lanjutkan</button>)}
              </div>
          </div>
      </div>
  );

  const kartuLayar = "w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-7 text-center";

  // Belum ada sesi: aplikasi mensyaratkan akun Google agar data tersinkron antar perangkat.
  // Layar hero: latar navy + aurora (blob cahaya melayang perlahan), kartu login kaca.
  if (auth && !user) return (
    <div className="min-h-screen font-sans hero-bg relative overflow-hidden flex items-center justify-center p-5">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <span className="hero-blob hero-blob-1"></span>
        <span className="hero-blob hero-blob-2"></span>
        <span className="hero-blob hero-blob-3"></span>
        <span className="hero-blob hero-blob-4"></span>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(6,9,20,.55) 100%)' }} />
      </div>
      <div className="relative w-full max-w-sm rounded-3xl border border-white/15 bg-white/[0.07] backdrop-blur-2xl p-7 text-center shadow-2xl shadow-black/50">
        <div className="relative w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-white bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-600/40">
          <span className="hero-ring" aria-hidden="true"></span>
          <FileText size={26} strokeWidth={2.5} />
        </div>
        <h1 className="font-bold text-2xl mt-4 tracking-tight text-white">SIP-P2K2</h1>
        <p className="text-xs font-bold text-blue-300 mt-1 tracking-wide">Pendamping PKH</p>
        <p className="text-sm text-white/70 mt-4 leading-relaxed">Login dengan akun Google Anda. Data tersimpan di akun tersebut dan otomatis tersinkron antara HP dan laptop.</p>
        <button onClick={doGoogleLogin} className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] shadow-lg shadow-blue-600/40 transition flex items-center justify-center gap-2">
          <LogIn size={17} /> Login dengan Google
        </button>
      </div>
      {modalNode}
      {toastNode}
    </div>
  );

  // Sesi Tamu lama (dari versi sebelumnya). Mode Tamu sudah tidak dibuat lagi, tapi sesi yang
  // terlanjur ada tidak boleh dibuang diam-diam: datanya tersimpan di UID anonim dan hanya
  // bisa diselamatkan dari sini.
  if (auth && user?.isAnonymous) {
    const adaData = data.length > 0 || history.length > 0;
    return (
      <div className={`min-h-screen font-sans ${themeClass} ${bgColor} flex items-center justify-center p-5`}>
        <div className={kartuLayar}>
          {!cloudLoaded ? (
            <>
              <Loader2 className="animate-spin text-blue-600 mx-auto" size={30} />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Memeriksa data sesi Tamu…</p>
            </>
          ) : (
            <>
              <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ${adaData ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
                {adaData ? <CloudUpload size={26} /> : <UserX size={26} />}
              </div>
              <h1 className="font-bold text-lg mt-4 tracking-tight text-gray-900 dark:text-white">{adaData ? 'Selamatkan Data Mode Tamu' : 'Mode Tamu Dihentikan'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
                {adaData
                  ? <>Perangkat ini masih memakai Mode Tamu, yang datanya tidak tersinkron. Ditemukan <b className="text-gray-700 dark:text-gray-200">{data.length} data KPM</b> dan <b className="text-gray-700 dark:text-gray-200">{history.length} riwayat</b> di sini. Login untuk memindahkan semuanya ke akun Google Anda.</>
                  : <>Perangkat ini memakai Mode Tamu yang sudah tidak didukung. Tidak ada data yang tersimpan di sini, jadi tidak ada yang hilang. Silakan login untuk melanjutkan.</>}
              </p>
              <button onClick={handleLogin} className="w-full mt-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 active:scale-[0.98] shadow-lg shadow-blue-600/25 transition flex items-center justify-center gap-2">
                <LogIn size={17} /> {adaData ? 'Login & Pindahkan Data' : 'Login dengan Google'}
              </button>
              {adaData && (
                <button onClick={handleBackupData} className="w-full mt-2 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2">
                  <Download size={15} /> Unduh Cadangan Dulu
                </button>
              )}
            </>
          )}
        </div>
        {modalNode}
        {toastNode}
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans ${themeClass} ${bgColor} text-sm transition-colors duration-300 pb-24 md:pb-6`}>
      
      <Header 
        activeTab={activeTab} setActiveTab={setActiveTab} isInstallable={isInstallable}
        handleInstallClick={handleInstallClick} fileInputRef={fileInputRef} handleFileUpload={handleFileUpload}
        showViewMenu={showViewMenu} setShowViewMenu={setShowViewMenu} viewSettings={viewSettings}
        setViewSettings={setViewSettings} setShowReportConfig={setShowReportConfig} setIsConfigOpen={setIsConfigOpen}
        user={user} handleLogin={handleLogin} handleLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {activeTab === 'input' && (
           <InputTab
              scrollContainerRef={scrollContainerRef} handleScroll={handleScroll} cardColor={cardColor} subText={subText} stats={stats}
              currentSlide={currentSlide} searchTerm={searchTerm} setSearchTerm={setSearchTerm} setShowGroupFilter={setShowGroupFilter}
              selectedGroup={selectedGroup} textColor={textColor} showToolsMenu={showToolsMenu} setShowToolsMenu={setShowToolsMenu}
              handleAddKPM={handleAddKPM} handleMarkAllPresent={handleMarkAllPresent} handleArchiveSession={handleArchiveSession}
              handleDeleteAllData={handleDeleteAllData} handleBackupData={handleBackupData} handleRestoreFile={handleRestoreFile}
              showReportConfig={showReportConfig} isConfigOpen={isConfigOpen}
              setIsConfigOpen={setIsConfigOpen} currentConfig={currentConfig} handleConfigChange={handleConfigChange} handlePendampingChange={handlePendampingChange}
              selectedModule={selectedModule} setSelectedModule={setSelectedModule} isCompressing={isCompressing}
              handlePhotoUpload={handlePhotoUpload} handleLogoKiriUpload={handleLogoKiriUpload} handleLogoKananUpload={handleLogoKananUpload}
              generateAbsensiPDF={generateAbsensiPDF} isGeneratingPDF={isGeneratingPDF} paginatedData={paginatedData} cardPadding={cardPadding}
              isCompact={isCompact} cardGap={cardGap} handleStatusChange={handleStatusChange} expandedId={expandedId} setExpandedId={setExpandedId}
              textSizeBase={textSizeBase} textSizeSub={textSizeSub} renderComponentBadges={renderComponentBadges} handleUnderstandingChange={handleUnderstandingChange}
              openNoteModal={openNoteModal} openEditModal={openEditModal} handleProposeGraduation={handleProposeGraduation}
              handleDeleteKPM={handleDeleteKPM} visibleCount={visibleCount} filteredData={filteredData} mobileLoadMoreRef={mobileLoadMoreRef}
              handleScanAbsen={handleScanAbsen} isScanningAbsen={isScanningAbsen} autoAssess={autoAssess} setAutoAssess={setAutoAssess}
              handleFindDuplicates={handleFindDuplicates}
           />
        )}

        {activeTab === 'jurnal' && (
           <JurnalTab
              cardColor={cardColor} textColor={textColor} selectedGroupJurnal={selectedGroupJurnal}
              setShowGroupFilter={setShowGroupFilter} filteredJurnalData={filteredJurnalData}
              openNoteModal={openNoteModal} deleteNote={deleteNote}
           />
        )}

        {activeTab === 'graduasi' && (
            <GraduasiTab
              cardColor={cardColor} textColor={textColor} filteredGraduationData={filteredGraduationData}
              handleCancelGraduation={handleCancelGraduation} handleUpdateGraduationStatus={handleUpdateGraduationStatus}
              generateGraduationLetter={generateGraduationLetter} isGeneratingPDF={isGeneratingPDF}
            />
        )}

        {activeTab === 'history' && (
            <HistoryTab
              isLaporanBulananOpen={isLaporanBulananOpen} setIsLaporanBulananOpen={setIsLaporanBulananOpen} setShowBulananMonthModal={setShowBulananMonthModal}
              bulananMonth={bulananMonth} bulananYear={bulananYear} setBulananYear={setBulananYear} setShowBulananGroupModal={setShowBulananGroupModal}
              bulananGroup={bulananGroup} generateLaporanBulananPDF={generateLaporanBulananPDF} isGeneratingPDF={isGeneratingPDF}
              isLaporanSemesterOpen={isLaporanSemesterOpen} setIsLaporanSemesterOpen={setIsLaporanSemesterOpen} setShowSemesterModal={setShowSemesterModal}
              selectedSemester={selectedSemester} semesterYear={semesterYear} setSemesterYear={setSemesterYear} setShowSemesterGroupModal={setShowSemesterGroupModal}
              semesterGroup={semesterGroup} generateSemesterPDF={generateSemesterPDF} filteredHistory={filteredHistory} setShowHistoryGroupFilter={setShowHistoryGroupFilter}
              historyFilterGroup={historyFilterGroup} historyFilterYear={historyFilterYear} setHistoryFilterYear={setHistoryFilterYear}
              historyFilterMonth={historyFilterMonth} setHistoryFilterMonth={setHistoryFilterMonth} textColor={textColor} cardColor={cardColor}
              handleEditHistory={handleEditHistory} handleDeleteHistory={handleDeleteHistory}
              isRekapOpen={isRekapOpen} setIsRekapOpen={setIsRekapOpen} rekapMonth={rekapMonth} rekapYear={rekapYear}
              setRekapYear={setRekapYear} setShowRekapMonthModal={setShowRekapMonthModal} handleBuildRekap={handleBuildRekap}
            />
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <ChatBot stats={stats} dynamicGroups={dynamicGroups} onAgentCommand={handleAgentCommand} />

      {/* --- LINGERING MODALS & POP-UPS --- */}
      {toastNode}

      {pdfPreviewUrl && (
          <div className="fixed inset-0 z-[300] bg-gray-900/90 backdrop-blur-sm flex flex-col animate-in fade-in">
              <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow-md">
                  <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Eye size={18} className="text-blue-600" /> Preview Dokumen Laporan</h3>
                  <button onClick={() => setPdfPreviewUrl(null)} className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 font-bold rounded-lg transition flex items-center gap-2 text-sm"><X size={16}/> Tutup</button>
              </div>
              <div className="flex-1 w-full h-full p-2 sm:p-6"><iframe src={pdfPreviewUrl} className="w-full h-full rounded-xl shadow-2xl bg-white border-0"></iframe></div>
          </div>
      )}

      {isScanningAbsen && (
          <div className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-3xl p-8 shadow-2xl text-center animate-in zoom-in-95 duration-200">
                  <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={36} />
                  <p className="font-bold dark:text-white">Membaca lembar absen…</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">AI sedang memeriksa kolom tanda tangan satu per satu.</p>
              </div>
          </div>
      )}

      {scanReview && (() => {
          const sortedRows = [...scanReview.rows].sort((a, b) => (b.needsCheck ? 1 : 0) - (a.needsCheck ? 1 : 0));
          const hadir = scanReview.rows.filter(r => r.presence).length;
          const perluCek = scanReview.rows.filter(r => r.needsCheck).length;
          const previewNilai = (r) => r.manual ? r.understanding : (autoAssess ? (r.presence ? (r.lansiaSingle ? 'Kurang' : 'Baik') : 'Tidak Dapat Dinilai') : (r.presence ? 'Baik' : '-'));
          return (
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-200">
                  <div className="p-5 pb-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 rounded-xl flex items-center justify-center shrink-0"><ScanLine size={22}/></div>
                          <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg dark:text-white leading-tight">Review Hasil Scan Absen</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{scanReview.groupName} — periksa dulu sebelum diterapkan</p>
                          </div>
                          <button onClick={() => setScanReview(null)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition shrink-0"><X size={18} className="dark:text-gray-300"/></button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{hadir} hadir</span>
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{scanReview.rows.length - hadir} tidak hadir</span>
                          {perluCek > 0 && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center gap-1"><AlertTriangle size={12}/> {perluCek} perlu dicek</span>}
                      </div>
                      {scanReview.unmatchedNames.length > 0 && (
                          <p className="text-[11px] text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-lg px-3 py-2 mt-2">Nama terbaca di foto tapi tidak cocok dengan KPM mana pun: {scanReview.unmatchedNames.join(', ')}</p>
                      )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                      {scanReview.config?.groupMismatch && (
                          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                              <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"/>
                              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">Lembar ini tampaknya milik kelompok <b>"{scanReview.config.groupMismatch}"</b>, sedangkan kelompok aktif adalah <b>"{scanReview.groupName}"</b>. Pastikan tidak salah lembar sebelum menerapkan.</p>
                          </div>
                      )}
                      {scanReview.config && (
                          <div className={`p-3 rounded-xl border transition ${scanReview.config.apply ? 'border-violet-200 dark:border-violet-900 bg-violet-50/60 dark:bg-violet-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60'}`}>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                  <p className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5"><FileText size={13} className="text-violet-500"/> Konfigurasi laporan dari foto</p>
                                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600 dark:text-violet-400 cursor-pointer select-none">
                                      <input type="checkbox" checked={scanReview.config.apply} onChange={toggleScanConfig} className="accent-violet-600 w-3.5 h-3.5"/> Isi otomatis
                                  </label>
                              </div>
                              <div className="space-y-1 text-[11px]">
                                  <p className="text-gray-600 dark:text-gray-300">Tanggal: {scanReview.config.tanggal
                                      ? <b>{new Date(scanReview.config.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</b>
                                      : <span className="text-yellow-700 dark:text-yellow-400">tidak terbaca — nilai lama dipertahankan</span>}</p>
                                  <p className="text-gray-600 dark:text-gray-300">Materi: {scanReview.config.materi
                                      ? <b>{scanReview.config.materi}</b>
                                      : scanReview.config.materiRaw
                                      ? <span className="text-yellow-700 dark:text-yellow-400">terbaca "{scanReview.config.materiRaw}" tapi tidak cocok daftar modul — pilih manual di Konfigurasi</span>
                                      : <span className="text-yellow-700 dark:text-yellow-400">tidak terbaca — nilai lama dipertahankan</span>}</p>
                                  <p className="text-gray-600 dark:text-gray-300">Tempat: {scanReview.config.tempat
                                      ? <b>{scanReview.config.tempat}</b>
                                      : <span className="text-yellow-700 dark:text-yellow-400">tidak terbaca — nilai lama dipertahankan</span>}</p>
                              </div>
                          </div>
                      )}
                      {sortedRows.map(r => (
                          <div key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border ${r.needsCheck ? 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/60 dark:bg-yellow-900/10' : r.presence ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-900 ring-1 ring-green-100 dark:ring-green-900/30' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700'}`}>
                              <button onClick={() => toggleScanRow(r.id)} className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${r.presence ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>{r.presence ? <Check strokeWidth={3} size={20}/> : <X size={18}/>}</button>
                              <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm truncate text-gray-900 dark:text-white">{r.name}</p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Nilai: <span className="font-bold">{previewNilai(r)}</span>{r.manual && <span className="text-blue-500"> · koreksi manual</span>}</p>
                              </div>
                              {r.needsCheck && <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" title={r.reason || ''}>perlu cek</span>}
                          </div>
                      ))}
                  </div>
                  <div className="p-4 border-t border-gray-100 dark:border-gray-700 shrink-0 flex gap-3">
                      <button onClick={() => setScanReview(null)} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-[0.98] transition">Batal</button>
                      <button onClick={applyScanReview} className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-[0.98] transition flex items-center justify-center gap-2"><CheckCheck size={18}/> Terapkan</button>
                  </div>
              </div>
          </div>
          );
      })()}

      {dedupReview && (() => {
          const aktif = dedupReview.clusters.filter(c => c.apply);
          const akanHapus = aktif.reduce((n, c) => n + c.remove.length, 0);
          const perluCek = dedupReview.clusters.filter(c => c.needsCheck).length;
          const sorted = [...dedupReview.clusters].sort((a, b) => (b.needsCheck ? 1 : 0) - (a.needsCheck ? 1 : 0));
          return (
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-200">
                  <div className="p-5 pb-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0"><CopyX size={22}/></div>
                          <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg dark:text-white leading-tight">Bersihkan Data Ganda</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{dedupReview.clusters.length} KPM punya salinan — periksa dulu sebelum dihapus</p>
                          </div>
                          <button onClick={() => setDedupReview(null)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition shrink-0"><X size={18} className="dark:text-gray-300"/></button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{akanHapus} akan dihapus</span>
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">tersisa {data.length - akanHapus} KPM</span>
                          {perluCek > 0 && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center gap-1"><AlertTriangle size={12}/> {perluCek} perlu dicek</span>}
                      </div>
                      <button onClick={handleBackupData} className="w-full mt-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition flex items-center justify-center gap-1.5">
                          <Download size={14}/> Unduh Cadangan Dulu (disarankan)
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                      {sorted.map(c => (
                          <div key={c.key} className={`p-3 rounded-xl border ${!c.apply ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60' : c.needsCheck ? 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/60 dark:bg-yellow-900/10' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="min-w-0">
                                      <p className="font-bold text-sm truncate text-gray-900 dark:text-white">{c.keep.name}</p>
                                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{c.keep.group} · {c.remove.length + 1} kartu · cocok via {c.by === 'nik' ? 'NIK' : 'nama + kelompok'}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                      {c.needsCheck && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" title="Tidak ada NIK — dicocokkan lewat nama, pastikan bukan dua orang berbeda">perlu cek</span>}
                                      <label className="flex items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                                          <input type="checkbox" checked={c.apply} onChange={() => toggleDedupCluster(c.key)} className="accent-amber-600 w-3.5 h-3.5"/> bersihkan
                                      </label>
                                  </div>
                              </div>
                              <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-[10px] px-2 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900">
                                      <Check size={12} className="text-green-600 dark:text-green-400 shrink-0"/>
                                      <span className="text-green-800 dark:text-green-300 truncate">DISIMPAN: {c.keep.nik && c.keep.nik !== '-' ? `NIK ${c.keep.nik}` : 'tanpa NIK'} · {c.keep.address && c.keep.address !== '-' ? c.keep.address : 'tanpa alamat'} · {Object.keys(c.keep.components || {}).length} komponen</span>
                                  </div>
                                  {c.remove.map(r => (
                                      <div key={r.id} className="flex items-center gap-2 text-[10px] px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900">
                                          <X size={12} className="text-red-500 shrink-0"/>
                                          <span className="text-red-700 dark:text-red-300 truncate">DIHAPUS: {r.nik && r.nik !== '-' ? `NIK ${r.nik}` : 'tanpa NIK'} · {r.address && r.address !== '-' ? r.address : 'tanpa alamat'} · {Object.keys(r.components || {}).length} komponen</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="p-4 border-t border-gray-100 dark:border-gray-700 shrink-0 flex gap-3">
                      <button onClick={() => setDedupReview(null)} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-[0.98] transition">Batal</button>
                      <button onClick={() => showConfirm("Hapus Data Ganda?", `${akanHapus} kartu akan dihapus permanen, menyisakan ${data.length - akanHapus} KPM. Pastikan Anda sudah mengunduh cadangan. Lanjutkan?`, applyDedup)} disabled={akanHapus === 0} className="flex-1 py-3 rounded-xl font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"><CopyX size={18}/> Bersihkan</button>
                  </div>
              </div>
          </div>
          );
      })()}

      {importModalOpen && pendingImport && (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0"><FileText size={22}/></div>
                      <div>
                          <h3 className="font-bold text-lg dark:text-white leading-tight">Pratinjau Import Data</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Terbaca <span className="font-bold text-blue-600 dark:text-blue-400">{pendingImport.length} KPM</span> — periksa dulu sebelum diimpor</p>
                      </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-3">
                      <table className="w-full text-xs">
                          <thead>
                              <tr className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                                  <th className="text-left font-bold px-3 py-2">Nama</th>
                                  <th className="text-left font-bold px-3 py-2">NIK</th>
                                  <th className="text-left font-bold px-3 py-2">Kelompok</th>
                                  <th className="text-center font-bold px-3 py-2">Komponen</th>
                              </tr>
                          </thead>
                          <tbody>
                              {pendingImport.slice(0, 5).map((row, i) => (
                                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                                      <td className="px-3 py-2 font-bold text-gray-800 dark:text-gray-100 truncate max-w-[140px]">{row.name}</td>
                                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400 truncate max-w-[110px]">{row.nik}</td>
                                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400 truncate max-w-[100px]">{row.group}</td>
                                      <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-300 font-bold">{Object.values(row.components || {}).reduce((a, b) => a + b, 0)}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                      {pendingImport.length > 5 && <p className="text-[10px] text-gray-400 text-center py-1.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">…dan {pendingImport.length - 5} baris lainnya</p>}
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-4">Jika nama/kelompok terlihat salah kolom, kemungkinan urutan kolom file berbeda — batalkan dan periksa file-nya.</p>
                  <div className="flex flex-col gap-2.5">
                      <button onClick={() => processImport(pendingImport, false)} className="p-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-[0.98]"><Plus size={16}/> Tambahkan ke Data Sekarang</button>
                      {data.length > 0 && (
                          <button onClick={() => processImport(pendingImport, true)} className="p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition text-sm flex items-center justify-center gap-2 border border-red-200 dark:border-red-900 active:scale-[0.98]"><RefreshCw size={16}/> Ganti Semua Data Lama ({data.length} KPM)</button>
                      )}
                      <button onClick={() => { setImportModalOpen(false); setPendingImport(null); }} className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm active:scale-[0.98]">Batal</button>
                  </div>
              </div>
          </div>
      )}

      {editingHistory && (
          <div className="fixed inset-0 z-[100] bg-gray-100/90 dark:bg-gray-950/90 backdrop-blur-md flex flex-col animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 shadow-sm flex items-center justify-between">
                  <div><h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><History className="text-blue-600"/> Edit Riwayat Sesi</h2><p className="text-xs text-gray-500 dark:text-gray-400">{editingHistory.groupName} - {tempHistoryMeta.tanggal || editingHistory.date}</p></div>
                  <button onClick={() => { setEditingHistory(null); setTempHistoryDetails([]); setTempHistoryMeta({ tempat: "", materi: "", pemateri: "", fotoKegiatan: null, tanggal: "" }); setHistoryEditSearch(""); }} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"><X size={20} className="text-gray-500 dark:text-gray-400"/></button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-2 flex flex-wrap gap-2 justify-center border-b border-gray-100 dark:border-gray-800">
                  <button onClick={() => handleMarkAllTempPresent(true)} className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold hover:border-green-300 hover:text-green-700 dark:hover:text-green-400 transition flex items-center gap-1.5"><CheckCheck size={14} className="text-green-500"/> Hadirkan Semua</button>
                  <button onClick={handleMarkAllTempBaik} className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold hover:border-blue-300 hover:text-blue-700 dark:hover:text-blue-400 transition flex items-center gap-1.5"><CheckCircle size={14} className="text-blue-500"/> Semua Baik</button>
                  <button onClick={() => handleMarkAllTempPresent(false)} className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold hover:border-red-300 hover:text-red-600 dark:hover:text-red-400 transition flex items-center gap-1.5"><X size={14} className="text-red-400"/> Kosongkan Semua</button>
              </div>
              
              {/* DETAIL SESI (ACCORDION — default tertutup agar fokus ke daftar KPM) */}
              <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shrink-0">
                  <div className="max-w-3xl mx-auto">
                      <button onClick={() => setHistoryMetaOpen(v => !v)} className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-left">
                          <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 shrink-0">Detail Sesi</span>
                              <span className="text-[11px] text-gray-400 truncate">{tempHistoryMeta.tanggal || editingHistory.date}{tempHistoryMeta.tempat ? ` · ${tempHistoryMeta.tempat}` : ''}</span>
                              {!tempHistoryMeta.fotoKegiatan && (
                                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60"><ImageOff size={10}/> Belum ada foto</span>
                              )}
                          </div>
                          <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform duration-300 ${historyMetaOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${historyMetaOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Tanggal</label>
                                  <input type="date" value={tempHistoryMeta.tanggal} onChange={e=>setTempHistoryMeta({...tempHistoryMeta, tanggal: e.target.value})} className="w-full text-sm p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-500 dark:text-white" />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Tempat</label>
                                  <input type="text" value={tempHistoryMeta.tempat} onChange={e=>setTempHistoryMeta({...tempHistoryMeta, tempat: e.target.value})} className="w-full text-sm p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-500 dark:text-white" placeholder="Isi Tempat..." />
                              </div>
                              <div className="sm:col-span-2">
                                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Materi / Sesi</label>
                                  <input type="text" value={tempHistoryMeta.materi} onChange={e=>setTempHistoryMeta({...tempHistoryMeta, materi: e.target.value})} className="w-full text-sm p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-500 dark:text-white" placeholder="Isi Materi..." />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Pemateri</label>
                                  <input type="text" value={tempHistoryMeta.pemateri} onChange={e=>setTempHistoryMeta({...tempHistoryMeta, pemateri: e.target.value})} className="w-full text-sm p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-500 dark:text-white" placeholder="Isi Pemateri..." />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Foto Dokumentasi</label>
                                  {tempHistoryMeta.fotoKegiatan ? (
                                      <div className="flex items-center gap-2">
                                          <div className="w-16 h-11 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0"><img src={tempHistoryMeta.fotoKegiatan} alt="Preview" className="w-full h-full object-cover"/></div>
                                          <label className="flex-1 cursor-pointer text-center text-xs font-bold py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Ganti<input type="file" accept="image/*" className="hidden" onChange={handleHistoryPhotoUpload} /></label>
                                          <button onClick={() => setTempHistoryMeta(prev => ({...prev, fotoKegiatan: null}))} className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 hover:border-red-200 transition" title="Hapus Foto"><X size={14}/></button>
                                      </div>
                                  ) : (
                                      <label className="w-full cursor-pointer flex items-center justify-center gap-2 border-2 border-dashed border-amber-300/70 dark:border-amber-700/60 rounded-xl hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition text-amber-600 dark:text-amber-400 py-2.5 bg-amber-50/30 dark:bg-transparent">
                                          {isCompressing ? <Loader2 className="animate-spin" size={14}/> : <Camera size={14}/>}
                                          <span className="text-xs font-bold leading-none">Unggah Bukti Foto</span>
                                          <input type="file" accept="image/*" className="hidden" onChange={handleHistoryPhotoUpload} />
                                      </label>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="px-4 pt-3 max-w-3xl mx-auto w-full shrink-0">
                  <div className="flex items-center px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus-within:border-blue-500 transition">
                      <Search size={15} className="text-gray-400 mr-2 shrink-0" />
                      <input type="text" value={historyEditSearch} onChange={e=>setHistoryEditSearch(e.target.value)} placeholder="Cari nama KPM..." className="bg-transparent outline-none w-full text-xs font-medium dark:text-white placeholder-gray-400" />
                      {historyEditSearch && <button onClick={()=>setHistoryEditSearch("")} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"><X size={14}/></button>}
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 pt-3 max-w-3xl mx-auto w-full">
                  <div className="space-y-1.5">
                      {tempHistoryDetails.map((kpm, idx) => ({ kpm, idx })).filter(({ kpm }) => (kpm.name || "").toLowerCase().includes(historyEditSearch.toLowerCase())).map(({ kpm, idx }) => (
                          <div key={idx} className={`flex items-center gap-2.5 py-1.5 px-2 rounded-xl border ${kpm.presence ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-900' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}>
                              <button onClick={() => handleTempHistoryChange(idx, 'presence', !kpm.presence)} className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${kpm.presence ? 'bg-green-500 text-white shadow-md shadow-green-500/30' : 'bg-gray-100 dark:bg-gray-700 text-gray-300'}`}>{kpm.presence ? <Check strokeWidth={3} size={16}/> : <span className="text-[10px] font-bold">{idx + 1}</span>}</button>
                              <p className="flex-1 min-w-0 font-bold text-[13px] truncate text-gray-900 dark:text-white">{kpm.name}</p>
                              <div className="shrink-0 w-28">
                                  <select value={kpm.understanding} onChange={(e) => handleTempHistoryChange(idx, 'understanding', e.target.value)} disabled={!kpm.presence} className="w-full text-[11px] p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-40">
                                      {UNDERSTANDING_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                  </select>
                              </div>
                          </div>
                      ))}
                      {historyEditSearch && tempHistoryDetails.filter(d => (d.name || "").toLowerCase().includes(historyEditSearch.toLowerCase())).length === 0 && (
                          <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-10">Tidak ada nama yang cocok dengan &quot;{historyEditSearch}&quot;.</p>
                      )}
                  </div>
              </div>
              <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center sm:justify-between gap-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 order-1 sm:order-none"><span className="font-bold text-green-600">{tempHistoryDetails.filter(d => d.presence).length}</span> Hadir, <span className="font-bold text-red-500">{tempHistoryDetails.length - tempHistoryDetails.filter(d => d.presence).length}</span> Absen</div>
                      <div className="flex gap-3 w-full sm:w-auto">
                          <button onClick={() => { setEditingHistory(null); setTempHistoryDetails([]); setTempHistoryMeta({ tempat: "", materi: "", pemateri: "", fotoKegiatan: null, tanggal: "" }); setHistoryEditSearch(""); }} className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition">Batal</button>
                          <button onClick={saveHistoryEdit} className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"><Save size={18}/> Simpan Perubahan</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showGroupFilter && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 space-y-4">
                <div className="flex justify-between items-center"><h3 className="font-bold text-lg dark:text-white">Pilih Kelompok</h3><button onClick={()=>setShowGroupFilter(false)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full"><X size={18}/></button></div>
                <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-xl flex items-center gap-2"><Search size={18} className="text-gray-400"/><input type="text" autoFocus placeholder="Cari..." value={groupSearchTerm} onChange={e=>setGroupSearchTerm(e.target.value)} className="bg-transparent w-full outline-none text-sm dark:text-white"/></div>
                <div className="max-h-[50vh] overflow-y-auto space-y-1">
                    {dynamicGroups.filter(g=>g.toLowerCase().includes(groupSearchTerm.toLowerCase())).map(g => (
                        <button key={g} onClick={()=>handleGroupSelection(g)} className={`w-full p-4 rounded-xl text-left font-bold text-sm flex justify-between items-center ${((activeTab === 'jurnal' ? selectedGroupJurnal : selectedGroup) === g) ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'}`}>
                            {g} {((activeTab === 'jurnal' ? selectedGroupJurnal : selectedGroup) === g) && <Check size={16}/>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {showBulananMonthModal && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white">Pilih Bulan</h3>
                    <button onClick={()=>setShowBulananMonthModal(false)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full dark:text-white"><X size={18}/></button>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto p-1">
                    {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((mName, idx) => (
                        <button key={mName} onClick={() => { setBulananMonth(idx); setShowBulananMonthModal(false); }} className={`p-3 rounded-xl font-bold text-xs transition border ${bulananMonth === idx ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 'hover:bg-gray-50 border-gray-100 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-300'}`}>
                            {mName}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {showBulananGroupModal && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white">Pilih Kelompok (Bulanan)</h3>
                    <button onClick={()=>setShowBulananGroupModal(false)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full dark:text-white"><X size={18}/></button>
                </div>
                <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-xl flex items-center gap-2">
                    <Search size={18} className="text-gray-400"/>
                    <input type="text" autoFocus placeholder="Cari Kelompok..." value={bulananGroupSearchTerm} onChange={e=>setBulananGroupSearchTerm(e.target.value)} className="bg-transparent w-full outline-none text-sm dark:text-white"/>
                </div>
                <div className="max-h-[50vh] overflow-y-auto space-y-1">
                    {dynamicGroups.filter(g=>g.toLowerCase().includes(bulananGroupSearchTerm.toLowerCase())).map(g => (
                        <button key={g} onClick={() => { setBulananGroup(g); setShowBulananGroupModal(false); }} className={`w-full p-4 rounded-xl text-left font-bold text-sm flex justify-between items-center ${bulananGroup === g ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'}`}>
                            {g} {bulananGroup === g && <Check size={16}/>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {showRekapMonthModal && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white">Pilih Bulan Rekap</h3>
                    <button onClick={()=>setShowRekapMonthModal(false)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full dark:text-white"><X size={18}/></button>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto p-1">
                    {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((mName, idx) => (
                        <button key={mName} onClick={() => { setRekapMonth(idx); setShowRekapMonthModal(false); }} className={`p-3 rounded-xl font-bold text-xs transition border ${rekapMonth === idx ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 'hover:bg-gray-50 border-gray-100 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-300'}`}>
                            {mName}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {rekapPreview && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-200">
                <div className="p-5 pb-4 border-b border-gray-100 dark:border-gray-700 shrink-0 flex items-center gap-3">
                    <div className="w-11 h-11 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0"><FileSpreadsheet size={22}/></div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg dark:text-white leading-tight">Rekap Kecamatan P2K2</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{rekapPreview.bulanLabel} — periksa & koreksi sebelum diunduh</p>
                    </div>
                    <button onClick={() => setRekapPreview(null)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition shrink-0"><X size={18} className="dark:text-gray-300"/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                    {rekapPreview.adaKelompokMultiSesi && (
                        <p className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-lg px-3 py-2">Ada kelompok dengan lebih dari satu sesi bulan ini — dipakai sesi terbaru per kelompok agar KPM tidak terhitung dobel.</p>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            ['Kelompok', `${rekapPreview.kelompokTerrealisasi}/${rekapPreview.totalKelompok}`, 'terrealisasi'],
                            ['Total KPM', rekapPreview.totalKPM, 'dampingan'],
                            ['Hadir', rekapPreview.hadir, `${rekapPreview.tidakHadir} tidak hadir`],
                        ].map(([lbl, val, sub]) => (
                            <div key={lbl} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{lbl}</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{val}</p>
                                <p className="text-[10px] text-gray-400">{sub}</p>
                            </div>
                        ))}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Pengetahuan &amp; Pemahaman</p>
                        <div className="grid grid-cols-4 gap-2">
                            {[['Kurang', rekapPreview.kurang], ['Baik', rekapPreview.baik], ['Sangat Baik', rekapPreview.sangatBaik], ['Tdk Dinilai', rekapPreview.tidakDapatDinilai]].map(([lbl, val]) => (
                                <div key={lbl} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-center">
                                    <p className="text-base font-bold text-gray-900 dark:text-white tabular-nums">{val}</p>
                                    <p className="text-[9px] text-gray-400 leading-tight">{lbl}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Kecamatan</label><input type="text" value={rekapPreview.kecamatan} onChange={e=>handleRekapField('kecamatan', e.target.value)} placeholder="Nama kecamatan..." className="w-full text-xs p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-500 dark:text-white"/></div>
                            <div><label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Kabupaten/Kota</label><input type="text" value={rekapPreview.kabupaten} onChange={e=>handleRekapField('kabupaten', e.target.value)} placeholder="Contoh: Kab. Sleman" className="w-full text-xs p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-500 dark:text-white"/></div>
                        </div>
                        <div><label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Materi <span className="normal-case font-normal">· gabungan semua sesi, boleh diringkas</span></label><textarea value={rekapPreview.materi} onChange={e=>handleRekapField('materi', e.target.value)} rows={2} className="w-full text-xs p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-500 dark:text-white resize-none"/></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Pemateri</label><input type="text" value={rekapPreview.pemateri} onChange={e=>handleRekapField('pemateri', e.target.value)} className="w-full text-xs p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-500 dark:text-white"/></div>
                            <div><label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Alasan Jika Tidak Melaksanakan</label><input type="text" value={rekapPreview.alasan} onChange={e=>handleRekapField('alasan', e.target.value)} placeholder="Kosongkan jika terlaksana" className="w-full text-xs p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-500 dark:text-white"/></div>
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Pendamping: <span className="font-bold">{rekapPreview.pendamping || '-'}</span> · ubah lewat Konfigurasi &gt; Identitas &amp; Kop.</p>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 shrink-0 flex gap-2">
                    <button onClick={handleCopyRekap} className="flex-1 py-3 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-[0.98] transition flex items-center justify-center gap-1.5"><Copy size={14}/> Salin Angka</button>
                    <button onClick={handleDownloadRekap} className="flex-[1.4] py-3 rounded-xl font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition flex items-center justify-center gap-1.5"><Download size={14}/> Unduh Excel</button>
                </div>
            </div>
        </div>
      )}

      {showSemesterModal && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white">Pilih Semester</h3>
                    <button onClick={()=>setShowSemesterModal(false)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full dark:text-white"><X size={18}/></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { val: 1, label: "Semester I (Jan - Jun)" },
                        { val: 2, label: "Semester II (Jul - Des)" }
                    ].map(sem => (
                        <button key={sem.val} onClick={() => { setSelectedSemester(sem.val); setShowSemesterModal(false); }} className={`p-4 rounded-xl font-bold text-sm text-center transition border ${selectedSemester === sem.val ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' : 'hover:bg-gray-50 border-gray-100 dark:border-gray-700 dark:text-gray-300'}`}>
                            {sem.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {showSemesterGroupModal && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white">Pilih Kelompok (Semester)</h3>
                    <button onClick={()=>setShowSemesterGroupModal(false)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full dark:text-white"><X size={18}/></button>
                </div>
                <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-xl flex items-center gap-2">
                    <Search size={18} className="text-gray-400"/>
                    <input type="text" autoFocus placeholder="Cari Kelompok..." value={semesterGroupSearchTerm} onChange={e=>setSemesterGroupSearchTerm(e.target.value)} className="bg-transparent w-full outline-none text-sm dark:text-white"/>
                </div>
                <div className="max-h-[50vh] overflow-y-auto space-y-1">
                    {dynamicGroups.filter(g=>g.toLowerCase().includes(semesterGroupSearchTerm.toLowerCase())).map(g => (
                        <button key={g} onClick={() => { setSemesterGroup(g); setShowSemesterGroupModal(false); }} className={`w-full p-4 rounded-xl text-left font-bold text-sm flex justify-between items-center ${semesterGroup === g ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'}`}>
                            {g} {semesterGroup === g && <Check size={16}/>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {showHistoryGroupFilter && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white">Filter Kelompok (Riwayat)</h3>
                    <button onClick={()=>setShowHistoryGroupFilter(false)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full dark:text-white"><X size={18}/></button>
                </div>
                <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-xl flex items-center gap-2">
                    <Search size={18} className="text-gray-400"/>
                    <input type="text" autoFocus placeholder="Cari Kelompok..." value={historyGroupSearchTerm} onChange={e=>setHistoryGroupSearchTerm(e.target.value)} className="bg-transparent w-full outline-none text-sm dark:text-white"/>
                </div>
                <div className="max-h-[50vh] overflow-y-auto space-y-1">
                    {dynamicGroups.filter(g=>g.toLowerCase().includes(historyGroupSearchTerm.toLowerCase())).map(g => (
                        <button key={g} onClick={() => { setHistoryFilterGroup(g); setShowHistoryGroupFilter(false); }} className={`w-full p-4 rounded-xl text-left font-bold text-sm flex justify-between items-center ${historyFilterGroup === g ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'}`}>
                            {g} {historyFilterGroup === g && <Check size={16}/>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {editModal.isOpen && editModal.data && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
              <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl p-6 overflow-y-auto animate-in slide-in-from-bottom-10 shadow-2xl">
                  <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl dark:text-white">{editModal.isNew ? 'Tambah KPM Baru' : 'Edit Data KPM'}</h3><button onClick={closeEditModal} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full"><X size={20}/></button></div>

                  {/* SCAN KTP/KK (OCR AI) */}
                  <div className="mb-4">
                      <input ref={ktpInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanKtp} />
                      <button
                          onClick={() => ktpInputRef.current?.click()}
                          disabled={isScanning}
                          className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-sm transition border ${isScanning ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-400 border-blue-100 dark:border-blue-900/40 cursor-wait' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98]'}`}
                      >
                          {isScanning ? <><Loader2 size={16} className="animate-spin"/> Membaca dokumen…</> : <><ScanLine size={16}/> Scan KTP / Kartu Keluarga</>}
                      </button>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1.5">AI mengisi nama, NIK, No. KK & alamat otomatis. Periksa kembali sebelum menyimpan.</p>
                  </div>

                  <div className="space-y-4">
                       <div><label className="text-xs font-bold text-gray-400 block mb-1">Nama Lengkap <span className="text-red-500">*</span></label><input type="text" autoFocus={!!editModal.isNew} placeholder="Nama lengkap KPM..." value={editModal.data.name || ""} onChange={e=>handleEditChange('name',e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-bold dark:text-white"/></div>
                      <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-xs font-bold text-gray-400 block mb-1">Kelompok</label><input type="text" value={editModal.data.group || ""} onChange={e=>handleEditChange('group',e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:text-white" placeholder="Nama kelompok..."/></div>
                          <div><label className="text-xs font-bold text-gray-400 block mb-1">Alamat</label><input type="text" value={editModal.data.address || ""} onChange={e=>handleEditChange('address',e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:text-white" placeholder="Alamat..."/></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-xs font-bold text-gray-400 block mb-1">No KK</label><input type="text" value={editModal.data.noKK || ""} onChange={e=>handleEditChange('noKK',e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:text-white"/></div>
                          <div><label className="text-xs font-bold text-gray-400 block mb-1">NIK</label><input type="text" value={editModal.data.nik || ""} onChange={e=>handleEditChange('nik',e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:text-white"/></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-xs font-bold text-gray-400 block mb-1">Desa</label><input type="text" value={editModal.data.desa || ""} onChange={e=>handleEditChange('desa',e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:text-white"/></div>
                          <div><label className="text-xs font-bold text-gray-400 block mb-1">Kecamatan</label><input type="text" value={editModal.data.kecamatan || ""} onChange={e=>handleEditChange('kecamatan',e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:text-white"/></div>
                          <div><label className="text-xs font-bold text-gray-400 block mb-1">Kabupaten/Kota</label><input type="text" value={editModal.data.kabupaten || ""} onChange={e=>handleEditChange('kabupaten',e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:text-white" placeholder="Contoh: Bandung"/></div>
                          <div><label className="text-xs font-bold text-gray-400 block mb-1">Provinsi</label><input type="text" value={editModal.data.provinsi || ""} onChange={e=>handleEditChange('provinsi',e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:text-white" placeholder="Contoh: Jawa Barat"/></div>
                      </div>
                      <div><label className="text-xs font-bold text-gray-400 block mb-1">BPNT</label><select value={editModal.data.bpnt?"ya":"tidak"} onChange={e=>handleEditChange('bpnt',e.target.value==='ya')} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:text-white"><option value="ya">Ya</option><option value="tidak">Tidak</option></select></div>
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                          <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Komponen Bantuan</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                             {Object.keys(COMPONENT_LABELS).map(key=>(
                                 <div key={key} className="flex justify-between items-center">
                                     <span className="text-sm font-medium dark:text-gray-300">{COMPONENT_LABELS[key]}</span>
                                     <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                         <button onClick={()=>handleComponentChange(key,-1)} className="w-6 h-6 flex items-center justify-center dark:text-white"><Minus size={14}/></button>
                                         <span className="text-sm font-bold w-4 text-center dark:text-white">{editModal.data.components[key]||0}</span>
                                         <button onClick={()=>handleComponentChange(key,1)} className="w-6 h-6 flex items-center justify-center dark:text-white"><Plus size={14}/></button>
                                     </div>
                                 </div>
                             ))}
                          </div>
                      </div>
                  </div>
                  <div className="flex gap-3 mt-6"><button onClick={saveEditedKPM} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg">Simpan Perubahan</button></div>
              </div>
          </div>
      )}

      {noteModal.isOpen && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
                  <h3 className="font-bold text-lg mb-1 dark:text-white">Catatan Pendamping</h3><p className="text-xs text-gray-400 mb-4">Untuk KPM: {noteModal.kpmName}</p>
                  <textarea autoFocus value={noteModal.text} onChange={e=>setNoteModal({...noteModal,text:e.target.value})} className="w-full h-32 p-4 rounded-xl bg-yellow-50 dark:bg-gray-900 border border-yellow-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-yellow-400 text-sm mb-4 dark:text-white" placeholder="Tulis catatan perkembangan di sini..."></textarea>
                  <div className="flex gap-3 justify-end"><button onClick={closeNoteModal} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">Batal</button><button onClick={saveNote} className="px-5 py-2.5 rounded-xl font-bold bg-yellow-500 text-white hover:bg-yellow-600 shadow-lg shadow-yellow-500/20 transition">Simpan Catatan</button></div>
              </div>
          </div>
      )}

      {modalNode}
    </div>
  );
}