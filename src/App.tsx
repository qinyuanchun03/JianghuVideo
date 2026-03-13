import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Settings as SettingsIcon, Film } from 'lucide-react';
import Home from './pages/Home';
import Detail from './pages/Detail';
import Settings from './pages/Settings';

function Navbar() {
  const location = useLocation();
  const isSettings = location.pathname === '/settings';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
      scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5' : 'bg-gradient-to-b from-black/80 to-transparent border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-white hover:text-rose-400 transition-colors">
          <Film className="w-6 h-6 text-rose-500" />
          <span className="font-bold text-lg tracking-tight">江湖影院</span>
        </Link>
        
        {!isSettings && (
          <Link 
            to="/settings" 
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="设置"
          >
            <SettingsIcon className="w-5 h-5" />
          </Link>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-50 font-sans selection:bg-rose-500/30">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/video/:id" element={<Detail />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
