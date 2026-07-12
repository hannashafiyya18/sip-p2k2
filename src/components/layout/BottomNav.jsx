import React from 'react';
import { Users, StickyNote, History, GraduationCap } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'input', label: 'Input', Icon: Users, active: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/25', dot: 'bg-blue-600 dark:bg-blue-400' },
  { id: 'jurnal', label: 'Jurnal', Icon: StickyNote, active: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/25', dot: 'bg-yellow-500 dark:bg-yellow-400' },
  { id: 'history', label: 'Riwayat', Icon: History, active: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/25', dot: 'bg-purple-600 dark:bg-purple-400' },
  { id: 'graduasi', label: 'Graduasi', Icon: GraduationCap, active: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/25', dot: 'bg-emerald-600 dark:bg-emerald-400' },
];

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200/70 dark:border-gray-800 pb-safe z-50 md:hidden shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.12)]">
        <div className="flex justify-around items-center px-2 pt-1.5 pb-1">
            {/* eslint-disable-next-line no-unused-vars -- Icon dipakai sebagai komponen JSX di bawah */}
            {NAV_ITEMS.map(({ id, label, Icon, active, dot }) => {
                const isActive = activeTab === id;
                return (
                    <button key={id} onClick={() => setActiveTab(id)} aria-label={label} aria-current={isActive ? 'page' : undefined}
                        className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl w-20 transition-all duration-200 active:scale-90 ${isActive ? active : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                        <Icon size={21} strokeWidth={isActive ? 2.5 : 2} className={`transition-transform duration-200 ${isActive ? '-translate-y-0.5' : ''}`} />
                        <span className={`text-[10px] leading-none transition-all ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
                        <span className={`h-1 w-1 rounded-full transition-all duration-200 ${isActive ? `${dot} opacity-100` : 'opacity-0'}`} />
                    </button>
                );
            })}
        </div>
    </div>
  );
}
