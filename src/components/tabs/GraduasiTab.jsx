import React from 'react';
import { GraduationCap, X, CheckCheck, RotateCcw, Loader2, FileText } from 'lucide-react';

export default function GraduasiTab({
  cardColor, textColor, filteredGraduationData,
  handleCancelGraduation, handleUpdateGraduationStatus,
  generateGraduationLetter, isGeneratingPDF
}) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
        <div className={`p-6 rounded-2xl ${cardColor} shadow-sm text-center mb-6`}>
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3"><GraduationCap size={32} /></div>
            <h2 className="text-xl font-bold dark:text-white">Wisuda KPM (Graduasi)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola data KPM yang siap mandiri</p>
        </div>
        
        {filteredGraduationData.length === 0 ? (
            <div className="text-center py-10 opacity-50">
                <p className={textColor}>Belum ada usulan graduasi.</p>
                <p className="text-xs text-gray-400">Silakan usulkan dari menu Input.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredGraduationData.map(item => (
                    <div key={item.id} className={`p-5 rounded-2xl border relative overflow-hidden transition-all ${item.graduationStatus === 'ready' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
                        <div className="flex justify-between items-start mb-3 relative z-10">
                            <div>
                                <div className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider inline-block mb-2 ${item.graduationStatus === 'ready' ? 'bg-emerald-200 text-emerald-800' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {item.graduationStatus === 'ready' ? 'SIAP GRADUASI' : 'USULAN'}
                                </div>
                                <h3 className="font-bold text-lg dark:text-white">{item.name}</h3>
                                <p className="text-xs text-gray-500">{item.group} • {item.address}</p>
                            </div>
                            <button onClick={() => handleCancelGraduation(item)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Batalkan Usulan"><X size={18}/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            {item.graduationStatus !== 'ready' && (
                                <button onClick={() => handleUpdateGraduationStatus(item, 'ready')} className="col-span-2 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
                                    <CheckCheck size={16}/> Tandai Siap Graduasi
                                </button>
                            )}
                            {item.graduationStatus === 'ready' && (
                                <>
                                    <button onClick={() => handleUpdateGraduationStatus(item, 'proposed')} className="py-2.5 bg-yellow-100 text-yellow-700 rounded-xl font-bold text-xs hover:bg-yellow-200 transition flex items-center justify-center gap-2">
                                        <RotateCcw size={16}/> Kembalikan ke Usulan
                                    </button>
                                    <button onClick={() => generateGraduationLetter(item)} disabled={isGeneratingPDF} className="py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
                                        {isGeneratingPDF ? <Loader2 className="animate-spin" size={16}/> : <FileText size={16}/>} Unduh Surat
                                    </button>
                                </>
                            )}
                        </div>
                        <GraduationCap className="absolute -bottom-4 -right-4 text-current opacity-5 w-32 h-32 rotate-[-15deg]"/>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
}