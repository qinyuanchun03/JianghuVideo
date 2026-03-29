import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Settings, History, Star } from 'lucide-react';

const NavItem: React.FC<{ 
  to: string; 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
}> = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex flex-col items-center gap-1 transition-all duration-300 ${
      active ? 'text-bg-accent scale-110' : 'text-text-muted'
    }`}
  >
    {icon}
    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </Link>
);

export const BottomNav: React.FC = () => {
  const location = useLocation();
  
  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-bg-main/80 backdrop-blur-xl border-t border-border-main flex items-center justify-around px-4 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(4rem + env(safe-area-inset-bottom))' }}
    >
      <NavItem to="/" icon={<Home className="w-5 h-5" />} label="首页" active={location.pathname === '/'} />
      <NavItem to="/history" icon={<History className="w-5 h-5" />} label="历史" active={location.pathname === '/history'} />
      <Link to="/search" className="relative -top-3">
        <div className="w-12 h-12 bg-bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-bg-accent/30 rotate-45">
          <Search className="text-white w-6 h-6 -rotate-45" />
        </div>
      </Link>
      <NavItem to="/favorites" icon={<Star className="w-5 h-5" />} label="收藏" active={location.pathname === '/favorites'} />
      <NavItem to="/settings" icon={<Settings className="w-5 h-5" />} label="设置" active={location.pathname === '/settings'} />
    </nav>
  );
};
