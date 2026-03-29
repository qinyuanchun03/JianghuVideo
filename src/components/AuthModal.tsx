import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { login, register } from '../services/pocketbase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        onClose();
      } else {
        if (password !== passwordConfirm) {
          throw new Error('两次输入的密码不一致');
        }
        await register({
          email,
          password,
          passwordConfirm,
          username: username || undefined,
        });
        // Auto login after register
        await login(email, password);
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      
      let msg = err.message || '操作失败，请重试';
      
      // Handle PocketBase specific error objects
      if (err.data?.data) {
        const details = Object.entries(err.data.data)
          .map(([key, value]: [string, any]) => `${key}: ${value.message}`)
          .join(', ');
        if (details) msg = `${msg} (${details})`;
      }

      if (msg.includes('Only admins can perform this action')) {
        msg = '权限不足：目前暂不支持新用户注册，请联系管理员。';
      } else if (msg.includes('Please verify your email first')) {
        msg = '登录失败：请先在您的邮箱中完成验证。';
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="w-full max-w-md bg-bg-card border border-border-main rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-text-main tracking-tight uppercase">
              {isLogin ? 'Login' : 'Register'}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-bg-card/50 rounded-full text-text-muted hover:text-text-main transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-bg-accent/10 border border-bg-accent/20 rounded-xl flex items-center gap-3 text-bg-accent text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="用户名 (可选)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-bg-card/50 border border-border-main rounded-xl pl-12 pr-4 py-3 text-sm text-text-main placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-bg-accent/50 transition-all"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="email"
                placeholder="邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg-card/50 border border-border-main rounded-xl pl-12 pr-4 py-3 text-sm text-text-main placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-bg-accent/50 transition-all"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-card/50 border border-border-main rounded-xl pl-12 pr-4 py-3 text-sm text-text-main placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-bg-accent/50 transition-all"
                required
              />
            </div>

            {!isLogin && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  placeholder="确认密码"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full bg-bg-card/50 border border-border-main rounded-xl pl-12 pr-4 py-3 text-sm text-text-main placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-bg-accent/50 transition-all"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-bg-accent text-white rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-text-muted hover:text-text-main transition-colors"
            >
              {isLogin ? '没有账号? 立即注册' : '已有账号? 立即登录'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
