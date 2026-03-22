import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Settings as SettingsIcon, Film, Search, Loader2 } from 'lucide-react';
import Home from './pages/Home';
import Detail from './pages/Detail';
import Settings from './pages/Settings';
import { findBestSource, getActiveSourceId, setActiveSourceId } from './services/maccms';

function Navbar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/');
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
      scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5' : 'bg-gradient-to-b from-black/80 to-transparent border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 text-white hover:text-rose-400 transition-colors shrink-0">
          <Film className="w-6 h-6 text-rose-500" />
          <span className="font-bold text-lg tracking-tight hidden sm:block">江湖影院</span>
        </Link>
        
        <div className="flex items-center gap-2 flex-1 justify-end">
          <form onSubmit={handleSearch} className="relative group max-w-md w-full sm:w-64 transition-all duration-300 focus-within:w-full focus-within:sm:w-80">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索..."
              className="w-full bg-zinc-900/80 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500 backdrop-blur-xl transition-all"
            />
          </form>
          <button 
            onClick={onOpenSettings}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0"
            title="设置"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    const activeId = localStorage.getItem('maccms_active_source_id');
    if (!activeId || activeId === 'default') {
      setIsInitializing(true);
      findBestSource().then(best => {
        if (best) {
          setActiveSourceId(best.id);
          console.log(`[App] Auto-selected best source: ${best.name} (${best.id})`);
        }
      }).finally(() => {
        setIsInitializing(false);
      });
    }
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
        <div className="text-zinc-400 text-sm animate-pulse">正在为您测速并选取最佳线路...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-50 font-sans selection:bg-rose-500/30">
        <Navbar onOpenSettings={() => setShowSettings(true)} />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/video/:id" element={<Detail />} />
          </Routes>
        </main>
        {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      </div>
    </Router>
  );
}
