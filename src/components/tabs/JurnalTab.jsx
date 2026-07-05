import React from 'react';
import { ChevronDown, StickyNote, Edit2, Trash2, PenLine, BookOpen } from 'lucide-react';
import EmptyState from '../ui/EmptyState';

export default function JurnalTab({
  cardColor, textColor, selectedGroupJurnal, setShowGroupFilter,
  filteredJurnalData, openNoteModal, deleteNote
}) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex gap-3">
            <button onClick={() => setShowGroupFilter(true)} className={`flex-1 p-4 rounded-xl flex items-center justify-between ${cardColor} font-bold shadow-sm ${textColor}`}>
                <span>{selectedGroupJurnal}</span> 
                <ChevronDown size={16} className="text-gray-400"/>
            </button>
        </div>
        {filteredJurnalData.length === 0 ? (
            <EmptyState
                title="Belum Ada Catatan Jurnal"
                description={"Tulis catatan perkembangan KPM dari tab Input\n(buka detail KPM lalu pilih tombol Catatan)."}
                icons={[PenLine, StickyNote, BookOpen]}
            />
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredJurnalData.map(item => (
                    <div key={item.id} className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 p-5 rounded-2xl relative">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-gray-900 dark:text-yellow-100">{item.name}</h3>
                            <div className="flex gap-2">
                                <button onClick={()=>openNoteModal(item.id,item.name,item.note)} className="p-1 text-yellow-600 hover:bg-yellow-100 rounded"><Edit2 size={14}/></button>
                                <button onClick={()=>deleteNote(item)} className="p-1 text-red-400 hover:bg-red-100 rounded"><Trash2 size={14}/></button>
                            </div>
                        </div>
                        <p className="text-sm italic text-gray-600 dark:text-gray-300">"{item.note}"</p>
                        <span className="absolute bottom-2 right-4 text-[10px] text-yellow-600/50 font-bold">{item.group}</span>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
}