import React from 'react';
import { 
  FileText, Users, StickyNote, History, GraduationCap, 
  Smartphone, Upload, Settings, Sun, Moon, Minimize, 
  Download, Wrench, ChevronRight, LogOut 
} from 'lucide-react';

export default function Header({
  activeTab, setActiveTab,
  isInstallable, handleInstallClick,
  fileInputRef, handleFileUpload,
  showViewMenu, setShowViewMenu,
  viewSettings, setViewSettings,
  setShowReportConfig, setIsConfigOpen,
  user, handleLogin, handleLogout
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/75 dark:bg-gray-900/75 backdrop-blur-xl border-b border-gray-200/70 dark:border-gray-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/25 ring-1 ring-white/20">
              <FileText size={20} strokeWidth={2.5} />
           </div>
           <div>
              <h1 className="font-bold text-lg leading-none tracking-tight text-gray-900 dark:text-white">SIP-P2K2</h1>
              <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mt-0.5">Pendamping PKH</p>
           </div>
        </div>

        <div className="hidden md:flex gap-1 absolute left-1/2 -translate-x-1/2">
           <button onClick={()=>setActiveTab('input')} className={`w-20 py-2 rounded-xl font-bold text-sm transition flex flex-col items-center gap-1 ${activeTab==='input' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              <Users size={20} strokeWidth={activeTab === 'input' ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Input</span>
           </button>
           <button onClick={()=>setActiveTab('jurnal')} className={`w-20 py-2 rounded-xl font-bold text-sm transition flex flex-col items-center gap-1 ${activeTab==='jurnal' ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <StickyNote size={20} strokeWidth={activeTab === 'jurnal' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Jurnal</span>
            </button>
            <button onClick={()=>setActiveTab('history')} className={`w-20 py-2 rounded-xl font-bold text-sm transition flex flex-col items-center gap-1 ${activeTab === 'history' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <History size={20} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Riwayat</span>
            </button>
            <button onClick={()=>setActiveTab('graduasi')} className={`w-20 py-2 rounded-xl font-bold text-sm transition flex flex-col items-center gap-1 ${activeTab === 'graduasi' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <GraduationCap size={20} strokeWidth={activeTab === 'graduasi' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Graduasi</span>
            </button>
        </div>

        <div className="flex items-center gap-2 relative">
           {isInstallable && (
               <button onClick={handleInstallClick} className="p-2.5 px-4 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition font-bold text-xs flex items-center gap-1.5 shadow-sm hidden sm:flex">
                   <Smartphone size={16} /> Install App
               </button>
           )}

           <label className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition cursor-pointer hidden sm:block">
              <Upload size={18} />
              <input ref={fileInputRef} type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
           </label>
           <button onClick={() => setShowViewMenu(!showViewMenu)} aria-label="Pengaturan tampilan" className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-90 transition">
              <Settings size={18} />
           </button>
           
           {showViewMenu && (
               <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowViewMenu(false)}></div>
                  <div className="absolute top-12 right-0 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50 animate-in fade-in zoom-in-95">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tampilan</h4>
                      <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-medium dark:text-white flex items-center gap-2"><Sun size={16}/> Tema</span>
                          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                              <button onClick={()=>setViewSettings({...viewSettings, theme: 'light'})} className={`p-1.5 rounded-md ${viewSettings.theme==='light' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><Sun size={16}/></button>
                              <button onClick={()=>setViewSettings({...viewSettings, theme: 'dark'})} className={`p-1.5 rounded-md ${viewSettings.theme==='dark' ? 'bg-gray-600 shadow text-white' : 'text-gray-400'}`}><Moon size={16}/></button>
                          </div>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-medium dark:text-white flex items-center gap-2"><Minimize size={16}/> Kepadatan</span>
                          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                              <button onClick={()=>setViewSettings({...viewSettings, density: 'normal'})} className={`px-2 py-1 text-xs font-bold rounded-md ${viewSettings.density==='normal' ? 'bg-white shadow text-blue-600 dark:bg-gray-600 dark:text-white' : 'text-gray-400'}`}>Normal</button>
                              <button onClick={()=>setViewSettings({...viewSettings, density: 'compact'})} className={`px-2 py-1 text-xs font-bold rounded-md ${viewSettings.density==='compact' ? 'bg-white shadow text-blue-600 dark:bg-gray-600 dark:text-white' : 'text-gray-400'}`}>Padat</button>
                          </div>
                      </div>

                      <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2">
                          {isInstallable && (
                              <button onClick={() => { handleInstallClick(); setShowViewMenu(false); }} className="w-full flex items-center justify-between p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-sm font-medium text-emerald-600 sm:hidden">
                                  <div className="flex items-center gap-2"><Smartphone size={16}/><span>Install Aplikasi (PWA)</span></div>
                                  <Download size={16}/>
                              </button>
                          )}

                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2">Laporan & Data</h4>
                          <button onClick={() => { setShowReportConfig(true); setIsConfigOpen(true); setActiveTab('input'); setShowViewMenu(false); }} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium dark:text-white">
                              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400"><Wrench size={16}/><span>Konfigurasi Laporan</span></div>
                              <ChevronRight size={16} className="text-gray-400"/>
                          </button>
                          
                          <label className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium dark:text-white cursor-pointer sm:hidden">
                              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400"><Upload size={16}/><span>Import Data (CSV)</span></div>
                              <input type="file" className="hidden" accept=".csv" onChange={(e) => { handleFileUpload(e); setShowViewMenu(false); }} />
                          </label>
                      </div>
                  </div>
               </>
           )}

           {user ? (
               <button onClick={handleLogout} aria-label="Keluar" className="p-2.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-90 transition"><LogOut size={18} /></button>
           ) : (
              <button onClick={handleLogin} className="px-4 py-2 rounded-full bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-600/25 transition">Login</button>
           )}
        </div>
      </div>
    </header>
  );
}