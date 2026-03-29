import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Settings, History, Star, Compass, PlayCircle } from 'lucide-react';

const SidebarItem: React.FC<{ 
  to: string; 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
}> = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
      active 
        ? 'bg-bg-accent text-white shadow-lg shadow-bg-accent/20' 
        : 'text-text-muted hover:bg-bg-card hover:text-text-main'
    }`}
  >
    <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className="font-medium text-sm">{label}</span>
  </Link>
);

export const Sidebar: React.FC = () => {
  const location = useLocation();
  
  return (
    <aside className="hidden lg:flex flex-col w-64 h-[100dvh] fixed top-0 left-0 bg-bg-main/50 backdrop-blur-2xl border-r border-border-main p-6 overflow-y-auto scrollbar-hide z-50 shrink-0">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 bg-bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-bg-accent/20">
          <PlayCircle className="text-white w-6 h-6" />
        </div>
        <span className="text-xl font-bold tracking-tight text-text-main">江湖影视</span>
      </div>
      
      <div className="space-y-8">
        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-4 px-4">浏览</h3>
          <div className="space-y-1">
            <SidebarItem to="/" icon={<Home className="w-5 h-5" />} label="首页" active={location.pathname === '/'} />
            <SidebarItem to="/search" icon={<Search className="w-5 h-5" />} label="搜索" active={location.pathname === '/search'} />
          </div>
        </div>
        
        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-4 px-4">我的库</h3>
          <div className="space-y-1">
            <SidebarItem to="/history" icon={<History className="w-5 h-5" />} label="播放历史" active={location.pathname === '/history'} />
            <SidebarItem to="/favorites" icon={<Star className="w-5 h-5" />} label="我的收藏" active={location.pathname === '/favorites'} />
          </div>
        </div>
        
        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-4 px-4">系统</h3>
          <div className="space-y-1">
            <SidebarItem to="/settings" icon={<Settings className="w-5 h-5" />} label="设置" active={location.pathname === '/settings'} />
          </div>
        </div>
      </div>
      
      <div className="mt-auto pt-10">
        <div className="p-4 rounded-2xl bg-bg-card border border-border-main">
          <p className="text-xs text-text-muted mb-3">享受无广告的纯净体验</p>
          <button className="w-full py-2 bg-bg-accent text-white text-xs font-bold rounded-lg hover:opacity-90 transition-colors">
            了解更多
          </button>
        </div>
      </div>
    </aside>
  );
};
