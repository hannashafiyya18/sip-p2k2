import React from 'react';
import { FileText, ChevronDown, Loader2, Eye, Download, FileBadge, Filter, History, Pencil, Trash2, Archive } from 'lucide-react';
import EmptyState from '../ui/EmptyState';
import { useReveal } from '../../hooks/useReveal';

export default function HistoryTab({
  isLaporanBulananOpen, setIsLaporanBulananOpen, setShowBulananMonthModal,
  bulananMonth, bulananYear, setBulananYear, setShowBulananGroupModal,
  bulananGroup, generateLaporanBulananPDF, isGeneratingPDF,
  isLaporanSemesterOpen, setIsLaporanSemesterOpen, setShowSemesterModal,
  selectedSemester, semesterYear, setSemesterYear, setShowSemesterGroupModal,
  semesterGroup, generateSemesterPDF, filteredHistory, setShowHistoryGroupFilter,
  historyFilterGroup, historyFilterYear, setHistoryFilterYear,
  historyFilterMonth, setHistoryFilterMonth, textColor, cardColor,
  handleEditHistory, handleDeleteHistory
}) {
  const listRef = useReveal({ deps: [filteredHistory.length, historyFilterMonth, historyFilterGroup], stagger: 0.045, y: 16 });
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
                return (
                <div key={h.id} role="button" tabIndex={0} onClick={() => handleEditHistory(h)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEditHistory(h); } }} className={`p-5 rounded-2xl ${cardColor} shadow-sm border-l-4 border-l-blue-500 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}>
                    <div>
                        <div className="flex justify-between items-start mb-3 gap-3">
                            <div className="min-w-0"><div className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md inline-block mb-2">{h.date}</div><h3 className={`font-bold text-base ${textColor}`}>{h.groupName}</h3></div>
                            <div className="text-right shrink-0"><div className="flex items-baseline gap-0.5 justify-end"><span className={`text-2xl font-bold ${textColor}`}>{h.stats.present}</span><span className="text-xs text-gray-400">/{h.stats.total}</span></div><span className="text-[10px] text-gray-400 block">Hadir</span></div>
                        </div>
                        <p className="text-xs text-gray-500 border-t border-dashed pt-3 dark:border-gray-700 mb-3 line-clamp-2">{h.materi}</p>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 shrink-0 tabular-nums">{pct}%</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleEditHistory(h); }} className="flex-1 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-800 transition flex items-center justify-center gap-1.5"><Pencil size={14} /> Edit</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteHistory(h.id); }} className="py-2 px-3 bg-red-50 text-red-600 dark:bg-red-900 dark:text-red-200 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-800 transition flex items-center justify-center" title="Hapus Riwayat" aria-label="Hapus Riwayat"><Trash2 size={14} /></button>
                        </div>
                    </div>
                </div>
                );
            })}
        </div>
        )}
    </div>
  );
}