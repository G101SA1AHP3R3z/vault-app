import React from 'react';
import { ArrowUpDown, X } from 'lucide-react';

export default function FloatingNavPill({ currentTab, setTab }) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50 pointer-events-none animate-in slide-in-from-bottom-4 duration-700">
      
      {/* Sort Button */}
      <button className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center text-gray-700 pointer-events-auto hover:bg-white hover:scale-105 active:scale-95 transition-all">
        <ArrowUpDown className="w-5 h-5" />
      </button>

      {/* The Tab Pill */}
      <div className="bg-white/90 backdrop-blur-xl border border-white/40 p-1.5 rounded-full flex items-center shadow-[0_8px_30px_rgba(0,0,0,0.12)] pointer-events-auto">
        {['library', 'search', 'graveyard'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setTab(tab)}
            className={`px-6 py-2.5 rounded-full text-[13px] font-bold transition-all duration-300 capitalize tracking-wide
              ${currentTab === tab 
                ? 'bg-black text-white shadow-md' 
                : 'text-gray-500 hover:text-black hover:bg-gray-100/50'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Close Button */}
      <button className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center text-gray-700 pointer-events-auto hover:bg-white hover:scale-105 active:scale-95 transition-all">
        <X className="w-5 h-5" />
      </button>

    </div>
  );
}