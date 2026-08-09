import React from 'react';
import { ChevronDown, StickyNote, Edit2, Trash2, PenLine, BookOpen, Clock } from 'lucide-react';
import EmptyState from '../ui/EmptyState';
import { useReveal } from '../../hooks/useReveal';
import { avatarColorFor } from '../../utils/avatar';

// Format tanggal relatif untuk timestamp catatan (id-ID).
// Dipakai di chip kecil "2 jam lalu" / "kemarin" / "12 Jul 2026".
const formatRelativeTime = (ts) => {
  if (!ts) return null;
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'kemarin';
  if (day < 7) return `${day} hari lalu`;
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatFullDate = (ts) => (ts
  ? new Date(ts).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '');

// Timeline Jurnal — adaptasi pola "timeline" (21st.dev) ke design language app:
// rel vertikal + avatar inisial berwarna + kartu catatan kuning + chip waktu relatif.
// Semua interaksi dipertahankan: filter kelompok, edit catatan, hapus catatan.
export default function JurnalTab({
  cardColor, textColor, selectedGroupJurnal, setShowGroupFilter,
  filteredJurnalData, openNoteModal, deleteNote
}) {
  const listRef = useReveal({ deps: [selectedGroupJurnal, filteredJurnalData.length], stagger: 0.05, y: 16 });
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex gap-3">
        <button onClick={() => setShowGroupFilter(true)} className={`flex-1 p-4 rounded-xl flex items-center justify-between ${cardColor} font-bold shadow-sm ${textColor}`}>
          <span>{selectedGroupJurnal}</span>
          <ChevronDown size={16} className="text-gray-400" />
        </button>
      </div>
      {filteredJurnalData.length === 0 ? (
        <EmptyState
          title="Belum Ada Catatan Jurnal"
          description={"Tulis catatan perkembangan KPM dari tab Input\n(buka detail KPM lalu pilih tombol Catatan)."}
          icons={[PenLine, StickyNote, BookOpen]}
        />
      ) : (
        <div className="relative">
          {/* Rel timeline vertikal */}
          <div className="absolute left-[22px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-800 rounded-full" aria-hidden="true" />
          <div ref={listRef} className="space-y-4">
            {filteredJurnalData.map((item) => (
              <div key={item.id} className="relative flex gap-3.5">
                {/* Titik avatar di atas rel */}
                <div className="shrink-0 relative z-10">
                  <div className={`w-11 h-11 rounded-full ${avatarColorFor(item.name)} flex items-center justify-center ring-4 ring-gray-50 dark:ring-gray-950 shadow-sm`}>
                    <span className="text-sm font-extrabold tracking-tight">{item.name.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
                {/* Kartu catatan */}
                <div className="flex-1 min-w-0 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 p-4 rounded-2xl relative transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-yellow-500/10">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-yellow-100 truncate">{item.name}</h3>
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        <span className="bg-white dark:bg-gray-900/60 border border-yellow-100 dark:border-yellow-900/40 px-1.5 py-px rounded-md font-bold text-gray-500 dark:text-gray-400">{item.group}</span>
                        {formatRelativeTime(item.noteUpdatedAt) && (
                          <span className="flex items-center gap-1 font-medium" title={formatFullDate(item.noteUpdatedAt)}>
                            <Clock size={10} /> {formatRelativeTime(item.noteUpdatedAt)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openNoteModal(item.id, item.name, item.note)} aria-label={`Edit catatan ${item.name}`} className="p-1.5 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition active:scale-90"><Edit2 size={14} /></button>
                      <button onClick={() => deleteNote(item)} aria-label={`Hapus catatan ${item.name}`} className="p-1.5 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition active:scale-90"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <p className="text-sm italic text-gray-600 dark:text-gray-300 leading-relaxed">&quot;{item.note}&quot;</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
