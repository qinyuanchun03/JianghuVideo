import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Play, Trash2, Loader2, Search } from 'lucide-react';
import { getFavorites, removeFromFavorites, isUserLoggedIn } from '../services/pocketbase';
import { MacCMSVideo } from '../types';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    if (!isUserLoggedIn()) {
      setLoading(false);
      return;
    }
    try {
      const res = await getFavorites(1, 100);
      setFavorites(res.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRemoveFavorite = async (vodId: string) => {
    try {
      await removeFromFavorites(vodId);
      setFavorites(prev => prev.filter(item => item.vod_id !== vodId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-bg-accent animate-spin" />
      </div>
    );
  }

  if (!isUserLoggedIn()) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <Star className="w-16 h-16 text-text-muted/30 mb-4" />
        <h3 className="text-xl font-medium text-text-main mb-2">请先登录</h3>
        <p className="text-text-muted max-w-sm mb-8">登录后即可同步您的收藏夹，在不同设备间无缝观看。</p>
        <Link to="/user" className="px-8 py-3 bg-bg-accent text-white rounded-full font-bold hover:opacity-90 transition-colors">
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-24 pb-8">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 bg-bg-accent/20 rounded-2xl flex items-center justify-center">
          <Star className="w-6 h-6 text-bg-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-text-main">我的收藏</h1>
          <p className="text-text-muted text-sm mt-1">您收藏的精彩影视内容</p>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Search className="w-16 h-16 text-text-muted/30 mb-4" />
          <h3 className="text-xl font-medium text-text-main mb-2">暂无收藏内容</h3>
          <p className="text-text-muted max-w-sm">您还没有收藏过任何视频，快去发现精彩内容吧！</p>
          <Link to="/" className="mt-8 px-8 py-3 bg-bg-card/50 hover:bg-bg-card text-text-main rounded-full transition-colors border border-border-main">
            返回首页
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {favorites.map((item) => (
            <div key={item.id} className="group relative flex flex-col gap-3 w-full">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-bg-card border border-border-main group-hover:border-bg-accent/30 transition-all duration-300">
                <img 
                  src={item.vod_pic} 
                  alt={item.vod_name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Link to={`/video/${item.vod_id}?source=${item.source_id}`} className="w-12 h-12 bg-bg-accent rounded-full flex items-center justify-center shadow-xl shadow-bg-accent/40 transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-6 h-6 text-white fill-current" />
                  </Link>
                </div>
                <button 
                  onClick={() => handleRemoveFavorite(item.vod_id)}
                  className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-md text-bg-accent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-bg-accent hover:text-white"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div>
                <Link to={`/video/${item.vod_id}?source=${item.source_id}`} className="text-text-main font-medium text-sm line-clamp-1 hover:text-bg-accent transition-colors">
                  {item.vod_name}
                </Link>
                <div className="flex items-center justify-between text-[10px] text-text-muted uppercase tracking-widest font-bold mt-1">
                  <span>{item.vod_year || '未知年份'}</span>
                  <span className="text-bg-accent/80">{item.vod_class || '未知分类'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
