import React from 'react';
import { 
  CheckCircle, XCircle, Wallet, Banknote, PieChart, Activity, Search,
  ChevronDown, Grid, Plus, CheckSquare, Archive, Trash2, Settings,
  Camera, Upload, Loader2, Eye, Download, Check, StickyNote, Edit2,
  CheckCheck, GraduationCap, Users, X,
  Calendar, MapPin, BookOpen, User, Image as ImageIcon, ScanLine, Sparkles
} from 'lucide-react';
import { PKH_MODULES, UNDERSTANDING_LEVELS } from '../../utils/constants';
import { formatRupiah, calculateTotalAid } from '../../utils/helpers';
import EmptyState from '../ui/EmptyState';
import CountUp from '../ui/CountUp';
import { useReveal } from '../../hooks/useReveal';

export default function InputTab({
  scrollContainerRef, handleScroll, cardColor, subText, stats, currentSlide,
  searchTerm, setSearchTerm, setShowGroupFilter, selectedGroup, textColor,
  showToolsMenu, setShowToolsMenu, handleAddKPM, handleMarkAllPresent,
  handleArchiveSession, handleDeleteAllData, handleBackupData, handleRestoreFile,
  showReportConfig, isConfigOpen,
  setIsConfigOpen, currentConfig, handleConfigChange, handlePendampingChange, selectedModule,
  setSelectedModule, isCompressing, handlePhotoUpload, handleLogoKiriUpload,
  handleLogoKananUpload, generateAbsensiPDF, isGeneratingPDF, paginatedData,
  cardPadding, isCompact, cardGap, handleStatusChange, expandedId, setExpandedId,
  textSizeBase, textSizeSub, renderComponentBadges, handleUnderstandingChange,
  openNoteModal, openEditModal, handleProposeGraduation, handleDeleteKPM,
  visibleCount, filteredData, mobileLoadMoreRef,
  handleScanAbsen, isScanningAbsen, autoAssess, setAutoAssess
}) {
  const listRef = useReveal({ deps: [selectedGroup], stagger: 0.04, y: 14, max: 12 });
  const [identityOpen, setIdentityOpen] = React.useState(false);
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      
      {/* KARTU STATISTIK ATAS */}
      <div className="relative group">
          <div ref={scrollContainerRef} onScroll={handleScroll} className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
              <div className="min-w-full md:min-w-[calc(33.33%-10px)] snap-center">
                  <div className="grid grid-cols-2 gap-4 h-full">
                       <div className={`p-5 rounded-2xl ${cardColor} shadow-sm relative overflow-hidden group h-32 flex flex-col justify-between`}>
                          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><CheckCircle size={80} /></div>
                          <p className={`text-xs font-bold uppercase tracking-wider ${subText}`}>Kehadiran</p>
                          <div>
                              <div className="flex items-end gap-2 mt-1"><CountUp value={stats.present} className="text-3xl font-bold text-green-600 tabular-nums" /><span className="text-xs text-gray-400 mb-1.5">/ {stats.total}</span></div>
                              <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden"><div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.total ? (stats.present/stats.total)*100 : 0}%` }}></div></div>
                          </div>
                       </div>
                       <div className={`p-5 rounded-2xl ${cardColor} shadow-sm relative overflow-hidden group h-32 flex flex-col justify-between`}>
                          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><XCircle size={80} /></div>
                          <p className={`text-xs font-bold uppercase tracking-wider ${subText}`}>Absen</p>
                          <div className="flex items-end gap-2 mt-1"><CountUp value={stats.absent} className="text-3xl font-bold text-red-500 tabular-nums" /><span className="text-xs text-gray-400 mb-1.5">Orang</span></div>
                       </div>
                  </div>
              </div>
              <div className="min-w-full md:min-w-[calc(33.33%-10px)] snap-center">
                  <div className={`w-full h-32 p-5 rounded-2xl ${cardColor} shadow-sm relative overflow-hidden bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border-yellow-100 dark:border-yellow-900/30 flex flex-col justify-center`}>
                      <div className="absolute right-0 top-0 p-4 opacity-10 text-yellow-600 dark:text-yellow-500"><Wallet size={100} /></div>
                      <div className="relative z-10">
                          <p className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-500 flex items-center gap-2"><Banknote size={14}/> Total Estimasi Dana</p>
                          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1 tracking-tight tabular-nums"><CountUp value={stats.totalAid} format={formatRupiah} duration={0.9} /></h2>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">*Estimasi untuk {stats.total} KPM{stats.total > 0 && <> &bull; rata-rata <span className="font-bold">{formatRupiah(Math.round(stats.totalAid / stats.total))}</span>/KPM</>}</p>
                      </div>
                  </div>
              </div>
              <div className="min-w-full md:min-w-[calc(33.33%-10px)] snap-center">
                  <div className={`w-full h-32 p-4 rounded-2xl ${cardColor} shadow-sm relative overflow-hidden flex flex-col`}>
                        <div className="absolute right-0 top-0 p-4 opacity-5"><PieChart size={80} /></div>
                        <div className="flex items-center justify-between mb-2">
                            <p className={`text-xs font-bold uppercase tracking-wider ${subText} flex items-center gap-2`}><Activity size={14}/> Statistik Komponen</p>
                            <span className="text-xs font-extrabold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-200">Total: <CountUp value={stats.totalComponents} className="tabular-nums" /></span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg text-center border border-gray-100 dark:border-gray-700"><CountUp value={stats.componentsCount.sd} className="block text-lg font-bold text-blue-600 dark:text-blue-400 leading-none tabular-nums" /><span className="text-[9px] text-gray-500">SD</span></div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg text-center border border-gray-100 dark:border-gray-700"><CountUp value={stats.componentsCount.smp} className="block text-lg font-bold text-indigo-600 dark:text-indigo-400 leading-none tabular-nums" /><span className="text-[9px] text-gray-500">SMP</span></div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg text-center border border-gray-100 dark:border-gray-700"><CountUp value={stats.componentsCount.sma} className="block text-lg font-bold text-violet-600 dark:text-violet-400 leading-none tabular-nums" /><span className="text-[9px] text-gray-500">SMA</span></div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg text-center border border-gray-100 dark:border-gray-700"><CountUp value={stats.componentsCount.lansia} className="block text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-none tabular-nums" /><span className="text-[9px] text-gray-500">Lansia</span></div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg text-center border border-gray-100 dark:border-gray-700"><CountUp value={stats.componentsCount.balita} className="block text-lg font-bold text-rose-600 dark:text-rose-400 leading-none tabular-nums" /><span className="text-[9px] text-gray-500">Balita</span></div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg text-center border border-gray-100 dark:border-gray-700"><CountUp value={stats.componentsCount.hamil} className="block text-lg font-bold text-pink-600 dark:text-pink-400 leading-none tabular-nums" /><span className="text-[9px] text-gray-500">Bumil</span></div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg text-center border border-gray-100 dark:border-gray-700 col-span-2 flex items-center justify-between px-3"><span className="text-[9px] text-gray-500">Disabilitas</span><CountUp value={stats.componentsCount.disabilitas} className="block text-lg font-bold text-purple-600 dark:text-purple-400 leading-none tabular-nums" /></div>
                        </div>
                  </div>
              </div>
          </div>
          <div className="md:hidden flex justify-center gap-1.5 mt-0 absolute -bottom-3 left-0 right-0">
              {[0, 1, 2].map((idx) => (<div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-4 bg-blue-600' : 'w-1.5 bg-gray-300 dark:bg-gray-700'}`} />))}
          </div>
      </div>

      <div className={`flex flex-col md:flex-row gap-3 sticky top-[70px] pt-2 ${showToolsMenu ? 'z-[70]' : 'z-30'}`}>
         <div className={`w-full md:flex-1 flex flex-col gap-2`}>
            <div className={`flex items-center px-4 py-3 rounded-xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20 ${cardColor}`}>
                <Search className="text-gray-400 mr-3" size={18} />
                <input type="text" placeholder="Cari nama KPM atau NIK..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none w-full text-sm font-medium dark:text-white placeholder-gray-400" />
            </div>

         </div>

         <div className="flex gap-3 w-full md:w-auto">
             <button onClick={() => setShowGroupFilter(true)} className={`flex-1 md:flex-none px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between gap-3 min-w-[140px] shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition ${cardColor} ${textColor}`}>
                <span className="truncate max-w-[120px]">{selectedGroup}</span><ChevronDown size={16} className="text-gray-400" />
             </button>
             <button
                onClick={handleArchiveSession}
                disabled={stats.total === 0}
                aria-label="Selesai & Reset sesi — arsipkan kehadiran ke Riwayat lalu kosongkan ceklis"
                title="Selesai & Reset — arsipkan sesi ke Riwayat"
                className="shrink-0 flex items-center justify-center gap-2 px-3.5 sm:px-4 py-3 rounded-xl font-bold text-sm text-white bg-orange-500 hover:bg-orange-600 active:scale-95 shadow-lg shadow-orange-500/30 transition disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none">
                <Archive size={20} />
                <span className="hidden sm:inline">Selesai</span>
             </button>
             <div className="relative">
                 <button onClick={() => setShowToolsMenu(!showToolsMenu)} className={`p-3 rounded-xl transition active:scale-95 shadow-lg ${showToolsMenu ? 'bg-blue-700 text-white shadow-blue-600/30' : 'bg-blue-600 text-white shadow-blue-500/30'} hover:bg-blue-700`}>{showToolsMenu ? <X size={20} /> : <Grid size={20} />}</button>
                  {showToolsMenu && (
                      <>
                          <div className="fixed inset-0 z-[1] bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => setShowToolsMenu(false)}></div>
                          <div className="fixed left-3 right-3 bottom-6 sm:bottom-auto sm:left-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-[2] p-2 animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:slide-in-from-top-2 duration-200 origin-top-right max-h-[70vh] overflow-y-auto custom-scrollbar pb-safe">
                              <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Sesi Pertemuan</p>
                              <button onClick={() => { handleAddKPM(); setShowToolsMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/60 active:scale-[0.98] transition text-left">
                                  <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"><Plus size={18} /></div>
                                  <div className="min-w-0"><p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">Tambah KPM</p><p className="text-[11px] text-gray-400 dark:text-gray-500">Buat data KPM baru</p></div>
                              </button>
                              <button onClick={() => { handleMarkAllPresent(); setShowToolsMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/60 active:scale-[0.98] transition text-left">
                                  <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"><CheckSquare size={18} /></div>
                                  <div className="min-w-0"><p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">Hadir Semua</p><p className="text-[11px] text-gray-400 dark:text-gray-500">Tandai semua KPM hadir</p></div>
                              </button>
                              <div className="w-full flex items-center gap-1">
                                  <label className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left min-w-0 ${isScanningAbsen ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50 dark:hover:bg-gray-700/60 active:scale-[0.98] cursor-pointer'}`}>
                                      <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">{isScanningAbsen ? <Loader2 size={18} className="animate-spin"/> : <ScanLine size={18} />}</div>
                                      <div className="min-w-0"><p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">Scan Absen (Foto)</p><p className="text-[11px] text-gray-400 dark:text-gray-500">Galeri — foto lembar TTD, bisa 2 halaman</p></div>
                                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { setShowToolsMenu(false); handleScanAbsen(e); }} />
                                  </label>
                                  <label className={`shrink-0 w-10 h-10 mr-2 rounded-xl flex items-center justify-center transition ${isScanningAbsen ? 'opacity-50 pointer-events-none bg-gray-100 dark:bg-gray-700' : 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 active:scale-95 cursor-pointer'}`} title="Ambil langsung dari kamera">
                                      <Camera size={17} />
                                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { setShowToolsMenu(false); handleScanAbsen(e); }} />
                                  </label>
                              </div>
                              <p className="px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700 mt-2">Data</p>
                              <button onClick={() => { handleBackupData(); setShowToolsMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/60 active:scale-[0.98] transition text-left">
                                  <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"><Download size={18} /></div>
                                  <div className="min-w-0"><p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">Backup Data</p><p className="text-[11px] text-gray-400 dark:text-gray-500">Unduh cadangan (JSON)</p></div>
                              </button>
                              <label className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/60 active:scale-[0.98] transition text-left cursor-pointer">
                                  <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"><Upload size={18} /></div>
                                  <div className="min-w-0"><p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">Pulihkan Data</p><p className="text-[11px] text-gray-400 dark:text-gray-500">Impor file backup</p></div>
                                  <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => { handleRestoreFile(e); setShowToolsMenu(false); }} />
                              </label>
                              <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
                                  <button onClick={() => { handleDeleteAllData(); setShowToolsMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-[0.98] transition text-left">
                                      <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"><Trash2 size={18} /></div>
                                      <div className="min-w-0"><p className="text-sm font-bold text-red-600 dark:text-red-400 leading-tight">Hapus Semua Data</p><p className="text-[11px] text-red-400/70 dark:text-red-500/60">Tidak bisa dibatalkan</p></div>
                                  </button>
                              </div>
                          </div>
                      </>
                  )}
             </div>
         </div>
      </div>

      {/* KONFIGURASI LAPORAN (ACCORDION) */}
      {showReportConfig && (
          <div className={`rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm animate-in fade-in overflow-hidden transition-all duration-300 mb-4`}>
              <button onClick={() => setIsConfigOpen(!isConfigOpen)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition text-gray-800 dark:text-gray-100 font-bold border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 shrink-0"><Settings size={16} /></span> <span>Konfigurasi Laporan &amp; Absensi</span></div><ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${isConfigOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isConfigOpen ? 'max-h-[1600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-5 pt-4 space-y-5">

                      {/* ===== DATA SESI ===== */}
                      <div className="space-y-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Data Sesi</p>
                          <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400"><Calendar size={13} className="text-orange-500"/> Tanggal Pelaksanaan</label>
                                      <button type="button" onClick={() => handleConfigChange('tanggal', new Date().toISOString().split('T')[0])} className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline transition">Hari ini</button>
                                  </div>
                                  <input type="date" value={currentConfig.tanggal} onChange={e=>handleConfigChange('tanggal', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none transition focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400"><MapPin size={13} className="text-orange-500"/> Tempat</label>
                                  <input type="text" value={currentConfig.tempat} onChange={e=>handleConfigChange('tempat', e.target.value)} placeholder="Rumah Ketua Kelompok..." className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none transition focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 dark:bg-gray-800 dark:border-gray-700 dark:text-white placeholder-gray-400" />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400"><BookOpen size={13} className="text-orange-500"/> Materi / Sesi</label>
                                  <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none transition focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 dark:bg-gray-800 dark:border-gray-700 dark:text-white" onChange={e => { setSelectedModule(e.target.value); if(e.target.value !== selectedModule) handleConfigChange('materi', ''); }} value={selectedModule}>
                                     <option value="">Pilih Modul...</option>{Object.keys(PKH_MODULES).map(m => <option key={m} value={m}>{m}</option>)}
                                  </select>
                                  {selectedModule && (
                                     <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none transition focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 dark:bg-gray-800 dark:border-gray-700 dark:text-white" value={currentConfig.materi ? currentConfig.materi.split(`Modul ${selectedModule} - `)[1] || "" : ""} onChange={e => handleConfigChange('materi', e.target.value ? `Modul ${selectedModule} - ${e.target.value}` : '')}>
                                        <option value="">Pilih Sesi...</option>{PKH_MODULES[selectedModule].map(s => <option key={s} value={s}>{s}</option>)}
                                     </select>
                                  )}
                              </div>
                              <div className="space-y-1.5">
                                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400"><Camera size={13} className="text-orange-500"/> Foto Kegiatan</label>
                                  <div className="flex items-center gap-2">
                                      <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-orange-400 hover:bg-orange-50/40 dark:hover:bg-gray-800 transition">
                                          {isCompressing ? <Loader2 className="animate-spin text-gray-400" size={16}/> : <Camera size={16} className="text-gray-400"/>}<span className="text-xs font-medium text-gray-500 dark:text-gray-400">{currentConfig.fotoKegiatan ? 'Ganti Foto' : 'Upload Foto'}</span><input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                      </label>
                                      {currentConfig.fotoKegiatan && <div className="w-11 h-11 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0"><img src={currentConfig.fotoKegiatan} alt="Preview" className="w-full h-full object-cover"/></div>}
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* ===== IDENTITAS & KOP (atur sekali) ===== */}
                      <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                          <button type="button" onClick={() => setIdentityOpen(v => !v)} className="w-full flex items-center justify-between px-3.5 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400"><User size={13} className="text-orange-500"/> Identitas &amp; Kop <span className="normal-case font-normal tracking-normal text-gray-400">· atur sekali</span></span>
                              <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${identityOpen ? 'rotate-180' : ''}`} />
                          </button>
                          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${identityOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                              <div className="p-3.5 space-y-4 border-t border-gray-100 dark:border-gray-800">
                                  <div className="space-y-1.5">
                                      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400"><User size={13} className="text-orange-500"/> Nama Pendamping <span className="font-normal text-gray-400">· berlaku semua kelompok</span></label>
                                      <input type="text" value={currentConfig.pendamping || ""} onChange={e=>handlePendampingChange(e.target.value)} placeholder="Nama pendamping..." className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none transition focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 dark:bg-gray-800 dark:border-gray-700 dark:text-white placeholder-gray-400" />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1.5">
                                          <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400"><ImageIcon size={13} className="text-orange-500"/> Logo Kiri <span className="font-normal text-gray-400">(Kemensos)</span></label>
                                          <div className="flex items-center gap-2">
                                              <div className="flex-1 h-11 px-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">{currentConfig.logoKiri ? <img src={currentConfig.logoKiri} className="h-7 object-contain"/> : <span className="text-[10px] text-gray-400">Kosong</span>}</div>
                                              <label className="h-11 w-11 shrink-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition text-gray-500 dark:text-gray-300"><Upload size={16}/><input type="file" accept="image/*" className="hidden" onChange={handleLogoKiriUpload} /></label>
                                          </div>
                                      </div>
                                      <div className="space-y-1.5">
                                          <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400"><ImageIcon size={13} className="text-orange-500"/> Logo Kanan <span className="font-normal text-gray-400">(PKH/Siger)</span></label>
                                          <div className="flex items-center gap-2">
                                              <div className="flex-1 h-11 px-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">{currentConfig.logoKanan ? <img src={currentConfig.logoKanan} className="h-7 object-contain"/> : <span className="text-[10px] text-gray-400">Kosong</span>}</div>
                                              <label className="h-11 w-11 shrink-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition text-gray-500 dark:text-gray-300"><Upload size={16}/><input type="file" accept="image/*" className="hidden" onChange={handleLogoKananUpload} /></label>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      {/* ===== PENILAIAN OTOMATIS (aturan transparan, bisa dimatikan) ===== */}
                      <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                          <input type="checkbox" checked={autoAssess} onChange={e => setAutoAssess(e.target.checked)} className="mt-0.5 w-4 h-4 shrink-0 accent-orange-500 cursor-pointer" />
                          <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5"><Sparkles size={13} className="text-orange-500"/> Terapkan penilaian otomatis</p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">Saat kehadiran diisi massal (scan foto / hadir semua): hadir = <b>Baik</b>, komponen lansia tunggal = <b>Kurang</b>, absen = <b>Tidak Dapat Dinilai</b>. Penilaian yang sudah Anda koreksi manual tidak akan ditimpa.</p>
                          </div>
                      </label>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                           <button onClick={() => generateAbsensiPDF('preview')} disabled={isGeneratingPDF} className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition flex justify-center gap-2 items-center text-xs dark:bg-blue-900/30 dark:text-blue-400">
                               {isGeneratingPDF ? <Loader2 className="animate-spin"/> : <Eye size={16}/>} Preview Absensi
                           </button>
                           <button onClick={() => generateAbsensiPDF('download')} disabled={isGeneratingPDF} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition flex justify-center gap-2 items-center text-xs">
                               {isGeneratingPDF ? <Loader2 className="animate-spin"/> : <Download size={16}/>} Unduh Absensi
                           </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* LIST DATA KPM */}
      <div ref={listRef} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {paginatedData.map(item => (
             <div key={item.id} className={`group relative rounded-2xl ${cardPadding} transition-all duration-300 border hover:-translate-y-0.5 ${item.presence ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-900 ring-1 ring-green-100 dark:ring-green-900/30 hover:shadow-lg hover:shadow-green-500/10' : `${cardColor} hover:shadow-lg`}`}>
                <div className={`flex items-start ${cardGap}`}>
                   <button onClick={(e) => { e.stopPropagation(); handleStatusChange(item); }} className={`shrink-0 ${isCompact ? 'w-8 h-8 rounded-lg' : 'w-12 h-12 rounded-xl'} flex items-center justify-center transition-all duration-300 ${item.presence ? 'bg-green-500 text-white shadow-lg shadow-green-500/40 rotate-0' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 rotate-0'}`}>
                       {item.presence ? <Check strokeWidth={3} size={isCompact ? 16 : 20} /> : <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-bold`}>{item.name.charAt(0)}</span>}
                   </button>
                   <div className="flex-1 min-w-0 pt-0.5 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                       <div className="flex justify-between items-start">
                          <h3 className={`font-bold ${textSizeBase} truncate ${textColor}`}>{item.name}</h3>
                          <div className="flex items-center gap-2">

                             {item.note && <StickyNote size={14} className="text-yellow-500 fill-yellow-500" />}
                          </div>
                       </div>
                       <p className={`${textSizeSub} ${subText} flex items-center gap-1`}>{item.address} {item.bpnt && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded font-bold">BPNT</span>}</p>
                       <div className="flex flex-wrap gap-1 mt-2">
                           {renderComponentBadges(item.components, isCompact)}
                           {calculateTotalAid(item.components) > 0 && <span className={`${isCompact ? 'text-[9px] px-1.5' : 'text-[10px] px-2 py-0.5'} rounded-full bg-gray-100 dark:bg-gray-700 font-bold dark:text-gray-300`}>{formatRupiah(calculateTotalAid(item.components))}</span>}
                       </div>
                   </div>
                   <button onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === item.id ? null : item.id); }} className="p-2 text-gray-300 hover:text-gray-500 transition">
                       <ChevronDown size={20} className={`transition-transform duration-300 ${expandedId === item.id ? 'rotate-180' : ''}`} />
                   </button>
                </div>

                {expandedId === item.id && (
                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="space-y-1">
                                 <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pemahaman</label>
                                 <select disabled={!item.presence} value={item.understanding} onChange={e=>handleUnderstandingChange(item, e.target.value)} className="w-full text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                                        {UNDERSTANDING_LEVELS.map(l=><option key={l} value={l}>{l}</option>)}
                                 </select>
                            </div>
                            <div className="flex items-end gap-2">
                                 <button onClick={() => openNoteModal(item.id, item.name, item.note)} className="flex-1 py-2 bg-yellow-50 text-yellow-600 rounded-lg text-xs font-bold border border-yellow-200 hover:bg-yellow-100 flex items-center justify-center gap-1 dark:bg-yellow-900/20 dark:border-yellow-900 dark:text-yellow-500"><StickyNote size={14}/> Catatan</button>
                                 <button onClick={() => openEditModal(item)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-1 dark:bg-blue-900/20 dark:border-blue-900 dark:text-blue-500"><Edit2 size={14}/> Edit</button>
                            </div>
                            <button onClick={() => handleProposeGraduation(item)} className={`col-span-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition ${item.graduationStatus ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'}`} disabled={!!item.graduationStatus}>
                               {item.graduationStatus ? <><CheckCheck size={14}/> Sudah Diusulkan</> : <><GraduationCap size={14}/> Usulkan Graduasi</>}
                            </button>
                        </div>
                        <button onClick={()=>handleDeleteKPM(item.id)} className="w-full py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition flex items-center justify-center gap-2 mt-2"><Trash2 size={14}/> Hapus Data KPM</button>
                    </div>
                )}
             </div>
          ))}
          
          {visibleCount < filteredData.length && <div ref={mobileLoadMoreRef} className="py-6 flex justify-center col-span-full"><Loader2 className="animate-spin text-gray-400"/></div>}
          {filteredData.length === 0 && (
              <div className="col-span-full">
                  <EmptyState
                      title={searchTerm ? "Tidak Ada Hasil" : "Belum Ada Data KPM"}
                      description={searchTerm ? `Tidak ditemukan KPM dengan kata kunci "${searchTerm}".` : "Import file CSV/Excel dari menu Pengaturan,\natau tambahkan data KPM secara manual."}
                      icons={searchTerm ? [Search] : [Upload, Users, Plus]}
                      action={searchTerm ? undefined : { label: "+ Tambah KPM Manual", onClick: handleAddKPM }}
                  />
              </div>
          )}
      </div>
    </div>
  );
}