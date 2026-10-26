'use client';

import React, { useState } from 'react';
import { KeyRound, User, Lock, Sparkles, X, CheckCircle, ShieldAlert } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: { id: string; username: string; displayName: string; pollenToken?: string }) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pollenToken, setPollenToken] = useState('');
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister 
        ? { username, password, pollenToken }
        : { username, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (isRegister && data.user.recovery_key) {
        setRecoveryKey(data.user.recovery_key);
        // Save auth data
        localStorage.setItem('imagynex_uid', data.user.id);
        localStorage.setItem('imagynex_username', data.user.username);
        if (data.user.pollen_token) {
          localStorage.setItem('pollen_token', data.user.pollen_token);
        }
      } else {
        localStorage.setItem('imagynex_uid', data.user.id);
        localStorage.setItem('imagynex_username', data.user.username);
        if (data.user.pollenToken) {
          localStorage.setItem('pollen_token', data.user.pollenToken);
        }
        onSuccess(data.user);
        onClose();
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl text-white">
        <button 
          onClick={onClose}
          className="absolute right-5 top-5 text-zinc-400 hover:text-white transition"
        >
          <X size={20} />
        </button>

        {recoveryKey ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle size={22} />
              <h3 className="font-bold text-lg">Account Created!</h3>
            </div>
            <p className="text-xs text-zinc-400">
              This is your permanent <strong>Recovery Secret Key</strong>. Save this key in a safe place. If you ever forget your password, you will need this key.
            </p>
            <div className="p-3 bg-zinc-950 border border-emerald-500/30 rounded-2xl font-mono text-center text-emerald-300 font-bold tracking-widest text-sm">
              {recoveryKey}
            </div>
            <button
              type="button"
              onClick={() => {
                onSuccess({
                  id: localStorage.getItem('imagynex_uid') || '',
                  username,
                  displayName: username,
                  pollenToken
                });
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-emerald-500 text-black font-black text-xs uppercase tracking-wider hover:bg-emerald-400 transition"
            >
              I Saved My Key, Continue
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight">
                {isRegister ? 'Create Artist Account' : 'Sign In to Imagynex'}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {isRegister 
                  ? 'Reserve your unique artist handle & save creations to portfolio.' 
                  : 'Access your permanent gallery, likes, and settings.'}
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <ShieldAlert size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Unique Username
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. cyber_samurai"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {isRegister && (
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Pollinations Token / API Key (Optional)
                  </label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={pollenToken}
                      onChange={(e) => setPollenToken(e.target.value)}
                      placeholder="sk_... (Or connect later)"
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
              >
                {loading ? 'Processing...' : isRegister ? 'Register & Reserve Handle' : 'Sign In'}
              </button>
            </form>

            <div className="mt-5 text-center text-xs text-zinc-400">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                className="text-indigo-400 hover:underline font-semibold ml-1"
              >
                {isRegister ? 'Sign In' : 'Create one'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}