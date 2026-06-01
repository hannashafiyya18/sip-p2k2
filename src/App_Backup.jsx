/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, PlusCircle, Archive, Search, ArrowLeft, Save, Download, 
  Eye, Edit3, Trash2, Image as ImageIcon, Wand2, ZoomIn, ZoomOut, 
  Loader2, FileType, Home, UserCheck, Sparkles, Moon, Sun, Upload, Settings, 
  HardDriveDownload, AlertTriangle, Mic, MicOff, Cloud, CheckCircle2, WifiOff
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy 
} from 'firebase/firestore';

// --- KUNCI RAHASIA ANDA (SUDAH SAYA PULIHKAN DARI FOTO) ---
const apiKey = "REDACTED_LEAKED_API_KEY"; 

const firebaseConfig = {
  apiKey: "REDACTED_LEAKED_API_KEY",
  authDomain: "smart-skp.firebaseapp.com",
  projectId: "smart-skp",
  storageBucket: "smart-skp.firebasestorage.app",
  messagingSenderId: "618524311198",
  appId: "1:618524311198:web:4258760996b5177fe8458f"
};
// ---------------------------------------------------------

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "laporan-pkh-v1-production";

// --- AI SERVICE ---
const callGeminiAPI = async (prompt) => {
  try {
    // Menggunakan model gemini-1.5-flash (Versi Stabil)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        }),
      }
    );
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Ditolak Google');
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Respon kosong.");
    return JSON.parse(rawText);
  } catch (error) {
    console.error(error);
    alert(`Gagal AI: ${error.message}`);
    return null;
  }
};

// --- UTILITIES ---
const cleanText = (text) => {
    if (!text || typeof text !== 'string') return "";
    let clean = text.replace(/[*#_`•]/g, "").trim(); 
    clean = clean.replace(/\n+/g, " ");
    return clean;
};

// Kompresi Gambar Agresif
const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6)); 
            }
        }
    });
};

const renderParagraph = (text) => {
    const content = cleanText(text);
    if (!content) return null;
    return (
        <p style={{ 
            textIndent: '1.27cm', textAlign: 'justify', marginBottom: '8pt', marginTop: '0',
            lineHeight: '1.5', fontSize: '12pt', fontFamily: 'Arial, sans-serif'
        }}>
            {content}
        </p>
    );
};

const formatDateIndo = (dateString) => {
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

// --- DATA STATIC ---
const RHK_OPTIONS = [
  { id: 1, title: "A. Pelaporan Penyaluran Bansos", fullTitle: "Laporan Pelaksanaan Penyaluran Bantuan Sosial", keyword: "Penyaluran Bansos", isP2K2: false },
  { id: 2, title: "B. Pelaksanaan Pertemuan P2K2", fullTitle: "Laporan Pelaksanaan Pertemuan P2K2", keyword: "P2K2", isP2K2: true },
  { id: 3, title: "C. Data Usulan KPM Graduasi", fullTitle: "Laporan Data Usulan KPM Graduasi", keyword: "Graduasi KPM", isP2K2: false },
  { id: 4, title: "D. Pemutakhiran Data KPM", fullTitle: "Laporan Pelaksanaan Pemutakhiran Data KPM", keyword: "Pemutakhiran Data", isP2K2: false },
  { id: 5, title: "E. Jumlah KPM dimutahirkan", fullTitle: "Laporan Jumlah KPM yang Dimutakhirkan", keyword: "Validasi Data", isP2K2: false },
  { id: 6, title: "F. Laporan Kasus Adaptif", fullTitle: "Laporan Penanganan Kasus Adaptif", keyword: "Kasus Adaptif", isP2K2: false },
  { id: 7, title: "G. Laporan Direktif Pimpinan", fullTitle: "Laporan Pelaksanaan Direktif Pimpinan", keyword: "Direktif Pimpinan", isP2K2: false }
];

const P2K2_MODULES = [
  { name: "Modul Pengasuhan dan Pendidikan", sessions: ["Sesi 1: Menjadi Orangtua Yang Lebih Baik", "Sesi 2: Memahami Perkembangan Dan Perilaku Anak", "Sesi 3: Memahami Cara Anak Usia Dini Belajar", "Sesi 4: Membantu Anak Sukses Di Sekolah"] },
  { name: "Modul Pengelolaan Keuangan dan Perencanaan Usaha", sessions: ["Sesi 1: Mengelola Keuangan Keluarga", "Sesi 2: Cermat Meminjam Dan Menabung", "Sesi 3: Memulai Usaha"] },
  { name: "Modul Kesehatan dan Gizi", sessions: ["Sesi 1: Pentingnya Gizi Dan Layanan Kesehatan Ibu Hamil", "Sesi 2: Pentingnya Gizi Untuk Ibu Menyusui Dan Balita", "Sesi 3: Kesakitan Pada Anak Dan Kesehatan Lingkungan"] },
  { name: "Modul Perlindungan Anak", sessions: ["Sesi 1: Upaya Pencegahan Kekerasan Dan Perilaku Salah Pada Anak", "Sesi 2: Penelantaran Dan Eksploitasi Terhadap Anak"] },
  { name: "Modul Kesejahteraan Sosial", sessions: ["Sesi 1: Pelayanan Bagi Penyandang Disabilitas Berat", "Sesi 2: Pentingnya Kesejahteraan Lanjut Usia"] },
  { name: "Modul Pencegahan dan Penanganan Stunting", sessions: ["Sesi 1: Permasalahan Stunting", "Sesi 2: Permasalahan Sosial", "Sesi 3: Mendukung Ibu Hamil Mengakses Informasi yang Tepat", "Sesi 4: Mendukung Perawatan Sehari-hari Ibu Hamil", "Sesi 5: Mendukung Ibu dan Ayah untuk Memberikan Stimulasi pada Janin", "Sesi 6: Pencegahan & Penanganan Stunting Melalui Pemenuhan Kesejahteraan Bayi Baru Lahir & Ibu Menyusui", "Sesi 7: Mendukung Pemberian Stimulasi pada Bayi Baru Lahir", "Sesi 8: Mendukung Pemberian Stimulasi pada Bayi Usia 6-12 Bulan", "Sesi 9: Mendukung Pemberian Stimulasi pada Anak Usia 1-2 Tahun", "Sesi 10: Mendukung Pemberian Stimulasi pada Anak Usia 2-6 Tahun", "Sesi 11: Pemanfaatan Bantuan Sosial Dalam Pemenuhan Gizi Bagi Anak dan Ibu Hamil", "Sesi 12: Mendukung Praktik Cuci Tangan Pakai Sabun (CTPS)", "Sesi 13: Pemetaan Potensi Diri, Keluarga dan Lingkungan Sekitar", "Sesi 14: Mendukung Keluarga Mengakses Sistem Rujukan untuk Penanganan Anak Stunting", "Sesi 15: Komitmen Melaksanakan Rencana Tindak Lanjut"] }
];

const INITIAL_FORM = {
  id: null, rhkId: '', p2k2Modul: '', p2k2Sesi: '', jumlahPeserta: '',
  tanggalKegiatan: new Date().toISOString().split('T')[0], 
  tanggalLaporan: new Date().toISOString().split('T')[0],
  judulKegiatan: '', lokasi: '', waktu: '', uraian: '',
  namaPegawai: "Muhammad As'adur Rofiq, S.Sos", nipPegawai: "199312112025211054", 
  fullHeaderImage: null, signatureImage: null, images: []
};

// --- COMPONENT: SECTION FORMAL ---
const SectionBlock = ({ number, title, content }) => {
    if (!content) return null;
    return (
        <div style={{ marginBottom: '10px', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '2px' }}>
                <div style={{ width: '25px', fontWeight: 'normal', fontSize: '12pt', textAlign: 'right', marginRight: '10px' }}>{number}.</div>
                <div style={{ flex: 1, fontWeight: 'normal', fontSize: '12pt' }}>{title}</div>
            </div>
            <div style={{ paddingLeft: '35px' }}>{renderParagraph(content)}</div>
        </div>
    );
};

// --- PREVIEW & PDF GENERATOR ---
const PreviewSection = ({ report, onBack, onSave, isViewOnly, isSaving }) => {
    const [zoom, setZoom] = useState(0.6);
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (!window.html2pdf) {
            const s = document.createElement('script');
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
            document.body.appendChild(s);
        }
        if (window.innerWidth < 640) setZoom(0.42);
    }, []);

    const handleExport = (type) => {
        if (!window.html2pdf) { alert("Tunggu sebentar, modul PDF sedang dimuat..."); return; }
        setStatus(type === 'pdf' ? 'Merender PDF...' : 'Merender Word...');
        
        const element = document.getElementById('doc-preview');
        const clone = element.cloneNode(true);
        clone.style.padding = '0px'; clone.style.margin = '0px'; clone.style.boxShadow = 'none'; clone.style.width = '100%'; 
        
        const container = document.createElement('div');
        container.style.position = 'absolute'; container.style.left = '-9999px'; container.style.top = '0px'; container.style.width = '800px'; 
        container.appendChild(clone);
        document.body.appendChild(container);

        if (type === 'pdf') {
            const opt = {
                margin: [25, 25, 25, 25], 
                filename: `Laporan_${report.judulKegiatan.substring(0,10)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            };
            setTimeout(() => {
                window.html2pdf().set(opt).from(clone).save().then(() => { document.body.removeChild(container); setStatus(''); })
                    .catch(e => { console.error(e); setStatus(''); alert("Gagal membuat PDF. Silakan coba lagi."); if(document.body.contains(container)) document.body.removeChild(container); });
            }, 2500);
        } else {
            const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><title>Doc</title></head><body>";
            const footer = "</body></html>";
            const sourceHTML = header + element.innerHTML + footer;
            const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
            const link = document.createElement("a");
            link.href = source; link.download = `Laporan.doc`; link.click();
            document.body.removeChild(container); setStatus('');
        }
    };

    const ai = report.generatedContent || {};

    return (
        <div className="fixed inset-0 bg-slate-800 z-[60] flex flex-col h-full w-full">
            <div className="bg-white px-4 py-3 shadow border-b flex justify-between items-center z-50 shrink-0">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded font-bold text-sm flex items-center gap-2 text-slate-900"><ArrowLeft size={18}/> Kembali</button>
                <div className="flex gap-2 items-center">
                    {status && <span className="text-xs font-bold text-blue-600 animate-pulse mr-2">{status}</span>}
                    {!isViewOnly && (
                        <button onClick={onSave} disabled={isSaving} className="bg-emerald-600 text-white px-3 py-2 rounded text-xs font-bold flex gap-1 disabled:opacity-50">
                            {isSaving ? <Loader2 className="animate-spin" size={16}/> : <><Cloud size={16}/> Simpan ke Cloud</>}
                        </button>
                    )}
                    <button onClick={() => handleExport('pdf')} disabled={!!status} className="bg-red-600 text-white px-3 py-2 rounded text-xs font-bold flex gap-1 disabled:opacity-50"><FileType size={16}/> PDF (Fix)</button>
                    <button onClick={() => handleExport('word')} disabled={!!status} className="bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold flex gap-1 disabled:opacity-50"><Download size={16}/> Word</button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-700 p-4 flex justify-center">
                <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s', marginBottom: '50px' }}>
                    <div id="doc-preview" className="bg-white shadow-xl" style={{ width: '210mm', minHeight: '297mm', padding: '25mm', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', fontSize: '12pt', color: 'black', lineHeight: '1.5' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            {report.fullHeaderImage ? (
                                <img src={report.fullHeaderImage} style={{ width: '100%', height: 'auto', maxHeight: '150px', objectFit: 'contain' }} alt="Kop"/>
                            ) : (
                                <div style={{ borderBottom: '3px double black', paddingBottom: '5px' }}>
                                    <h3 style={{ margin: 0, fontSize: '14pt', fontWeight: 'bold' }}>KEMENTERIAN SOSIAL REPUBLIK INDONESIA</h3>
                                </div>
                            )}
                        </div>
                        <div style={{ textAlign: 'center', marginBottom: '30px', textTransform: 'uppercase' }}>
                            <div style={{ fontSize: '12pt' }}>LAPORAN</div>
                            <div style={{ fontSize: '12pt' }}>TENTANG</div>
                            <div style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: '10px' }}>{report.judulKegiatan}</div>
                        </div>
                        <div style={{ textAlign: 'justify' }}>
                            <div style={{ marginBottom: '10px' }}>
                                <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>A. Pendahuluan</div>
                                <div style={{ paddingLeft: '10px' }}>
                                    <SectionBlock number="1" title="Umum" content={ai.umum} />
                                    <SectionBlock number="2" title="Maksud dan Tujuan" content={ai.maksud_tujuan} />
                                    <SectionBlock number="3" title="Ruang Lingkup" content={ai.ruang_lingkup} />
                                    <SectionBlock number="4" title="Dasar" content={ai.dasar} />
                                </div>
                            </div>
                            <div style={{ marginBottom: '10px', pageBreakInside: 'avoid' }}>
                                <div style={{ display: 'flex', marginBottom: '5px', fontWeight: 'bold' }}><div style={{ width: '25px' }}>B.</div><div>Kegiatan Yang Dilaksanakan</div></div>
                                <div style={{ paddingLeft: '25px' }}>{renderParagraph(ai.kegiatan)}</div>
                            </div>
                            <div style={{ marginBottom: '10px', pageBreakInside: 'avoid' }}>
                                <div style={{ display: 'flex', marginBottom: '5px', fontWeight: 'bold' }}><div style={{ width: '25px' }}>C.</div><div>Hasil Yang Dicapai</div></div>
                                <div style={{ paddingLeft: '25px' }}>{renderParagraph(ai.hasil)}</div>
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>D. Simpulan Dan Saran</div>
                                <div style={{ paddingLeft: '10px' }}>
                                    <SectionBlock number="1" title="Simpulan" content={ai.simpulan} />
                                    <SectionBlock number="2" title="Saran" content={ai.saran} />
                                </div>
                            </div>
                            <div style={{ marginBottom: '10px', pageBreakInside: 'avoid' }}>
                                <div style={{ display: 'flex', marginBottom: '5px', fontWeight: 'bold' }}><div style={{ width: '25px' }}>E.</div><div>Penutup</div></div>
                                <div style={{ paddingLeft: '25px' }}>{renderParagraph(ai.penutup)}</div>
                            </div>
                        </div>
                        <div style={{ marginTop: '40px', pageBreakInside: 'avoid' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <div style={{ width: '45%', textAlign: 'left' }}>
                                    <div>Dibuat di: {report.lokasi || 'Sleman'}</div>
                                    <div>Pada Tanggal: {formatDateIndo(report.tanggalLaporan)}</div>
                                    <div style={{ fontWeight: 'bold', marginTop: '4px' }}>Penata Layanan Operasional</div>
                                    <div style={{ height: '80px', margin: '10px 0', display: 'flex', alignItems: 'center' }}>
                                        {report.signatureImage && <img src={report.signatureImage} style={{ height: '100%', maxWidth: '150px' }} alt="TTD"/>}
                                    </div>
                                    <div style={{ textDecoration: 'underline', fontWeight: 'bold' }}>{report.namaPegawai}</div>
                                    <div>NIP. {report.nipPegawai}</div>
                                </div>
                            </div>
                        </div>
                        {report.images && report.images.length > 0 && (
                            <div style={{ pageBreakBefore: 'always', marginTop: '20px' }}>
                                <div style={{ textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '20px', paddingTop: '10px' }}>LAMPIRAN DOKUMENTASI</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                    {report.images.map((img, i) => (
                                        <div key={i} style={{ pageBreakInside: 'avoid' }}>
                                            <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Foto {i + 1}: Dokumentasi Kegiatan</div>
                                            <div style={{ border: '1px solid #000', padding: '2px', width: '100%', textAlign: 'center' }}>
                                                <img src={img} style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain', display: 'inline-block' }} alt={`Dok ${i+1}`}/>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/90 text-white px-4 py-2 rounded-full flex gap-4 z-50">
                <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}><ZoomOut size={18}/></button>
                <span className="text-sm font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(2.0, z + 0.1))}><ZoomIn size={18}/></button>
            </div>
        </div>
    );
};

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard'); 
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [previewData, setPreviewData] = useState(null);
  
  const [loading, setLoading] = useState(false); // AI Loading
  const [isSaving, setIsSaving] = useState(false); // Cloud Saving Loading
  const [viewOnly, setViewOnly] = useState(false);
  
  // VOICE TYPING STATE
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // DARK MODE STATE
  const [darkMode, setDarkMode] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // --- 1. SETUP AUTH & FIREBASE ---
  useEffect(() => {
    // A. Init Auth
    const initAuth = async () => {
        try {
            await signInAnonymously(auth);
        } catch (err) {
            console.error("Auth Error", err);
        }
    };
    initAuth();

    // B. Listen Auth State
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
    });

    // C. Theme
    const savedTheme = localStorage.getItem('skp_theme');
    if (savedTheme === 'dark') setDarkMode(true);

    return () => unsubscribeAuth();
  }, []);

  // --- 2. SETUP FIRESTORE LISTENER (REALTIME SYNC) ---
  useEffect(() => {
      if (!user) return;

      // Listener ke path: artifacts/{appId}/users/{uid}/laporan
      // Data disimpan per user, jadi aman dan private.
      const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'laporan'));
      
      const unsubscribeData = onSnapshot(q, (snapshot) => {
          const loadedReports = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
          }));
          // Sort client side biar enteng (descending by id/timestamp)
          loadedReports.sort((a,b) => b.id - a.id);
          setReports(loadedReports);
      }, (error) => {
          console.error("Error fetching data:", error);
      });

      // Load Profile (Kop & TTD) jika ada
      const profileDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
      onSnapshot(profileDoc, (docSnap) => {
          if (docSnap.exists()) {
              const p = docSnap.data();
              setForm(prev => ({ ...prev, fullHeaderImage: p.fullHeaderImage, signatureImage: p.signatureImage }));
          }
      }, (err) => console.log("No profile yet", err));

      return () => unsubscribeData();
  }, [user]);

  const toggleDarkMode = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    localStorage.setItem('skp_theme', newVal ? 'dark' : 'light');
  };

  const theme = (lightClass, darkClass) => darkMode ? darkClass : lightClass;

  // --- VOICE TYPING LOGIC ---
  const handleVoiceInput = () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
          alert("Browser Anda tidak mendukung fitur suara.");
          return;
      }
      if (isListening) {
          if (recognitionRef.current) recognitionRef.current.stop();
          setIsListening(false);
      } else {
          const recognition = new SpeechRecognition();
          recognition.lang = 'id-ID'; 
          recognition.interimResults = false;
          recognition.maxAlternatives = 1;
          recognition.onresult = (event) => {
              const transcript = event.results[0][0].transcript;
              setForm(prev => ({ ...prev, uraian: prev.uraian ? `${prev.uraian} ${transcript}` : transcript }));
          };
          recognition.onend = () => setIsListening(false);
          recognition.start();
          recognitionRef.current = recognition;
          setIsListening(true);
      }
  };

  // --- DATABASE LOGIC (FIRESTORE) ---
  const saveReport = async (data) => {
    if (!user) return alert("Belum login ke server.");
    setIsSaving(true);
    try {
        const ts = Date.now().toString(); // Gunakan timestamp sbg ID
        const docId = data.id ? data.id.toString() : ts;
        const newItem = { 
            ...data, 
            id: parseInt(docId), // Simpan sbg number agar kompatibel dgn logic lama
            updatedAt: new Date().toISOString() 
        };

        // 1. Simpan Laporan
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'laporan', docId), newItem);
        
        // 2. Simpan Profile (Kop & TTD) agar dipakai di laporan berikutnya
        if (data.fullHeaderImage || data.signatureImage) {
            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), {
                fullHeaderImage: data.fullHeaderImage,
                signatureImage: data.signatureImage
            });
        }

        alert("Berhasil disimpan ke Cloud!");
        setPreviewData(null);
        setView('history');
    } catch (error) {
        console.error(error);
        alert("Gagal menyimpan: " + error.message);
    } finally {
        setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteId && user) {
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'laporan', deleteId.toString()));
            setDeleteId(null);
        } catch (error) {
            alert("Gagal menghapus: " + error.message);
        }
    }
  };

  // --- AI GENERATION ---
  const handleGenerate = async () => {
      if(!form.rhkId || !form.judulKegiatan) { alert("Pilih Jenis & Judul dulu!"); return; }
      setLoading(true);
      
      const rhk = RHK_OPTIONS.find(r => r.id === parseInt(form.rhkId));
      let extra = "";
      if(rhk.isP2K2) extra = `KONTEKS P2K2: Modul ${form.p2k2Modul}, Sesi ${form.p2k2Sesi}, ${form.jumlahPeserta} Peserta.`;

      const prompt = `
        Buat Laporan Kinerja Pendamping PKH.
        INSTRUKSI OUTPUT (WAJIB DIPATUHI):
        1. Output JSON string saja.
        2. Isi setiap field dengan TEKS PARAGRAF BIASA (Plain Text).
        3. JANGAN gunakan Markdown.
        DATA INPUT:
        Jenis: ${rhk.fullTitle}
        Judul: ${form.judulKegiatan}
        Tanggal: ${formatDateIndo(form.tanggalKegiatan)}
        Lokasi: ${form.lokasi}
        Catatan: "${form.uraian}"
        ${extra}
        OUTPUT JSON KEY:
        { "umum": "...", "maksud_tujuan": "...", "ruang_lingkup": "...", "dasar": "...", "kegiatan": "...", "hasil": "...", "simpulan": "...", "saran": "...", "penutup": "..." }
      `;

      const res = await callGeminiAPI(prompt);
      setLoading(false);
      if(res) {
          const final = { ...form, rhkDetails: rhk, generatedContent: res };
          setPreviewData(final);
          setViewOnly(false);
      }
  };

  const fillDummy = () => {
    const today = new Date().toISOString().split('T')[0];
    setForm(p => ({
        ...p, rhkId: '2', p2k2Modul: 'Modul Pengasuhan dan Pendidikan', p2k2Sesi: 'Sesi 1: Menjadi Orangtua Yang Lebih Baik', jumlahPeserta: '25',
        tanggalKegiatan: today, tanggalLaporan: today, judulKegiatan: 'P2K2 Desa Suka Maju: Menjadi Orang Tua Hebat', lokasi: 'Balai Desa Suka Maju', uraian: 'Pertemuan berjalan lancar, peserta antusias mendiskusikan cara mendidik anak tanpa kekerasan.'
    }));
  };

  const handleImg = async (e) => {
      const f = Array.from(e.target.files);
      if(form.images.length + f.length > 10) return alert("Maksimal 10 Foto.");
      const promises = f.map(file => compressImage(file));
      const compressedImages = await Promise.all(promises);
      setForm(p => ({...p, images: [...p.images, ...compressedImages]}));
  };
  
  const handleSingle = async (e, key) => {
      if(e.target.files[0]) {
          const compressed = await compressImage(e.target.files[0]);
          setForm(p => ({...p, [key]: compressed}));
      }
  };

  if (loading) return <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40}/><p className="mt-2 font-bold">Menyusun Laporan Formal...</p></div>;
  if (previewData) return <PreviewSection report={previewData} onBack={() => setPreviewData(null)} onSave={() => saveReport(previewData)} isViewOnly={viewOnly} isSaving={isSaving} />;

  return (
    <div className={`min-h-screen pb-20 font-sans transition-colors duration-300 ${theme("bg-slate-50 text-slate-900", "bg-slate-900 text-slate-100")}`}>
        
        {/* MODAL KONFIRMASI HAPUS */}
        {deleteId && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl ${theme('bg-white text-slate-900', 'bg-slate-800 text-white')}`}>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={24} /></div>
                        <h3 className="text-lg font-bold mb-2">Hapus dari Cloud?</h3>
                        <p className={`text-sm mb-6 ${theme('text-slate-500', 'text-slate-400')}`}>Data akan hilang permanen dari server.</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setDeleteId(null)} className={`flex-1 py-2.5 rounded-xl font-bold ${theme('bg-slate-100', 'bg-slate-700')}`}>Batal</button>
                            <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold">Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* HEADER DASHBOARD */}
        {view === 'dashboard' && (
            <div className="p-6 max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            Halo, Pendamping! 
                            {user ? <span className="text-emerald-500 bg-emerald-100 p-1 rounded-full"><WifiOff size={0} className="hidden"/><CheckCircle2 size={16}/></span> : <Loader2 className="animate-spin" size={16}/>}
                        </h1>
                        <p className={`text-xs ${theme("text-slate-500", "text-slate-400")}`}>
                           {user ? 'Terhubung ke Cloud Database' : 'Menghubungkan...'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={toggleDarkMode} className={`w-10 h-10 rounded-full flex items-center justify-center ${theme("bg-white text-slate-800 border", "bg-slate-800 text-yellow-400 border border-slate-700")}`}>
                            {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
                        </button>
                        <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">P</div>
                    </div>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-blue-600 text-white p-4 rounded-xl shadow">
                        <div className="text-xs opacity-75">Total Laporan (Cloud)</div>
                        <div className="text-2xl font-bold">{reports.length}</div>
                    </div>
                    <div className={`p-4 rounded-xl shadow border ${theme("bg-white", "bg-slate-800 border-slate-700")}`}>
                        <div className={`text-xs ${theme("text-slate-500", "text-slate-400")}`}>Bulan Ini</div>
                        <div className="text-2xl font-bold text-emerald-500">{reports.filter(r => new Date(r.tanggalKegiatan).getMonth() === new Date().getMonth()).length}</div>
                    </div>
                </div>
                
                <button onClick={() => { setForm(INITIAL_FORM); setView('create'); }} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg mb-6 ${theme("bg-slate-900 text-white", "bg-blue-600 text-white")}`}><PlusCircle size={18}/> Buat Laporan</button>

                <div className={`p-4 rounded-xl border flex items-center gap-3 ${theme("bg-blue-50 border-blue-200 text-blue-800", "bg-blue-900/20 border-blue-800 text-blue-200")}`}>
                    <Cloud size={24}/>
                    <div className="text-xs">
                        <strong>Mode Online Aktif</strong><br/>
                        Data Anda disimpan aman di server Google. Bisa diakses dari perangkat mana saja.
                    </div>
                </div>
            </div>
        )}

        {/* HISTORY */}
        {view === 'history' && (
            <div className="p-4 max-w-3xl mx-auto">
                <h1 className={`text-lg font-bold mb-4 sticky top-0 py-2 z-10 ${theme("bg-slate-50", "bg-slate-900")}`}>Arsip Laporan (Cloud)</h1>
                <div className="space-y-3">
                    {reports.length === 0 && <div className="text-center text-slate-400 py-10">Belum ada data di server.</div>}
                    {reports.map(r => (
                        <div key={r.id} className={`p-4 rounded-xl border shadow-sm ${theme("bg-white border-slate-200", "bg-slate-800 border-slate-700")}`}>
                            <div className="text-xs text-slate-400 mb-1">{formatDateIndo(r.tanggalKegiatan)}</div>
                            <div className="font-bold text-sm mb-2 line-clamp-2">{r.judulKegiatan}</div>
                            <div className={`flex gap-2 pt-2 border-t ${theme("border-slate-100", "border-slate-700")}`}>
                                <button onClick={() => { setPreviewData(r); setViewOnly(true); }} className={`flex-1 py-1 text-xs font-bold rounded ${theme("bg-slate-100 text-slate-700", "bg-slate-700 text-slate-200")}`}>Lihat</button>
                                <button onClick={() => { setForm(r); setView('create'); }} className="flex-1 py-1 bg-blue-500/10 text-blue-500 text-xs font-bold rounded">Edit</button>
                                <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }} className="w-8 bg-red-500/10 text-red-500 rounded flex items-center justify-center"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* CREATE FORM */}
        {view === 'create' && (
            <div className="p-4 max-w-3xl mx-auto pb-32">
                <div className={`flex items-center gap-2 mb-4 sticky top-0 py-3 z-10 ${theme("bg-slate-50", "bg-slate-900")}`}>
                    <button onClick={() => setView('dashboard')} className={`p-1 border rounded ${theme("bg-white border-slate-200", "bg-slate-800 border-slate-700")}`}><ArrowLeft size={18}/></button>
                    <h1 className="font-bold flex-1">{form.id ? 'Edit' : 'Baru'}</h1>
                    <button onClick={fillDummy} className="text-xs bg-amber-500/10 text-amber-600 px-2 py-1 rounded font-bold flex gap-1"><Wand2 size={12}/> Isi Contoh</button>
                </div>

                <div className={`p-5 rounded-xl border shadow-sm space-y-4 ${theme("bg-white border-slate-200", "bg-slate-800 border-slate-700")}`}>
                    {/* ... (Bagian Form Input Sama seperti sebelumnya) ... */}
                    <div>
                        <label className="text-xs font-bold text-slate-500">JENIS LAPORAN</label>
                        <select className={`w-full p-2 border rounded mt-1 text-sm ${theme("bg-slate-50 border-slate-200", "bg-slate-700 border-slate-600 text-white")}`} value={form.rhkId} onChange={e => setForm(p => ({...p, rhkId: e.target.value}))}>
                            <option value="">-- Pilih --</option>
                            {RHK_OPTIONS.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                        </select>
                    </div>

                    {form.rhkId && RHK_OPTIONS.find(r => r.id === parseInt(form.rhkId))?.isP2K2 && (
                        <div className={`p-3 rounded border space-y-2 ${theme("bg-emerald-50 border-emerald-200", "bg-emerald-900/20 border-emerald-800")}`}>
                            <div className="text-xs font-bold text-emerald-600 flex gap-1 items-center"><UserCheck size={12}/> DATA P2K2</div>
                            <select className={`w-full p-2 border rounded text-sm ${theme("bg-white", "bg-slate-700 border-slate-600 text-white")}`} value={form.p2k2Modul} onChange={e => setForm(p => ({...p, p2k2Modul: e.target.value}))}>
                                <option value="">-- Modul --</option>
                                {P2K2_MODULES.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                            </select>
                            <select className={`w-full p-2 border rounded text-sm ${theme("bg-white", "bg-slate-700 border-slate-600 text-white")}`} value={form.p2k2Sesi} onChange={e => setForm(p => ({...p, p2k2Sesi: e.target.value}))} disabled={!form.p2k2Modul}>
                                <option value="">-- Sesi --</option>
                                {form.p2k2Modul && P2K2_MODULES.find(m => m.name === form.p2k2Modul).sessions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input type="number" className={`w-full p-2 border rounded text-sm ${theme("bg-white", "bg-slate-700 border-slate-600 text-white")}`} placeholder="Jumlah Peserta" value={form.jumlahPeserta} onChange={e => setForm(p => ({...p, jumlahPeserta: e.target.value}))}/>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-xs font-bold text-slate-500">Tgl Kegiatan</label><input type="date" className={`w-full p-2 border rounded text-sm ${theme("bg-white border-slate-200", "bg-slate-700 border-slate-600 text-white")}`} value={form.tanggalKegiatan} onChange={e => setForm(p => ({...p, tanggalKegiatan: e.target.value}))}/></div>
                        <div><label className="text-xs font-bold text-slate-500">Tgl Laporan</label><input type="date" className={`w-full p-2 border rounded text-sm ${theme("bg-white border-slate-200", "bg-slate-700 border-slate-600 text-white")}`} value={form.tanggalLaporan} onChange={e => setForm(p => ({...p, tanggalLaporan: e.target.value}))}/></div>
                    </div>

                    <input type="text" className={`w-full p-2 border rounded text-sm ${theme("bg-white border-slate-200", "bg-slate-700 border-slate-600 text-white")}`} placeholder="Judul Kegiatan" value={form.judulKegiatan} onChange={e => setForm(p => ({...p, judulKegiatan: e.target.value}))}/>
                    <input type="text" className={`w-full p-2 border rounded text-sm ${theme("bg-white border-slate-200", "bg-slate-700 border-slate-600 text-white")}`} placeholder="Lokasi" value={form.lokasi} onChange={e => setForm(p => ({...p, lokasi: e.target.value}))}/>
                    
                    {/* Voice Typing Area */}
                    <div className="relative">
                        <textarea 
                            rows={3} 
                            className={`w-full p-2 border rounded text-sm ${theme("bg-white border-slate-200", "bg-slate-700 border-slate-600 text-white")}`} 
                            placeholder="Catatan Lapangan (Ketuk ikon mic untuk mendikte)..." 
                            value={form.uraian} 
                            onChange={e => setForm(p => ({...p, uraian: e.target.value}))}
                        />
                        <button 
                            onClick={handleVoiceInput} 
                            className={`absolute top-2 right-2 p-2 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-red-500/50 shadow-lg' : theme('bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600', 'bg-slate-600 text-slate-300 hover:bg-slate-500')}`}
                        >
                            {isListening ? <MicOff size={16}/> : <Mic size={16}/>}
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div onClick={() => document.getElementById('kop').click()} className={`aspect-square border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer relative overflow-hidden ${theme("bg-slate-50 border-slate-300", "bg-slate-800 border-slate-600")}`}>
                            {form.fullHeaderImage ? <img src={form.fullHeaderImage} className="w-full h-full object-cover"/> : <span className="text-[10px] font-bold">KOP</span>}
                            <input id="kop" type="file" hidden onChange={e => handleSingle(e, 'fullHeaderImage')}/>
                        </div>
                        <div onClick={() => document.getElementById('ttd').click()} className={`aspect-square border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer relative overflow-hidden ${theme("bg-slate-50 border-slate-300", "bg-slate-800 border-slate-600")}`}>
                            {form.signatureImage ? <img src={form.signatureImage} className="w-full h-full object-contain p-1"/> : <span className="text-[10px] font-bold">TTD</span>}
                            <input id="ttd" type="file" hidden onChange={e => handleSingle(e, 'signatureImage')}/>
                        </div>
                        <div onClick={() => document.getElementById('imgs').click()} className={`aspect-square border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer ${theme("bg-blue-50 text-blue-600 border-blue-200", "bg-blue-900/20 text-blue-400 border-blue-800")}`}>
                            <ImageIcon size={20}/>
                            <span className="text-[10px] font-bold text-center mt-1">FOTO<br/>{form.images.length}/10</span>
                            <input id="imgs" type="file" hidden multiple onChange={handleImg}/>
                        </div>
                    </div>
                </div>

                <button onClick={handleGenerate} className={`fixed bottom-0 left-0 w-full border-t p-4 z-20 md:max-w-3xl md:left-1/2 md:-translate-x-1/2 font-bold flex justify-center gap-2 shadow-[0_-5px_10px_rgba(0,0,0,0.05)] ${theme("bg-white text-blue-700", "bg-slate-800 text-blue-400 border-slate-700")}`}>
                    <Sparkles size={18}/> GENERATE AI
                </button>
            </div>
        )}

        {/* BOTTOM NAV */}
        {(!previewData && view !== 'create') && (
            <div className={`fixed bottom-0 left-0 w-full border-t h-16 flex justify-around items-center z-40 md:max-w-3xl md:left-1/2 md:-translate-x-1/2 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] ${theme("bg-white border-slate-200", "bg-slate-800 border-slate-700")}`}>
                <button onClick={() => setView('dashboard')} className={`flex flex-col items-center ${view === 'dashboard' ? 'text-blue-600' : theme('text-slate-400', 'text-slate-500')}`}><Home size={20}/><span className="text-[10px]">Home</span></button>
                <button onClick={() => { setForm(INITIAL_FORM); setView('create'); }} className={`relative -top-5 p-3 rounded-full shadow-lg border-4 ${theme("bg-blue-600 text-white border-slate-50", "bg-blue-500 text-white border-slate-900")}`}><PlusCircle size={24}/></button>
                <button onClick={() => setView('history')} className={`flex flex-col items-center ${view === 'history' ? 'text-blue-600' : theme('text-slate-400', 'text-slate-500')}`}><Archive size={20}/><span className="text-[10px]">Arsip</span></button>
            </div>
        )}
    </div>
  );
}