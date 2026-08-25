import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronRight, Loader2, Eye, Download, FileBadge, Filter, History, Trash2, Archive, FileSpreadsheet, Calculator, CalendarDays, Camera, ImageOff, ClipboardList, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import EmptyState from '../ui/EmptyState';
import { useReveal } from '../../hooks/useReveal';
import { avatarColorFor } from '../../utils/avatar';

export default function HistoryTab({
  isLaporanBulananOpen, setIsLaporanBulananOpen, setShowBulananMonthModal,
  bulananMonth, bulananYear, setBulananYear, setShowBulananGroupModal,
  bulananGroup, generateLaporanBulananPDF, isGeneratingPDF,
  isLaporanSemesterOpen, setIsLaporanSemesterOpen, setShowSemesterModal,
  selectedSemester, semesterYear, setSemesterYear, setShowSemesterGroupModal,
  semesterGroup, generateSemesterPDF, filteredHistory, setShowHistoryGroupFilter,
  historyFilterGroup, historyFilterYear, setHistoryFilterYear,
  historyFilterMonth, setHistoryFilterMonth, textColor, cardColor,
  handleEditHistory, handleDeleteHistory,
  isRekapOpen, setIsRekapOpen, rekapMonth, rekapYear, setRekapYear, setShowRekapMonthModal, handleBuildRekap,
  historyCoverage, handleInputKelompok
}) {
  const listRef = useReveal({ deps: [filteredHistory.length, historyFilterMonth, historyFilterGroup], stagger: 0.045, y: 16 });
  const [showSudah, setShowSudah] = useState(false);
  const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const tanggalPendek = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); };
  // "2026-06-11" -> "11 Jun 2026" (lebih mudah dipindai daripada format ISO)
  const formatTanggal = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 items-start">
            {/* --- LAPORAN BULANAN --- */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                 <button onClick={() => setIsLaporanBulananOpen(!isLaporanBulananOpen)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                     <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
                         <FileText size={18} className="text-orange-600"/> Cetak Laporan Bulanan
                     </div>
                     <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${isLaporanBulananOpen ? 'rotate-180' : ''}`} />
                 </button>
                 
                 <div className={`transition-all duration-300 ease-in-out ${isLaporanBulananOpen ? 'max-h-[500px] opacity-100 p-4 pt-0' : 'max-h-0 opacity-0 overflow-hidden px-4'}`}>
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                         <button onClick={() => setShowBulananMonthModal(true)} className="p-3 rounded-xl border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-xs font-bold dark:text-white outline-none hover:ring-2 hover:ring-blue-500 flex justify-between items-center text-left">
                             <span>{['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][bulananMonth]}</span>
                             <ChevronDown size={14} className="text-gray-400 shrink-0"/>
                         </button>
                         <input type="number" className="p-3 rounded-xl border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={bulananYear} onChange={(e) => setBulananYear(e.target.value)} placeholder="Tahun" />
                         
                         <button onClick={() => setShowBulananGroupModal(true)} className="p-3 rounded-xl border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-xs font-bold dark:text-white outline-none hover:ring-2 hover:ring-blue-500 col-span-2 sm:col-span-2 flex justify-between items-center text-left truncate">
                             <span className="truncate">{bulananGroup}</span>
                             <ChevronDown size={14} className="text-gray-400 shrink-0 ml-2"/>
                         </button>

                         <button onClick={() => generateLaporanBulananPDF('preview')} disabled={isGeneratingPDF} className="col-span-1 sm:col-span-2 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition flex justify-center items-center gap-2 text-xs py-3 dark:bg-blue-900/30 dark:text-blue-400">
                             {isGeneratingPDF ? <Loader2 className="animate-spin" size={14}/> : <Eye size={14}/>} Preview
                         </button>
                         <button onClick={() => generateLaporanBulananPDF('download')} disabled={isGeneratingPDF} className="col-span-1 sm:col-span-2 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-600/30 hover:bg-orange-700 transition flex justify-center items-center gap-2 text-xs py-3">
                             {isGeneratingPDF ? <Loader2 className="animate-spin" size={14}/> : <Download size={14}/>} Unduh
                         </button>
                     </div>
                 </div>
            </div>

            {/* --- LAPORAN SEMESTER --- */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                 <button onClick={() => setIsLaporanSemesterOpen(!isLaporanSemesterOpen)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                     <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
                         <FileBadge size={18} className="text-blue-600"/> Cetak Laporan Semester
                     </div>
                     <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${isLaporanSemesterOpen ? 'rotate-180' : ''}`} />
                 </button>

                 <div className={`transition-all duration-300 ease-in-out ${isLaporanSemesterOpen ? 'max-h-[500px] opacity-100 p-4 pt-0' : 'max-h-0 opacity-0 overflow-hidden px-4'}`}>
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                         <button onClick={() => setShowSemesterModal(true)} className="p-3 rounded-xl border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-xs font-bold dark:text-white outline-none hover:ring-2 hover:ring-blue-500 flex justify-between items-center text-left">
                             <span>{selectedSemester === 1 ? 'Sem 1 (Jan-Jun)' : 'Sem 2 (Jul-Des)'}</span>
                             <ChevronDown size={14} className="text-gray-400 shrink-0"/>
                         </button>
                         <input type="number" className="p-3 rounded-xl border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={semesterYear} onChange={(e) => setSemesterYear(e.target.value)} placeholder="Tahun" />
                         
                         <button onClick={() => setShowSemesterGroupModal(true)} className="p-3 rounded-xl border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-xs font-bold dark:text-white outline-none hover:ring-2 hover:ring-blue-500 col-span-2 sm:col-span-2 flex justify-between items-center text-left truncate">
                             <span className="truncate">{semesterGroup}</span>
                             <ChevronDown size={14} className="text-gray-400 shrink-0 ml-2"/>
                         </button>

                         <button onClick={() => generateSemesterPDF('preview')} disabled={isGeneratingPDF} className="col-span-1 sm:col-span-2 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition flex justify-center items-center gap-2 text-xs py-3 dark:bg-blue-900/30 dark:text-blue-400">
                             {isGeneratingPDF ? <Loader2 className="animate-spin" size={14}/> : <Eye size={14}/>} Preview
                         </button>
                         <button onClick={() => generateSemesterPDF('download')} disabled={isGeneratingPDF} className="col-span-1 sm:col-span-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition flex justify-center items-center gap-2 text-xs py-3">
                             {isGeneratingPDF ? <Loader2 className="animate-spin" size={14}/> : <Download size={14}/>} Unduh
                         </button>
                     </div>
                 </div>
            </div>

            {/* --- REKAP KECAMATAN (EXCEL) --- */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden lg:col-span-2">
                 <button onClick={() => setIsRekapOpen(!isRekapOpen)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                     <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
                         <FileSpreadsheet size={18} className="text-emerald-600"/> Rekap Kecamatan (Excel)
                         <span className="hidden sm:inline text-[10px] font-normal text-gray-400">· baris data Anda untuk sheet rekap koordinator</span>
                     </div>
                     <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${isRekapOpen ? 'rotate-180' : ''}`} />
                 </button>

                 <div className={`transition-all duration-300 ease-in-out ${isRekapOpen ? 'max-h-[500px] opacity-100 p-4 pt-0' : 'max-h-0 opacity-0 overflow-hidden px-4'}`}>
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                         <button onClick={() => setShowRekapMonthModal(true)} className="p-3 rounded-xl border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-xs font-bold dark:text-white outline-none hover:ring-2 hover:ring-emerald-500 flex justify-between items-center text-left">
                             <span>{['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][rekapMonth]}</span>
                             <ChevronDown size={14} className="text-gray-400 shrink-0"/>
                         </button>
                         <input type="number" className="p-3 rounded-xl border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" value={rekapYear} onChange={(e) => setRekapYear(e.target.value)} placeholder="Tahun" />
                         <button onClick={handleBuildRekap} className="col-span-2 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition flex justify-center items-center gap-2 text-xs py-3">
                             <Calculator size={14}/> Hitung &amp; Pratinjau Rekap
                         </button>
                     </div>
                     <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">Dihitung dari sesi yang sudah diarsipkan ke Riwayat. Hasilnya bisa dikoreksi dulu, lalu diunduh sebagai Excel format resmi atau disalin untuk ditempel ke sheet kecamatan.</p>
                 </div>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 sticky top-[74px] z-30 mb-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                 <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm"><Filter size={16} className="text-blue-600"/> Filter Sesi</h3>
                 <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full font-extrabold border border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">{filteredHistory.length} Sesi Ditemukan</span>
            </div>

            <div className="flex gap-2 w-full">
                <button onClick={() => setShowHistoryGroupFilter(true)} className="flex-1 py-2.5 px-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-left flex justify-between items-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 transition truncate">
                    <span className="truncate">{historyFilterGroup}</span>
                    <ChevronDown size={14} className="shrink-0 text-gray-400 ml-2"/>
                </button>
                <div className="w-24 shrink-0 relative">
                    <input type="number" value={historyFilterYear} onChange={(e) => setHistoryFilterYear(e.target.value)} className="w-full py-2.5 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-center" placeholder="Tahun"/>
                </div>
            </div>

            <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1" style={{ scrollbarWidth: 'none' }}>
                <button onClick={() => setHistoryFilterMonth('all')} className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-bold transition-all border ${historyFilterMonth === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}>Semua Bulan</button>
                {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((m, i) => (
                    <button key={i} onClick={() => setHistoryFilterMonth(i)} className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-bold transition-all border ${historyFilterMonth == i ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}>
                        {m}
                    </button>
                ))}
            </div>
        </div>

        {/* --- CAPAIAN INPUT: kelompok mana yang sudah & belum diinput --- */}
        {historyCoverage && historyCoverage.mode === 'bulan' && (() => {
            const { sudah, belum, total, bulan, year, belumWaktunya } = historyCoverage;
            const pct = total ? Math.round((sudah.length / total) * 100) : 0;
            const tuntas = belum.length === 0;
            return (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 mb-4">
                <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"><ClipboardList size={16}/></span>
                    <div className="flex-1 min-w-0 leading-tight">
                        <p className="text-sm font-bold text-gray-800 dark:text-white">Capaian Input P2K2</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{NAMA_BULAN[bulan]} {year} · seluruh kelompok</p>
                    </div>
                    <span className={`text-sm font-extrabold shrink-0 ${tuntas ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{pct}%</span>
                </div>

                <div className="flex items-baseline gap-1.5 mt-3">
                    <b className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight tabular-nums">{sudah.length}</b>
                    <span className="text-xs text-gray-500 dark:text-gray-400">dari {total} kelompok sudah diinput</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 mt-2 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${tuntas ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                </div>

                {tuntas ? (
                    <p className="mt-3 text-[11px] font-bold text-green-700 dark:text-green-400 flex items-center gap-1.5"><CheckCircle size={13}/> Semua kelompok sudah diinput bulan ini.</p>
                ) : (
                    <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-[11px] font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-2">
                            <AlertTriangle size={12}/> Belum diinput ({belum.length})
                            {belumWaktunya && <span className="font-medium text-gray-400 dark:text-gray-500">· bulan ini belum berjalan</span>}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {belum.map(g => (
                                <button key={g} onClick={() => handleInputKelompok(g)} title={`Buka tab Input untuk ${g}`} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 active:scale-[0.97] transition dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900 dark:hover:bg-amber-900/40">
                                    <span className="truncate max-w-[190px]">{g}</span><Plus size={12} className="opacity-60 shrink-0"/>
                                </button>
                            ))}
                        </div>
                        <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">Ketuk kelompok untuk langsung membukanya di tab Input.</p>
                    </div>
                )}

                {sudah.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                        <button onClick={() => setShowSudah(!showSudah)} className="w-full flex items-center gap-1.5 text-[11px] font-extrabold text-green-700 dark:text-green-400">
                            <CheckCircle size={12}/> Sudah diinput ({sudah.length})
                            <ChevronDown size={13} className={`ml-auto text-gray-400 transition-transform ${showSudah ? 'rotate-180' : ''}`}/>
                        </button>
                        {showSudah && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {sudah.map(s => (
                                    <span key={s.group} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900">
                                        <span className="truncate max-w-[190px]">{s.group}</span>
                                        <i className="not-italic font-semibold opacity-60">{tanggalPendek(s.date)}</i>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            );
        })()}

        {historyCoverage && historyCoverage.mode === 'tahun' && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 mb-4">
                <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"><ClipboardList size={16}/></span>
                    <div className="flex-1 min-w-0 leading-tight">
                        <p className="text-sm font-bold text-gray-800 dark:text-white">Capaian Input P2K2</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Ringkasan {historyCoverage.year} · ketuk bulan untuk merinci</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {historyCoverage.perBulan.map(b => {
                        const lengkap = b.jumlah >= historyCoverage.total;
                        const gaya = b.belumWaktunya
                            ? 'bg-gray-50 text-gray-300 border-gray-100 dark:bg-gray-800/40 dark:text-gray-600 dark:border-gray-800'
                            : lengkap ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900'
                            : b.jumlah === 0 ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900'
                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900';
                        return (
                            <button key={b.bulan} onClick={() => setHistoryFilterMonth(b.bulan)} className={`p-2 rounded-xl border text-center transition active:scale-[0.97] ${gaya}`}>
                                <p className="text-[9.5px] font-bold uppercase tracking-wide opacity-70">{NAMA_BULAN[b.bulan].slice(0, 3)}</p>
                                <p className="text-[11px] font-extrabold tabular-nums">{b.belumWaktunya ? '–' : `${b.jumlah}/${historyCoverage.total}`}</p>
                            </button>
                        );
                    })}
                </div>
            </div>
        )}

        {filteredHistory.length === 0 ? (
            <EmptyState
                title="Belum Ada Riwayat"
                description={"Tidak ada sesi pertemuan pada filter ini.\nCoba ganti tahun/bulan/kelompok, atau arsipkan sesi\ndari tab Input (menu Tools > Selesai & Reset)."}
                icons={[Filter, History, Archive]}
            />
        ) : (
        <div ref={listRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHistory.map(h => {
                const pct = h.stats.total ? Math.round((h.stats.present / h.stats.total) * 100) : 0;
                const hasFoto = !!h.fotoKegiatan;
                return (
                <div key={h.id} role="button" tabIndex={0} onClick={() => handleEditHistory(h)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEditHistory(h); } }} className={`group p-5 rounded-2xl ${cardColor} shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900 flex flex-col gap-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>
                    {/* Header: avatar kelompok + nama + tanggal chip */}
                    <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-xl ${avatarColorFor(h.groupName)} flex items-center justify-center shrink-0 shadow-sm`}>
                            <span className="text-sm font-extrabold tracking-tight">{h.groupName.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-base leading-tight truncate ${textColor}`}>{h.groupName}</h3>
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                <CalendarDays size={11} className="shrink-0"/> {formatTanggal(h.date)}
                            </span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteHistory(h.id); }} className="shrink-0 p-2 -mt-1 -mr-1 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition" title="Hapus Riwayat" aria-label="Hapus Riwayat"><Trash2 size={15} /></button>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[2rem]">{h.materi || '—'}</p>

                    <div>
                        <div className="flex items-baseline justify-between mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Kehadiran</span>
                            <span className={`text-sm font-bold tabular-nums ${textColor}`}>{h.stats.present}<span className="text-gray-400 font-medium text-xs">/{h.stats.total}</span>
                                <span className="ml-1.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400">{pct}%</span>
                            </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${pct}%` }}></div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                        {hasFoto ? (
                            <span className="inline-flex items-center gap-2">
                                <img src={h.fotoKegiatan} alt="Foto kegiatan" loading="lazy" className="w-9 h-9 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-700 shrink-0" />
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"><Camera size={11}/> Foto</span>
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60"><ImageOff size={11}/> Belum ada foto</span>
                        )}
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors flex items-center gap-0.5">Ketuk untuk edit <ChevronRight size={13}/></span>
                    </div>
                </div>
                );
            })}
        </div>
        )}
    </div>
  );
}