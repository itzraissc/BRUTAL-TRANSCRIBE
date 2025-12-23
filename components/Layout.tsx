
import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#09090b] selection:bg-violet-500/30">
      <header className="border-b border-zinc-800 sticky top-0 bg-[#09090b]/80 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded flex items-center justify-center font-black italic text-white text-xl">
              BT
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">
              BRUTAL<span className="text-violet-500">TRANSCRIBE</span>
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-zinc-400">
            <a href="#" className="hover:text-zinc-100 transition-colors">Documentação</a>
            <a href="#" className="hover:text-zinc-100 transition-colors">Preços</a>
            <div className="h-4 w-px bg-zinc-800"></div>
            <span className="text-emerald-500 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              API Online
            </span>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-12">
        {children}
      </main>
      <footer className="border-t border-zinc-800 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-500">
          <p>© 2024 BrutalTranscribe. Feito para velocidade e precisão.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-zinc-300">Privacidade</a>
            <a href="#" className="hover:text-zinc-300">Termos</a>
            <a href="#" className="hover:text-zinc-300">Github</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
