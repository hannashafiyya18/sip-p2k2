import React from 'react';
import { Users, StickyNote, History, GraduationCap } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe z-50 md:hidden">
        <div className="flex justify-around items-center p-2">
            <button onClick={() => setActiveTab('input')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-20 ${activeTab === 'input' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400'}`}>
                <Users size={20} strokeWidth={activeTab === 'input' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Input</span>
            </button>
            <button onClick={() => setActiveTab('jurnal')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-20 ${activeTab === 'jurnal' ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-400'}`}>
                <StickyNote size={20} strokeWidth={activeTab === 'jurnal' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Jurnal</span>
            </button>
            <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-20 ${activeTab === 'history' ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-400'}`}>
                <History size={20} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Riwayat</span>
            </button>
            <button onClick={() => setActiveTab('graduasi')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-20 ${activeTab === 'graduasi' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-gray-400'}`}>
                <GraduationCap size={20} strokeWidth={activeTab === 'graduasi' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Graduasi</span>
            </button>
        </div>
    </div>
  );
}