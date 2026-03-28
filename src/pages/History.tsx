import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { History as HistoryIcon, Play, Trash2, Loader2, Search } from 'lucide-react';
import { getHistory, clearHistory, deleteHistory, isUserLoggedIn } from '../services/pocketbase';
import { MacCMSVideo } from '../types';

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  const fetchHistory = async () => {
    if (!isUserLoggedIn()) {
      setLoading(false);
      return;
    }
    try {
      const res = await getHistory(1, 100);
      setHistory(res.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await clearHistory();
      setHistory([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteHistory(id);
      setHistory(prev => prev.filter(item => item.id !== id));
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
        <HistoryIcon className="w-16 h-16 text-text-muted/30 mb-4" />
        <h3 className="text-xl font-medium text-text-main mb-2">请先登录</h3>
        <p className="text-text-muted max-w-sm mb-8">登录后即可同步您的播放历史，在不同设备间无缝续播。</p>
        <Link to="/user" className="px-8 py-3 bg-bg-accent text-white rounded-full font-bold hover:opacity-90 transition-colors">
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-24 pb-8">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-bg-accent/20 rounded-2xl flex items-center justify-center">
            <HistoryIcon className="w-6 h-6 text-bg-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-main">播放历史</h1>
            <p className="text-text-muted text-sm mt-1">您最近观看的精彩内容</p>
          </div>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={isClearing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-card text-text-muted hover:text-bg-accent hover:bg-bg-accent/10 transition-all border border-border-main"
          >
            <Trash2 className="w-4 h-4" />
            <span>清空历史</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Search className="w-16 h-16 text-text-muted/30 mb-4" />
          <h3 className="text-xl font-medium text-text-main mb-2">暂无播放历史</h3>
          <p className="text-text-muted max-w-sm">您还没有观看过任何视频，快去发现精彩内容吧！</p>
          <Link to="/" className="mt-8 px-8 py-3 bg-bg-card/50 hover:bg-bg-card text-text-main rounded-full transition-colors border border-border-main">
            返回首页
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {history.map((item) => (
            <div key={item.id} className="group relative bg-bg-card/50 rounded-2xl overflow-hidden border border-border-main hover:border-bg-accent/30 transition-all duration-300">
              <Link to={`/video/${item.vod_id}?source=${item.source_id}`} className="block aspect-video relative overflow-hidden">
                <img 
                  src={item.vod_pic} 
                  alt={item.vod_name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 bg-bg-accent rounded-full flex items-center justify-center shadow-xl shadow-bg-accent/40 transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-6 h-6 text-white fill-current" />
                  </div>
                </div>
                {item.progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-bg-card">
                    <div 
                      className="h-full bg-bg-accent shadow-[0_0_8px_rgba(225,29,72,0.6)]" 
                      style={{ width: `${item.progress}%` }} 
                    />
                  </div>
                )}
              </Link>
              <div className="p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <Link to={`/video/${item.vod_id}?source=${item.source_id}`} className="text-text-main font-medium line-clamp-1 hover:text-bg-accent transition-colors">
                    {item.vod_name}
                  </Link>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 text-text-muted/50 hover:text-bg-accent transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-text-muted uppercase tracking-widest font-bold">
                  <span>{new Date(item.updated).toLocaleDateString()}</span>
                  <span className="text-bg-accent/80">{item.progress > 95 ? '已看完' : `播放至 ${Math.round(item.progress)}%`}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
