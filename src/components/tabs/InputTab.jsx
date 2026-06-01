import React from 'react';
import { 
  CheckCircle, XCircle, Wallet, Banknote, PieChart, Activity, Search, 
  ChevronDown, Grid, Plus, CheckSquare, Archive, Trash2, Settings, 
  Camera, Upload, Loader2, Eye, Download, Check, StickyNote, Edit2, 
  CheckCheck, GraduationCap, Users, X
} from 'lucide-react';
import { PKH_MODULES, UNDERSTANDING_LEVELS } from '../../utils/constants';
import { formatRupiah, calculateTotalAid } from '../../utils/helpers';

export default function InputTab({
  scrollContainerRef, handleScroll, cardColor, subText, stats, currentSlide,
  searchTerm, setSearchTerm, setShowGroupFilter, selectedGroup, textColor,
  showToolsMenu, setShowToolsMenu, handleAddKPM, handleMarkAllPresent,
  handleArchiveSession, handleDeleteAllData, showReportConfig, isConfigOpen,
  setIsConfigOpen, currentConfig, handleConfigChange, selectedModule,
  setSelectedModule, isCompressing, handlePhotoUpload, handleLogoKiriUpload,
  handleLogoKananUpload, generateAbsensiPDF, isGeneratingPDF, paginatedData,
  cardPadding, isCompact, cardGap, handleStatusChange, expandedId, setExpandedId,
  textSizeBase, textSizeSub, renderComponentBadges, handleUnderstandingChange,
  openNoteModal, openEditModal, handleProposeGraduation, handleDeleteKPM,
  visibleCount, filteredData, mobileLoadMoreRef,
  handleAisearch, isAiLoading, predictGraduation
}) {
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
                              <div className="flex items-end gap-2 mt-1"><span className="text-3xl font-bold text-green-600">{stats.present}</span><span className="text-xs text-gray-400 mb-1.5">/ {stats.total}</span></div>
                              <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden"><div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.total ? (stats.present/stats.total)*100 : 0}%` }}></div></div>
                          </div>
                       </div>
                       <div className={`p-5 rounded-2xl ${cardColor} shadow-sm relative overflow-hidden group h-32 flex flex-col justify-between`}>
                          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><XCircle size={80} /></div>
                          <p className={`text-xs font-bold uppercase tracking-wider ${subText}`}>Absen</p>
                          <div className="flex items-end gap-2 mt-1"><span className="text-3xl font-bold text-red-500">{stats.absent}</span><span className="text-xs text-gray-400 mb-1.5">Orang</span></div>
                       </div>
                  </div>
              </div>
              <div className="min-w-full md:min-w-[calc(33.33%-10px)] snap-center">
                  <div className={`w-full h-32 p-5 rounded-2xl ${cardColor} shadow-sm relative overflow-hidden bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border-yellow-100 dark:border-yellow-900/30 flex flex-col justify-center`}>
                      <div className="absolute right-0 top-0 p-4 opacity-10 text-yellow-600 dark:text-yellow-500"><Wallet size={100} /></div>
                      <div className="relative z-10">
                          <p className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-500 flex items-center gap-2"><Banknote size={14}/> Total Estimasi Dana</p>
                          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1 tracking-tight">{formatRupiah(stats.totalAid)}</h2>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">*Estimasi bantuan untuk {stats.total} KPM</p>
                      </div>
                  </div>
              </div>
              <div className="min-w-full md:min-w-[calc(33.33%-10px)] snap-center">
                  <div className={`w-full h-32 p-4 rounded-2xl ${cardColor} shadow-sm relative overflow-hidden flex flex-col`}>
                        <div className="absolute right-0 top-0 p-4 opacity-5"><PieChart size={80} /></div>
                        <div className="flex items-center justify-between mb-2">
                            <p className={`text-xs font-bold uppercase tracking-wider ${subText} flex items-center gap-2`}><Activity size={14}/> Statistik Komponen</p>
                            <span className="text-xs font-extrabold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-200">Total: {stats.totalComponents}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg text-center border border-gray-100 dark:border-gray-700"><span className="block text-lg font-bold text-blue-600 dark:text-blue-400 leading-none">{stats.componentsCount.sd}</span><span className="text-[9px] text-gray-500">SD</span></div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg text-center border border-gray-100 dark:border-gray-700"><span className="block text-lg font-bold text-indigo-600 dark:text-indigo-400 leading-none">{stats.componentsCount.smp}</span><span className="text-[9px] text-gray-500">SMP</span></div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg text-center border border-gray-100 dark:border-gray-700"><span className="block text-lg font-bold text-violet-600 dark:text-violet-400 leading-none">{stats.componentsCount.sma}</span><span className="text-[9px] text-gray-500">SMA</span></div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg text-center border border-gray-100 dark:border-gray-700"><span className="block text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-none">{stats.componentsCount.lansia}</span><span className="text-[9px] text-gray-500">Lansia</span></div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg text-center border border-gray-100 dark:border-gray-700"><span className="block text-lg font-bold text-rose-600 dark:text-rose-400 leading-none">{stats.componentsCount.balita}</span><span className="text-[9px] text-gray-500">Balita</span></div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg text-center border border-gray-100 dark:border-gray-700"><span className="block text-lg font-bold text-pink-600 dark:text-pink-400 leading-none">{stats.componentsCount.hamil}</span><span className="text-[9px] text-gray-500">Bumil</span></div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg text-center border border-gray-100 dark:border-gray-700 col-span-2 flex items-center justify-between px-3"><span className="text-[9px] text-gray-500">Disabilitas</span><span className="block text-lg font-bold text-purple-600 dark:text-purple-400 leading-none">{stats.componentsCount.disabilitas}</span></div>
                        </div>
                  </div>
              </div>
          </div>
          <div className="md:hidden flex justify-center gap-1.5 mt-0 absolute -bottom-3 left-0 right-0">
              {[0, 1, 2].map((idx) => (<div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-4 bg-blue-600' : 'w-1.5 bg-gray-300 dark:bg-gray-700'}`} />))}
          </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 sticky top-[70px] z-30 pt-2"> 
         <div className={`w-full md:flex-1 flex flex-col gap-2`}>
            <div className={`flex items-center px-4 py-3 rounded-xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20 ${cardColor}`}>
                <Search className="text-gray-400 mr-3" size={18} />
                <input type="text" placeholder="Cari nama KPM atau NIK..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none w-full text-sm font-medium dark:text-white placeholder-gray-400" />
            </div>

         </div>

         <div className="flex gap-3 w-full md:w-auto">
             <button onClick={() => setShowGroupFilter(true)} className={`flex-1 md:flex-none px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between gap-3 min-w-[160px] shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition ${cardColor} ${textColor}`}>
                <span className="truncate max-w-[120px]">{selectedGroup}</span><ChevronDown size={16} className="text-gray-400" />
             </button>
             <div className="relative">
                 <button onClick={() => setShowToolsMenu(!showToolsMenu)} className={`p-3 rounded-xl transition active:scale-95 shadow-lg ${showToolsMenu ? 'bg-blue-700 text-white shadow-blue-600/30' : 'bg-blue-600 text-white shadow-blue-500/30'} hover:bg-blue-700`}>{showToolsMenu ? <X size={20} /> : <Grid size={20} />}</button>
                  {showToolsMenu && (
                      <>
                          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={() => setShowToolsMenu(false)}></div>
                          <div className="absolute right-0 top-full mt-2 w-64 sm:w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 p-4 animate-in fade-in slide-in-from-top-2 origin-top-right">
                              <div className="grid grid-cols-2 gap-3">
                                  <button onClick={() => { handleAddKPM(); setShowToolsMenu(false); }} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition border border-transparent hover:border-gray-200 dark:hover:border-gray-600"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Plus size={20} /></div><span className="text-xs font-bold dark:text-white">Tambah KPM</span></button>
                                  <button onClick={() => { handleMarkAllPresent(); setShowToolsMenu(false); }} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition border border-transparent hover:border-gray-200 dark:hover:border-gray-600"><div className="p-2 bg-green-100 text-green-600 rounded-lg"><CheckSquare size={20} /></div><span className="text-xs font-bold dark:text-white">Hadir Semua</span></button>
                                  <button onClick={() => { handleArchiveSession(); setShowToolsMenu(false); }} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition border border-transparent hover:border-gray-200 dark:hover:border-gray-600"><div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Archive size={20} /></div><span className="text-xs font-bold dark:text-white">Selesai & Reset</span></button>
                                  <button onClick={() => { handleDeleteAllData(); setShowToolsMenu(false); }} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition border border-transparent hover:border-gray-200 dark:hover:border-gray-600"><div className="p-2 bg-red-100 text-red-600 rounded-lg"><Trash2 size={20} /></div><span className="text-xs font-bold dark:text-white text-red-500">Hapus Semua</span></button>
                              </div>
                          </div>
                      </>
                  )}
             </div>
         </div>
      </div>

      {/* KONFIGURASI LAPORAN (ACCORDION) */}
      {showReportConfig && (
          <div className={`rounded-2xl border-2 border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10 animate-in fade-in overflow-hidden transition-all duration-300 mb-4`}>
              <button onClick={() => setIsConfigOpen(!isConfigOpen)} className="w-full flex items-center justify-between p-4 bg-orange-100 dark:bg-orange-900/40 hover:bg-orange-200 dark:hover:orange-900/60 transition text-orange-800 dark:text-orange-200 font-bold border-b border-orange-200 dark:border-orange-800/30">
                  <div className="flex items-center gap-2"><Settings size={18} /> <span>Konfigurasi Laporan & Absensi</span><span className="text-[10px] font-normal opacity-70 ml-2">(Klik untuk minimize)</span></div><ChevronDown size={20} className={`transition-transform duration-300 ${isConfigOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isConfigOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-5 pt-4 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <label className="text-xs font-bold opacity-60 dark:text-gray-300">Tanggal & Tempat</label>
                              <input type="date" value={currentConfig.tanggal} onChange={e=>handleConfigChange('tanggal', e.target.value)} className="w-full p-2 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                              <input type="text" value={currentConfig.tempat} onChange={e=>handleConfigChange('tempat', e.target.value)} className="w-full p-2 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 mt-2 dark:text-white" placeholder="Tempat..." />
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-bold opacity-60 dark:text-gray-300">Materi & Dokumentasi</label>
                              <select className="w-full p-2 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 mb-2 dark:text-white" onChange={e => { setSelectedModule(e.target.value); if(e.target.value !== selectedModule) handleConfigChange('materi', ''); }} value={selectedModule}>
                                 <option value="">Pilih Modul...</option>{Object.keys(PKH_MODULES).map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                              {selectedModule && (
                                 <select className="w-full p-2 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white mb-2" value={currentConfig.materi ? currentConfig.materi.split(`Modul ${selectedModule} - `)[1] || "" : ""} onChange={e => { if (e.target.value) handleConfigChange('materi', `Modul ${selectedModule} - ${e.target.value}`) }}>
                                    <option value="">Pilih Sesi...</option>{PKH_MODULES[selectedModule].map(s => <option key={s} value={s}>{s}</option>)}
                                 </select>
                              )}
                              <div className="flex items-center gap-2">
                                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 p-2 border border-dashed border-gray-400 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition">
                                      {isCompressing ? <Loader2 className="animate-spin" size={16}/> : <Camera size={16}/>}<span className="text-xs text-gray-500">{currentConfig.fotoKegiatan ? 'Ganti Foto' : 'Upload Foto'}</span><input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                  </label>
                                  {currentConfig.fotoKegiatan && <div className="w-10 h-10 rounded overflow-hidden border"><img src={currentConfig.fotoKegiatan} alt="Preview" className="w-full h-full object-cover"/></div>}
                              </div>
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-t border-dashed border-gray-300 dark:border-gray-700 pt-4">
                         <label className="flex flex-col gap-2">
                             <span className="text-xs font-bold opacity-60 dark:text-gray-300">Logo Kiri (Kemensos)</span>
                             <div className="flex items-center gap-2">
                                 <div className="flex-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center h-12">{currentConfig.logoKiri ? <img src={currentConfig.logoKiri} className="h-8 object-contain"/> : <span className="text-[10px] text-gray-400">Kosong</span>}</div>
                                 <label className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-300 transition"><Upload size={16}/><input type="file" accept="image/*" className="hidden" onChange={handleLogoKiriUpload} /></label>
                             </div>
                         </label>
                         <label className="flex flex-col gap-2">
                             <span className="text-xs font-bold opacity-60 dark:text-gray-300">Logo Kanan (PKH/Siger)</span>
                             <div className="flex items-center gap-2">
                                 <div className="flex-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center h-12">{currentConfig.logoKanan ? <img src={currentConfig.logoKanan} className="h-8 object-contain"/> : <span className="text-[10px] text-gray-400">Kosong</span>}</div>
                                 <label className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-300 transition"><Upload size={16}/><input type="file" accept="image/*" className="hidden" onChange={handleLogoKananUpload} /></label>
                             </div>
                         </label>
                      </div>
                      
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {paginatedData.map(item => (
             <div key={item.id} className={`group relative rounded-2xl ${cardPadding} transition-all duration-300 border ${item.presence ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-900 ring-1 ring-green-100 dark:ring-green-900/30' : `${cardColor} hover:shadow-md`}`}>
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
              <div className="text-center py-10 opacity-50 col-span-full">
                  <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"><Users size={24}/></div>
                  <p>Belum ada data KPM.</p>
                  <p className="text-xs">Import CSV atau Tambah Manual.</p>
              </div>
          )}
      </div>
    </div>
  );
}