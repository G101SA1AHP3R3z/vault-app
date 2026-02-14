import React from 'react';
import { Library, Search, Archive, Box } from 'lucide-react';

export default function Navigation({ currentTab, setTab }) {
  const tabs = [
    { id: 'library', label: 'Library', icon: Library },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'graveyard', label: 'Graveyard', icon: Archive },
  ];

  return (
    <>
      {/* --- MOBILE: FLOATING PILL (Bottom Center) --- */}
      {/* Visible only on small screens (<768px) */}
      <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center p-1.5 rounded-full bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] ring-1 ring-white/50">
          
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`
                  relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300
                  ${isActive ? 'text-white' : 'text-gray-400 hover:text-gray-900'}
                `}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-black rounded-full shadow-sm animate-in fade-in zoom-in-95 duration-200" />
                )}
                <Icon className={`relative z-10 w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* --- DESKTOP: SIDEBAR (Fixed Left) --- */}
      {/* Visible only on medium+ screens (>=768px) */}
      <div className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 bg-gray-50/50 backdrop-blur-xl border-r border-gray-200 flex-col p-6 z-40">
        
        {/* Logo Area */}
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-md">
            <Box className="w-5 h-5" />
          </div>
          <span className="font-black text-xl tracking-tight uppercase text-black">Vault</span>
        </div>

        {/* Nav Links */}
        <div className="space-y-1">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-200
                  ${isActive 
                    ? 'bg-white shadow-sm text-black ring-1 ring-gray-200/50' 
                    : 'text-gray-500 hover:bg-gray-100/80 hover:text-black'}
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        {/* Footer Info */}
        <div className="mt-auto px-2">
          <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
            Vault v1.0 <br/> Denton, TX
          </div>
        </div>
      </div>
    </>
  );
}