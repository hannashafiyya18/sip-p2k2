import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  CheckCircle, Loader2, Eye, X, FileText, Plus, RefreshCw, 
  History, CheckCheck, Save, Search, Check, Minus, AlertTriangle,
  Camera, Image as ImageIcon
} from 'lucide-react';

// --- IMPORT FIREBASE ---
import { auth, db, appId } from './config/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from "firebase/auth";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";

// --- IMPORT CONSTANTS, HELPERS, & PDF ---
import { AID_VALUES, COMPONENT_LABELS, PKH_MODULES, INITIAL_DATA, UNDERSTANDING_LEVELS, DEFAULT_CONFIG, STORAGE_KEY_DATA, STORAGE_KEY_CONFIG, STORAGE_KEY_HISTORY, STORAGE_KEY_VIEW_SETTINGS, STORAGE_KEY_LOGO_KIRI, STORAGE_KEY_LOGO_KANAN } from './utils/constants';
import { calculateTotalAid, sanitizeForFirestore, compressImage } from './utils/helpers';
import { exportGraduationLetter, exportSemesterPDF, exportLaporanBulananPDF, exportAbsensiPDF } from './utils/pdfGenerator';

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
  const [editingHistory, setEditingHistory] = useState(null);
  const [tempHistoryDetails, setTempHistoryDetails] = useState([]);
  const [historyFilterYear, setHistoryFilterYear] = useState(new Date().getFullYear());
  const [historyFilterMonth, setHistoryFilterMonth] = useState('all'); 
  const [historyFilterGroup, setHistoryFilterGroup] = useState('Semua Kelompok');
  const [showHistoryGroupFilter, setShowHistoryGroupFilter] = useState(false);
  const [historyGroupSearchTerm, setHistoryGroupSearchTerm] = useState("");
  
  const [tempHistoryMeta, setTempHistoryMeta] = useState({ tempat: "", materi: "", pemateri: "", fotoKegiatan: null });
  
  const [pendingImport, setPendingImport] = useState(null); 
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // REFS
  const mobileLoadMoreRef = useRef(null); 
  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null); 
  
  // MODALS
  const [toast, setToast] = useState({ show: false, message: '' });
  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
  const [noteModal, setNoteModal] = useState({ isOpen: false, kpmId: null, kpmName: '', text: '' });
  const [editModal, setEditModal] = useState({ isOpen: false, data: null });
  // const [isAiLoading, setIsAiLoading] = useState(false);

  // EFFECTS
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); setIsInstallable(true); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').then(() => console.log('SW registered'), (err) => console.log('SW failed', err)); }); }
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return; deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstallable(false); setDeferredPrompt(null);
  };

  useEffect(() => {
    const initAuth = async () => {
        if (!auth) {
            setLoadingAuth(false);
            try {
                const savedData = localStorage.getItem(STORAGE_KEY_DATA); setData(savedData ? (Array.isArray(JSON.parse(savedData)) ? JSON.parse(savedData) : []) : []);
                const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY); setHistory(savedHistory ? (Array.isArray(JSON.parse(savedHistory)) ? JSON.parse(savedHistory) : []) : []);
                const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG); setGroupConfigs(savedConfig ? JSON.parse(savedConfig) : {});
            } catch { setData(INITIAL_DATA); setHistory([]); }
            return;
        }
        if (typeof window !== 'undefined' && typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) { try { await signInWithCustomToken(auth, window.__initial_auth_token); } catch (e) { console.warn("Custom token failed", e); } } 
        else { await signInAnonymously(auth); }
    };
    initAuth();
    if (auth) { const unsubscribe = onAuthStateChanged(auth, async (currentUser) => { setUser(currentUser); setLoadingAuth(false); }); return () => unsubscribe(); }
  }, []);

  useEffect(() => {
    if (user && db) {
        const qData = query(collection(db, `artifacts/${appId}/users/${user.uid}/kpm_data`));
        const unsubData = onSnapshot(qData, (snapshot) => { const items = []; snapshot.forEach(doc => items.push(doc.data())); setData(items.length > 0 ? items.sort((a,b) => a.name.localeCompare(b.name)) : []); });
        const qHist = query(collection(db, `artifacts/${appId}/users/${user.uid}/history`));
        const unsubHist = onSnapshot(qHist, (snapshot) => { const items = []; snapshot.forEach(doc => items.push(doc.data())); setHistory(items.sort((a,b) => b.id - a.id)); });
        return () => { unsubData(); unsubHist(); };
    }
  }, [user]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data)); }, [data]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_VIEW_SETTINGS, JSON.stringify(viewSettings)); if (viewSettings.theme === 'dark') document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); }, [viewSettings]);

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
    if (nextConfig.materi) { const foundModule = Object.keys(PKH_MODULES).find(key => nextConfig.materi.includes(key)); if (foundModule) setSelectedModule(foundModule); else setSelectedModule(""); } 
    else { setSelectedModule(""); }
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
  const showToast = (message) => { setToast({ show: true, message }); setTimeout(() => setToast({ show: false, message: '' }), 3000); };
  const showAlert = (title, message) => setModal({ isOpen: true, type: 'alert', title, message, onConfirm: null });
  const showConfirm = (title, message, onConfirm) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm });
  const closeModal = () => setModal({ ...modal, isOpen: false });
  const openNoteModal = (kpmId, kpmName, currentNote) => setNoteModal({ isOpen: true, kpmId, kpmName, text: currentNote || '' });
  const closeNoteModal = () => setNoteModal({ isOpen: false, kpmId: null, kpmName: '', text: '' });
  const openEditModal = (item) => setEditModal({ isOpen: true, data: { ...item } });
  const closeEditModal = () => setEditModal({ isOpen: false, data: null });

  // DATA ACTIONS
  const updateKpmItem = async (updatedItem) => {
    const cleanItem = sanitizeForFirestore(updatedItem); setData(prev => prev.map(item => item.id === cleanItem.id ? cleanItem : item));
    if (user && db) { await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/kpm_data`, String(cleanItem.id)), cleanItem); }
  };
  const handleStatusChange = (item) => updateKpmItem({ ...item, presence: !item.presence, understanding: !item.presence ? "Baik" : "-" });
  const handleUnderstandingChange = (item, newVal) => updateKpmItem({ ...item, understanding: newVal });
  const saveNote = () => { const item = data.find(i => i.id === noteModal.kpmId); if (item) { updateKpmItem({ ...item, note: noteModal.text }); showToast("Catatan disimpan"); } closeNoteModal(); };
  const deleteNote = (item) => updateKpmItem({ ...item, note: "" });
  const saveEditedKPM = () => { updateKpmItem(editModal.data); closeEditModal(); showToast("Data berhasil diperbarui"); };
  const handleEditChange = (field, value) => setEditModal(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
  const handleComponentChange = (key, delta) => { setEditModal(prev => { const currentVal = prev.data.components[key] || 0; const newVal = Math.max(0, currentVal + delta); return { ...prev, data: { ...prev.data, components: { ...prev.data.components, [key]: newVal } } }; }); };

  const handleMarkAllPresent = () => { 
    if (filteredData.length === 0) return; 
    showConfirm("Konfirmasi Hadir Semua", "Hadirkan semua KPM di list ini?", async () => { 
        const updatedData = data.map(item => { const isInFiltered = filteredData.some(f => f.id === item.id); if (isInFiltered && !item.presence) { return { ...item, presence: true, understanding: "Baik" }; } return item; });
        setData(updatedData);
        if (user && db) {
            const batch = writeBatch(db);
            filteredData.forEach(item => { if (!item.presence) { const newItem = { ...item, presence: true, understanding: "Baik" }; const ref = doc(db, `artifacts/${appId}/users/${user.uid}/kpm_data`, String(item.id)); batch.set(ref, sanitizeForFirestore(newItem)); } });
            await batch.commit();
        }
        closeModal(); showToast("Semua KPM ditandai Hadir");
    }); 
  };

  const handleAddKPM = async () => {
    const newId = Date.now(); const groupToAdd = selectedGroup === "Semua Kelompok" ? (dynamicGroups[1] || "Umum") : selectedGroup;
    const newItem = { id: newId, name: "Nama KPM Baru", nik: "-", noKK: "-", bpnt: false, group: groupToAdd, address: "-", components: {}, presence: false, understanding: "-", note: "", graduationStatus: null, desa: "", kecamatan: "", kabupaten: "", provinsi: "" };
    if (user && db) await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/kpm_data`, String(newId)), sanitizeForFirestore(newItem)); else setData([newItem, ...data]); showToast("Data KPM ditambahkan");
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
          fotoKegiatan: historyItem.fotoKegiatan || null
      });
      setEditingHistory(historyItem);
  };

  const handleTempHistoryChange = (index, field, value) => { const newDetails = [...tempHistoryDetails]; newDetails[index] = { ...newDetails[index], [field]: value }; if (field === 'presence') { if (value === true) newDetails[index].understanding = 'Baik'; else newDetails[index].understanding = '-'; } setTempHistoryDetails(newDetails); };
  const handleMarkAllTempPresent = (status) => { const newDetails = tempHistoryDetails.map(item => ({ ...item, presence: status, understanding: status ? 'Baik' : '-' })); setTempHistoryDetails(newDetails); };

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
      const updatedHistoryItem = { ...editingHistory, ...tempHistoryMeta, details: tempHistoryDetails, stats: { total: totalCount, present: presentCount, absent: absentCount } };
      setHistory(prev => prev.map(h => h.id === editingHistory.id ? updatedHistoryItem : h));
      if (user && db) { try { const histRef = doc(db, `artifacts/${appId}/users/${user.uid}/history`, String(editingHistory.id)); await setDoc(histRef, sanitizeForFirestore(updatedHistoryItem)); showToast("Perubahan Riwayat Disimpan"); } catch (e) { console.error("Update History Error", e); showAlert("Error", "Gagal menyimpan perubahan ke database."); } } else { showToast("Perubahan Riwayat Disimpan (Lokal)"); }
      setEditingHistory(null); setTempHistoryDetails([]); setTempHistoryMeta({ tempat: "", materi: "", pemateri: "", fotoKegiatan: null });
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

  // --- PDF WRAPPERS ---
  const generateGraduationLetter = (kpm) => exportGraduationLetter({ kpm, currentConfig, setIsGeneratingPDF, showAlert, showToast });
  const generateSemesterPDF = (action = 'download') => exportSemesterPDF({ action, history, data, semesterYear, selectedSemester, semesterGroup, groupConfigs, currentConfig, setIsGeneratingPDF, showAlert, setPdfPreviewUrl });
  const generateLaporanBulananPDF = (action = 'download') => exportLaporanBulananPDF({ action, history, bulananYear, bulananMonth, bulananGroup, groupConfigs, currentConfig, setIsGeneratingPDF, showAlert, setPdfPreviewUrl });
  const generateAbsensiPDF = (action = 'download') => exportAbsensiPDF({ action, data, selectedGroup, groupConfigs, currentConfig, setIsGeneratingPDF, showAlert, setPdfPreviewUrl });

  // --- CONFIG & FILES ---
  const handleConfigChange = (field, value) => { const newConfig = { ...currentConfig, [field]: value }; setCurrentConfig(newConfig); const newConfigs = { ...groupConfigs, [selectedGroup]: newConfig }; setGroupConfigs(newConfigs); localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfigs)); };
  const handlePhotoUpload = async (e) => { const file = e.target.files[0]; if (!file) return; setIsCompressing(true); try { const compressed = await compressImage(file); handleConfigChange('fotoKegiatan', compressed); showToast("Foto berhasil dimuat"); } catch { showAlert("Error", "Gagal memproses foto"); } finally { setIsCompressing(false); } };
  const handleLogoKiriUpload = async (e) => { const file = e.target.files[0]; if (!file) return; try { const compressed = await compressImage(file); handleConfigChange('logoKiri', compressed); localStorage.setItem(STORAGE_KEY_LOGO_KIRI, compressed); showToast("Logo Kiri Tersimpan Permanen"); } catch { showAlert("Error", "Gagal upload logo"); } };
  const handleLogoKananUpload = async (e) => { const file = e.target.files[0]; if (!file) return; try { const compressed = await compressImage(file); handleConfigChange('logoKanan', compressed); localStorage.setItem(STORAGE_KEY_LOGO_KANAN, compressed); showToast("Logo Kanan Tersimpan Permanen"); } catch { showAlert("Error", "Gagal upload logo"); } };

  const handleFileUpload = (event) => {
     const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); 
     reader.onload = async (e) => {
         try {
             const lines = e.target.result.split('\n'); const newData = []; let currentId = Date.now();
             for (let i = 1; i < lines.length; i++) {
                 const line = lines[i].trim(); if (!line) continue;
                 const parts = line.includes(';') ? line.split(';') : line.split(','); const clean = parts.map(p => p ? p.replace(/^"|"$/g, '').trim() : "");
                 if (clean.length >= 2) {
                     const components = {}; const parseComp = (idx, key) => { const val = parseInt(clean[idx]); if (!isNaN(val) && val > 0) components[key] = val; };
                     parseComp(11, 'balita'); parseComp(12, 'sd'); parseComp(13, 'smp'); parseComp(14, 'sma'); parseComp(15, 'disabilitas'); parseComp(16, 'lansia'); parseComp(17, 'hamil');
                     newData.push(sanitizeForFirestore({ id: currentId++, name: clean[1] || "No Name", noKK: clean[2] || "-", nik: clean[3] || "-", address: clean[4] || "-", group: clean[21] || "Umum", desa: clean[5] || "-", kecamatan: clean[6] || "-", kabupaten: clean[7] || "-", provinsi: clean[8] || "-", bpnt: clean[22] === 'YA' || clean[13] === '22', components, presence: false, understanding: '-', note: "", graduationStatus: null }));
                 }
             }
             if (newData.length > 0) { if (data.length > 0) { setPendingImport(newData); setImportModalOpen(true); } else { processImport(newData, false); } }
         } catch { showAlert("Error", "Gagal import CSV"); } finally { if(fileInputRef.current) fileInputRef.current.value = ""; }
     }; 
     reader.readAsText(file);
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

  const handleArchiveSession = async () => {
     if(filteredData.length===0) return; 
     showConfirm("Selesai & Reset Sesi?", `Simpan ${filteredData.length} data ke Riwayat, lalu RESET ceklis kehadiran agar kosong untuk bulan depan?`, 
         async () => {
             const present = filteredData.filter(d=>d.presence).length;
             const sessionDetails = filteredData.map(k => ({ name: k.name, group: k.group, presence: k.presence, understanding: k.understanding || "-", nik: k.nik || "-", noKK: k.noKK || "-", address: k.address || "-", components: k.components || {} }));
             const newHist = sanitizeForFirestore({ id: Date.now(), date: currentConfig.tanggal, groupName: selectedGroup, materi: currentConfig.materi, tempat: currentConfig.tempat, pemateri: currentConfig.pemateri, fotoKegiatan: currentConfig.fotoKegiatan, logoKiri: currentConfig.logoKiri, logoKanan: currentConfig.logoKanan, stats: { total: filteredData.length, present, absent: filteredData.length - present }, details: sessionDetails, savedAt: new Date().toLocaleString() });
             const newHistory = [newHist, ...history]; setHistory(newHistory);
             
             if(user && db) { await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/history`, String(newHist.id)), newHist); }

             const resetData = data.map(item => { const isInFiltered = filteredData.some(f => f.id === item.id); return isInFiltered ? { ...item, presence: false, understanding: "-", note: "" } : item; });
             setData(resetData);

             if (user && db) {
                 const batch = writeBatch(db);
                 data.forEach(item => {
                     const isInFiltered = filteredData.some(f => f.id === item.id);
                     if (isInFiltered && (item.presence || item.note)) {
                         const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/kpm_data`, String(item.id));
                         const cleanItem = { ...item, presence: false, understanding: "-", note: "" };
                         batch.set(docRef, sanitizeForFirestore(cleanItem));
                     }
                 });
                 await batch.commit();
             }
             closeModal(); setActiveTab('history'); showToast("Sesi Disimpan & Data Direset");
         }
     );
  };

  const handleLogin = async () => { if (!auth) { showAlert("Error", "Ganti API Key Firebase Anda terlebih dahulu di file config."); return; } try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { showAlert("Login Gagal", e.message); } };
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
              handleDeleteAllData={handleDeleteAllData} showReportConfig={showReportConfig} isConfigOpen={isConfigOpen}
              setIsConfigOpen={setIsConfigOpen} currentConfig={currentConfig} handleConfigChange={handleConfigChange}
              selectedModule={selectedModule} setSelectedModule={setSelectedModule} isCompressing={isCompressing}
              handlePhotoUpload={handlePhotoUpload} handleLogoKiriUpload={handleLogoKiriUpload} handleLogoKananUpload={handleLogoKananUpload}
              generateAbsensiPDF={generateAbsensiPDF} isGeneratingPDF={isGeneratingPDF} paginatedData={paginatedData} cardPadding={cardPadding}
              isCompact={isCompact} cardGap={cardGap} handleStatusChange={handleStatusChange} expandedId={expandedId} setExpandedId={setExpandedId}
              textSizeBase={textSizeBase} textSizeSub={textSizeSub} renderComponentBadges={renderComponentBadges} handleUnderstandingChange={handleUnderstandingChange}
              openNoteModal={openNoteModal} openEditModal={openEditModal} handleProposeGraduation={handleProposeGraduation}
              handleDeleteKPM={handleDeleteKPM} visibleCount={visibleCount} filteredData={filteredData} mobileLoadMoreRef={mobileLoadMoreRef}
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
            />
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <ChatBot stats={stats} dynamicGroups={dynamicGroups} />

      {/* --- LINGERING MODALS & POP-UPS --- */}
      {toast.show && (<div className="fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-gray-900 text-white dark:bg-white dark:text-black rounded-full shadow-2xl flex items-center gap-3 z-[100] animate-in slide-in-from-top-4 fade-in"><CheckCircle size={18} className="text-green-400 dark:text-green-600" /><span className="font-bold text-sm">{toast.message}</span></div>)}

      {pdfPreviewUrl && (
          <div className="fixed inset-0 z-[300] bg-gray-900/90 backdrop-blur-sm flex flex-col animate-in fade-in">
              <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow-md">
                  <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Eye size={18} className="text-blue-600" /> Preview Dokumen Laporan</h3>
                  <button onClick={() => setPdfPreviewUrl(null)} className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 font-bold rounded-lg transition flex items-center gap-2 text-sm"><X size={16}/> Tutup</button>
              </div>
              <div className="flex-1 w-full h-full p-2 sm:p-6"><iframe src={pdfPreviewUrl} className="w-full h-full rounded-xl shadow-2xl bg-white border-0"></iframe></div>
          </div>
      )}

      {importModalOpen && (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 mx-auto"><FileText size={24}/></div>
                  <h3 className="font-bold text-lg mb-2 text-center dark:text-white">Konfirmasi Import</h3>
                  <p className="text-sm text-gray-500 text-center mb-6">Anda sudah memiliki data. Apa yang ingin Anda lakukan dengan data baru?</p>
                  <div className="flex flex-col gap-3">
                      <button onClick={() => processImport(pendingImport, false)} className="p-3 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition text-sm flex items-center justify-center gap-2 border border-blue-200"><Plus size={16}/> Tambahkan (Append)</button>
                      <button onClick={() => processImport(pendingImport, true)} className="p-3 rounded-xl bg-red-50 text-red-700 font-bold hover:bg-red-100 transition text-sm flex items-center justify-center gap-2 border border-red-200"><RefreshCw size={16}/> Ganti Semua (Replace)</button>
                      <button onClick={() => { setImportModalOpen(false); setPendingImport(null); }} className="p-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition text-sm mt-2">Batal</button>
                  </div>
              </div>
          </div>
      )}

      {editingHistory && (
          <div className="fixed inset-0 z-[100] bg-gray-100/90 dark:bg-gray-950/90 backdrop-blur-md flex flex-col animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 shadow-sm flex items-center justify-between">
                  <div><h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><History className="text-blue-600"/> Edit Riwayat Sesi</h2><p className="text-xs text-gray-500 dark:text-gray-400">{editingHistory.groupName} - {editingHistory.date}</p></div>
                  <button onClick={() => { setEditingHistory(null); setTempHistoryDetails([]); setTempHistoryMeta({ tempat: "", materi: "", pemateri: "", fotoKegiatan: null }); }} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"><X size={20} className="text-gray-500 dark:text-gray-400"/></button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-2 flex gap-2 justify-center border-b border-gray-100 dark:border-gray-800">
                  <button onClick={() => handleMarkAllTempPresent(true)} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition flex items-center gap-1"><CheckCheck size={14}/> Hadirkan Semua</button>
                  <button onClick={() => handleMarkAllTempPresent(false)} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition flex items-center gap-1"><X size={14}/> Kosongkan Semua</button>
              </div>
              
              {/* Form Edit Tempat, Materi, Pemateri & Foto (LAYOUT BARU) */}
              <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shrink-0">
                  <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                          <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Tempat</label>
                              <input type="text" value={tempHistoryMeta.tempat} onChange={e=>setTempHistoryMeta({...tempHistoryMeta, tempat: e.target.value})} className="w-full text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-500 dark:text-white" placeholder="Isi Tempat..." />
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Materi / Sesi</label>
                              <input type="text" value={tempHistoryMeta.materi} onChange={e=>setTempHistoryMeta({...tempHistoryMeta, materi: e.target.value})} className="w-full text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-500 dark:text-white" placeholder="Isi Materi..." />
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Pemateri</label>
                              <input type="text" value={tempHistoryMeta.pemateri} onChange={e=>setTempHistoryMeta({...tempHistoryMeta, pemateri: e.target.value})} className="w-full text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-500 dark:text-white" placeholder="Isi Pemateri..." />
                          </div>
                      </div>
                      
                      {/* AREA FOTO KANAN (COMPACT) */}
                      <div className="shrink-0 w-full sm:w-28 flex flex-col">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Foto</label>
                          {tempHistoryMeta.fotoKegiatan ? (
                              <div className="flex-1 w-full min-h-[34px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm group bg-white dark:bg-gray-800 relative">
                                  <img src={tempHistoryMeta.fotoKegiatan} alt="Preview" className="w-full h-full object-cover absolute inset-0"/>
                                  <button onClick={() => setTempHistoryMeta(prev => ({...prev, fotoKegiatan: null}))} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md z-10" title="Hapus Foto"><X size={12}/></button>
                              </div>
                          ) : (
                              <label className="flex-1 w-full cursor-pointer flex items-center justify-center gap-1 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-gray-400 dark:text-gray-500 min-h-[34px] bg-gray-50/50 dark:bg-gray-900/50">
                                  {isCompressing ? <Loader2 className="animate-spin" size={14}/> : <Camera size={14}/>}
                                  <span className="text-[10px] font-bold leading-none">Upload</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={handleHistoryPhotoUpload} />
                              </label>
                          )}
                      </div>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full">
                  <div className="space-y-2">
                      {tempHistoryDetails.map((kpm, idx) => (
                          <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${kpm.presence ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-900 ring-1 ring-green-100 dark:ring-green-900/30' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}>
                              <button onClick={() => handleTempHistoryChange(idx, 'presence', !kpm.presence)} className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${kpm.presence ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-gray-100 dark:bg-gray-700 text-gray-300'}`}>{kpm.presence ? <Check strokeWidth={3} size={20}/> : <span className="text-xs font-bold">{idx + 1}</span>}</button>
                              <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate text-gray-900 dark:text-white">{kpm.name}</p><p className="text-[10px] text-gray-500">{kpm.group}</p></div>
                              <div className="shrink-0 w-32">
                                  <select value={kpm.understanding} onChange={(e) => handleTempHistoryChange(idx, 'understanding', e.target.value)} disabled={!kpm.presence} className="w-full text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50">
                                      {UNDERSTANDING_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                  </select>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                      <div className="hidden sm:block text-xs text-gray-500"><span className="font-bold text-green-600">{tempHistoryDetails.filter(d => d.presence).length}</span> Hadir, <span className="font-bold text-red-500">{tempHistoryDetails.length - tempHistoryDetails.filter(d => d.presence).length}</span> Absen</div>
                      <div className="flex gap-3 w-full sm:w-auto">
                          <button onClick={() => { setEditingHistory(null); setTempHistoryDetails([]); setTempHistoryMeta({ tempat: "", materi: "", pemateri: "", fotoKegiatan: null }); }} className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition">Batal</button>
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
                  <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl dark:text-white">Edit Data KPM</h3><button onClick={closeEditModal} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full"><X size={20}/></button></div>
                  <div className="space-y-4">
                      <div><label className="text-xs font-bold text-gray-400 block mb-1">Nama Lengkap</label><input type="text" value={editModal.data.name} onChange={e=>handleEditChange('name',e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-bold dark:text-white"/></div>
                      <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-xs font-bold text-gray-400 block mb-1">No KK</label><input type="text" value={editModal.data.noKK || ""} onChange={e=>handleEditChange('noKK',e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:text-white"/></div>
                          <div><label className="text-xs font-bold text-gray-400 block mb-1">NIK</label><input type="text" value={editModal.data.nik} onChange={e=>handleEditChange('nik',e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 dark:text-white"/></div>
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

      {modal.isOpen && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 text-center">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32}/></div>
                  <h3 className="font-bold text-lg mb-2 dark:text-white">{modal.title}</h3><p className="text-sm text-gray-500 mb-6">{modal.message}</p>
                  <div className="flex gap-3">
                      <button onClick={closeModal} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-700 text-gray-500">Batal</button>
                      {modal.type === 'confirm' && (<button onClick={() => { modal.onConfirm(); closeModal(); }} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white shadow-lg shadow-red-600/20">Ya, Lanjutkan</button>)}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}