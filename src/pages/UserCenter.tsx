import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb, getHistory, getFavorites, deleteHistory, deleteFavorite, isUserLoggedIn } from '../services/pocketbase';
import { History, Heart, Trash2, Play, Clock, Loader2, ChevronRight, User as UserIcon, LogOut } from 'lucide-react';
import AuthModal from '../components/AuthModal';

export default function UserCenter() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'history' | 'favorites'>('history');
  const [history, setHistory] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState(pb.authStore.model);

  const fetchData = async () => {
    if (!isUserLoggedIn()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [historyRes, favoritesRes] = await Promise.all([
        getHistory(),
        getFavorites()
      ]);
      setHistory(historyRes.items);
      setFavorites(favoritesRes.items);
    } catch (e) {
      console.error('Failed to fetch user data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleAuthChange = () => {
      setUser(pb.authStore.model);
      if (pb.authStore.isValid) {
        fetchData();
      } else {
        setHistory([]);
        setFavorites([]);
      }
    };

    window.addEventListener('pb_auth_changed', handleAuthChange);
    return () => window.removeEventListener('pb_auth_changed', handleAuthChange);
  }, []);

  const handleDeleteHistory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteHistory(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      alert('删除失败');
    }
  };

  const handleDeleteFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteFavorite(id);
      setFavorites(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      alert('取消收藏失败');
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    window.dispatchEvent(new Event('pb_auth_changed'));
    navigate('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
          <UserIcon className="w-10 h-10 text-zinc-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">欢迎回来</h2>
        <p className="text-zinc-500 mb-8 max-w-xs">登录后即可同步您的播放历史和收藏夹，跨设备无缝追剧。</p>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold transition-all active:scale-95"
        >
          立即登录 / 注册
        </button>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      {/* User Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 bg-zinc-900/40 p-8 rounded-[2.5rem] border border-white/5">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-rose-700 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-rose-500/20">
            {(user.username || user.email || '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">{user.username || '影迷用户'}</h1>
            <p className="text-zinc-500 text-sm mt-1">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 rounded-2xl transition-all text-sm font-bold border border-transparent hover:border-rose-500/20"
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 bg-zinc-900/50 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'history' ? 'bg-white text-black shadow-lg' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          播放历史
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'favorites' ? 'bg-white text-black shadow-lg' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Heart className="w-4 h-4" />
          我的收藏
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          <p className="text-zinc-500 text-sm">加载中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {activeTab === 'history' ? (
            history.length > 0 ? (
              history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => navigate(`/video/${item.vod_id}?sid=${item.source_id}`)}
                  className="group relative bg-zinc-900/40 rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                >
                  <div className="aspect-[3/4] relative overflow-hidden">
                    <img 
                      src={item.vod_pic} 
                      alt={item.vod_name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 bg-rose-600 rounded-full flex items-center justify-center text-white shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                        <Play className="w-6 h-6 fill-current" />
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistory(e, item.id)}
                      className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-md rounded-xl text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-rose-400 transition-colors">{item.vod_name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-500">
                      <Clock className="w-3 h-3" />
                      <span>看到: {item.episode_name}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 text-center">
                <div className="w-16 h-16 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-zinc-700" />
                </div>
                <p className="text-zinc-500 text-sm">暂无播放记录</p>
              </div>
            )
          ) : (
            favorites.length > 0 ? (
              favorites.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => navigate(`/video/${item.vod_id}?sid=${item.source_id}`)}
                  className="group relative bg-zinc-900/40 rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                >
                  <div className="aspect-[3/4] relative overflow-hidden">
                    <img 
                      src={item.vod_pic} 
                      alt={item.vod_name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 bg-rose-600 rounded-full flex items-center justify-center text-white shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                        <Play className="w-6 h-6 fill-current" />
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteFavorite(e, item.id)}
                      className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-md rounded-xl text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-rose-400 transition-colors">{item.vod_name}</h3>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 text-center">
                <div className="w-16 h-16 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-zinc-700" />
                </div>
                <p className="text-zinc-500 text-sm">暂无收藏影片</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
