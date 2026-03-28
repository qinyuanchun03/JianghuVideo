import React, { useState, useEffect, Suspense, lazy, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Settings as SettingsIcon, Film, Search, Loader2, X, User as UserIcon, PlayCircle } from 'lucide-react';
import { findBestSource, getActiveSourceId, setActiveSourceId } from './services/maccms';
import { pb } from './services/pocketbase';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';

const Home = lazy(() => import('./pages/Home'));
const Detail = lazy(() => import('./pages/Detail'));
const Settings = lazy(() => import('./pages/Settings'));
const UserCenter = lazy(() => import('./pages/UserCenter'));
const HistoryPage = lazy(() => import('./pages/History'));
const FavoritesPage = lazy(() => import('./pages/Favorites'));
const SearchPage = lazy(() => import('./pages/SearchPage'));

// Theme Context
type Theme = 'dark' | 'day' | 'night' | 'girl';
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}
const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', setTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

function TopBar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(pb.authStore.model);

  useEffect(() => {
    const handleAuthChange = () => setUser(pb.authStore.model);
    window.addEventListener('pb_auth_changed', handleAuthChange);
    return () => window.removeEventListener('pb_auth_changed', handleAuthChange);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 right-0 left-0 lg:left-64 h-20 z-40 transition-all duration-300 px-6 flex items-center justify-between ${
      scrolled ? 'bg-bg-main/80 backdrop-blur-xl border-b border-border-main' : 'bg-transparent'
    }`}>
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-text-main tracking-tight">
          {location.pathname === '/' ? '首页' : 
           location.pathname === '/history' ? '播放历史' :
           location.pathname === '/favorites' ? '我的收藏' :
           location.pathname === '/settings' ? '设置' :
           location.pathname === '/user' ? '个人中心' :
           location.pathname === '/search' ? '搜索' : ''}
        </h2>
      </div>
      
      <div className="flex items-center gap-4">
        <Link to="/settings" className="p-2.5 rounded-xl bg-bg-card/50 border border-border-main text-text-muted hover:text-text-main hover:bg-bg-card transition-all">
          <SettingsIcon className="w-5 h-5" />
        </Link>
        <Link to="/user" className="w-10 h-10 rounded-xl bg-gradient-to-br from-bg-accent to-orange-500 p-[1px]">
          <div className="w-full h-full rounded-[11px] bg-bg-main flex items-center justify-center">
            {user ? (
              <span className="text-xs font-bold text-text-main">{(user.username || user.email || '?')[0].toUpperCase()}</span>
            ) : (
              <UserIcon className="w-5 h-5 text-text-main" />
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}

export default function App() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [theme, setThemeState] = useState<Theme>((localStorage.getItem('app_theme') as Theme) || 'dark');

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app_theme', newTheme);
  };

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
      <div className={`min-h-screen bg-bg-main flex flex-col items-center justify-center gap-4 ${theme === 'dark' ? '' : `theme-${theme}`}`}>
        <div className="w-20 h-20 bg-bg-accent rounded-3xl flex items-center justify-center shadow-2xl shadow-bg-accent/40 mb-4 animate-pulse">
          <PlayCircle className="w-12 h-12 text-white" />
        </div>
        <div className="text-text-muted text-sm animate-pulse">正在为您测速并选取最佳线路...</div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Router>
        <AppLayout />
      </Router>
    </ThemeContext.Provider>
  );
}

function AppLayout() {
  const { theme } = useTheme();
  const location = useLocation();
  const isDetailPage = location.pathname.startsWith('/video/');

  return (
    <div className={`flex min-h-screen bg-bg-main text-text-main font-sans selection:bg-bg-accent/30 ${theme === 'dark' ? '' : `theme-${theme}`}`}>
      <Sidebar />
      
      <main className="flex-1 relative lg:pl-64">
        {!isDetailPage && <TopBar />}
        
        <div className="pb-20 lg:pb-0">
          <Suspense fallback={
            <div className="flex items-center justify-center h-[60vh]">
              <Loader2 className="w-10 h-10 text-bg-accent animate-spin" />
            </div>
          }>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/video/:id" element={<Detail />} />
              <Route path="/user" element={<UserCenter />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/search" element={<SearchPage />} />
            </Routes>
          </Suspense>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
