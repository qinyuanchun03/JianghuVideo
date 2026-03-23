import React, { useState, useEffect } from 'react';
import { pb, isUserLoggedIn, logout } from '../services/pocketbase';
import { Loader2, User, LogOut, LogIn, CheckCircle2, XCircle } from 'lucide-react';
import AuthModal from './AuthModal';

export default function PocketBaseTest() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [user, setUser] = useState(pb.authStore.model);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${pb.baseUrl}/api/health`);
        if (response.ok) {
          setStatus('connected');
        } else {
          setStatus('error');
          setError('PocketBase 返回了非 200 状态码');
        }
      } catch (e: any) {
        setStatus('error');
        setError(e.message || '无法连接到 PocketBase');
      }
    };

    checkConnection();

    const handleAuthChange = () => {
      setUser(pb.authStore.model);
    };

    window.addEventListener('pb_auth_changed', handleAuthChange);
    return () => window.removeEventListener('pb_auth_changed', handleAuthChange);
  }, []);

  return (
    <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl">
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          PocketBase 状态测试
          {status === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
          {status === 'connected' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {status === 'error' && <XCircle className="w-4 h-4 text-rose-500" />}
        </h2>
        
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <User className="w-4 h-4" />
              <span>{user.email || user.username}</span>
            </div>
            <button 
              onClick={logout}
              className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-sm font-medium transition-colors"
          >
            <LogIn className="w-4 h-4" />
            登录 / 注册
          </button>
        )}
      </div>

      {status === 'error' && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="text-sm text-zinc-500">
          <p className="mb-2">PocketBase 地址: <code className="text-zinc-300">{pb.baseUrl}</code></p>
          <p>建议在 PocketBase 管理后台创建以下集合 (Collections):</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-black/20 rounded-xl border border-white/5">
            <h3 className="text-white font-medium mb-2 text-sm">1. history (播放历史)</h3>
            <ul className="text-xs text-zinc-500 space-y-1">
              <li>• user (relation, users)</li>
              <li>• vod_id (text)</li>
              <li>• vod_name (text)</li>
              <li>• vod_pic (text)</li>
              <li>• source_id (text)</li>
              <li>• episode_name (text)</li>
              <li>• progress (number)</li>
              <li>• duration (number)</li>
            </ul>
          </div>
          <div className="p-4 bg-black/20 rounded-xl border border-white/5">
            <h3 className="text-white font-medium mb-2 text-sm">2. favorites (我的收藏)</h3>
            <ul className="text-xs text-zinc-500 space-y-1">
              <li>• user (relation, users)</li>
              <li>• vod_id (text)</li>
              <li>• vod_name (text)</li>
              <li>• vod_pic (text)</li>
              <li>• source_id (text)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
