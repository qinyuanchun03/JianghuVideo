import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, History, X, Trash2, TrendingUp, PlayCircle, ArrowLeft } from 'lucide-react';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('search_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveToHistory = (q: string) => {
    const newHistory = [q, ...history.filter(h => h !== q)].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('search_history', JSON.stringify(newHistory));
  };

  const handleSearch = (e?: React.FormEvent, q?: string) => {
    if (e) e.preventDefault();
    const searchQ = q || query;
    if (searchQ.trim()) {
      saveToHistory(searchQ.trim());
      navigate(`/?q=${encodeURIComponent(searchQ.trim())}`);
    }
  };

  const removeHistoryItem = (q: string) => {
    const newHistory = history.filter(h => h !== q);
    setHistory(newHistory);
    localStorage.setItem('search_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('search_history');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-24 pb-12">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2.5 bg-bg-card/50 border border-border-main rounded-xl text-text-muted hover:text-text-main transition-all lg:hidden"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-black text-text-main tracking-tight">搜索</h1>
      </div>

      <form onSubmit={handleSearch} className="relative group mb-12">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-bg-accent transition-colors" />
        <input 
          type="text" 
          autoFocus
          placeholder="搜索电影、电视剧、综艺..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-bg-card/50 border border-border-main rounded-2xl py-4 pl-14 pr-4 text-lg text-text-main focus:outline-none focus:ring-2 focus:ring-bg-accent/20 focus:border-bg-accent/50 transition-all shadow-2xl"
        />
        {query && (
          <button 
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-main"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </form>

      <div className="space-y-10">
        {history.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2 text-text-muted">
                <History className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase tracking-widest">搜索历史</h3>
              </div>
              <button 
                onClick={clearHistory}
                className="text-xs text-text-muted/60 hover:text-bg-accent transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> 清空
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((item, idx) => (
                <div 
                  key={idx}
                  className="group flex items-center bg-bg-card/50 border border-border-main rounded-full pl-4 pr-2 py-1.5 hover:bg-bg-card hover:border-text-muted/20 transition-all"
                >
                  <button 
                    onClick={() => handleSearch(undefined, item)}
                    className="text-sm text-text-muted group-hover:text-text-main transition-colors"
                  >
                    {item}
                  </button>
                  <button 
                    onClick={() => removeHistoryItem(item)}
                    className="ml-2 p-1 text-text-muted/30 hover:text-bg-accent transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <div className="flex items-center gap-2 text-text-muted mb-6 px-2">
            <TrendingUp className="w-4 h-4" />
            <h3 className="text-sm font-bold uppercase tracking-widest">热门搜索</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {['外来媳妇本地郎', '狂飙', '长相思', '庆余年', '周处除三害', '热辣滚烫'].map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSearch(undefined, item)}
                className="flex items-center gap-4 p-4 bg-bg-card/30 border border-border-main rounded-2xl hover:bg-bg-card/50 hover:border-bg-accent/30 transition-all group text-left"
              >
                <span className={`text-lg font-black ${idx < 3 ? 'text-bg-accent' : 'text-text-muted/30'}`}>
                  {idx + 1}
                </span>
                <span className="text-text-muted group-hover:text-text-main font-medium transition-colors flex-1">
                  {item}
                </span>
                <PlayCircle className="w-5 h-5 text-text-muted/10 group-hover:text-bg-accent transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
