import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User as UserIcon } from 'lucide-react';
import { api, setAuthToken } from '../services/api';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'SECURITY_ANALYST' | 'DEVELOPER'>('DEVELOPER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register(name, email, password, role);
        setAuthToken(res.token);
        onLoginSuccess(res.user);
        onClose();
      } else {
        const res = await api.login(email, password);
        setAuthToken(res.token);
        onLoginSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoRole: 'ADMIN' | 'SECURITY_ANALYST' | 'DEVELOPER') => {
    if (demoRole === 'ADMIN') {
      setEmail('admin@sbomguardian.internal');
      setPassword('admin123!');
    } else if (demoRole === 'SECURITY_ANALYST') {
      setEmail('security@sbomguardian.internal');
      setPassword('security123!');
    } else {
      setEmail('dev@sbomguardian.internal');
      setPassword('dev123!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#111827] border border-slate-800 rounded-lg max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">
              {isRegister ? 'Register Account' : 'Supply Chain Platform Access'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xs">✕</button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded">
            {error}
          </div>
        )}

        {/* Demo Fast Login Strip */}
        <div className="p-3 bg-slate-900 border border-slate-800 rounded space-y-1.5 text-xs font-mono">
          <span className="text-[11px] text-slate-400">Quick Demo Accounts:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('ADMIN')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded text-[11px]"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('SECURITY_ANALYST')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded text-[11px]"
            >
              Security Analyst
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('DEVELOPER')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded text-[11px]"
            >
              Developer
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="DEVELOPER">Developer (Low-risk self-healing)</option>
                <option value="SECURITY_ANALYST">Security Analyst (Medium/High approvals)</option>
                <option value="ADMIN">Admin (Full authority)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
          {isRegister ? (
            <span>
              Already registered?{' '}
              <button onClick={() => setIsRegister(false)} className="text-cyan-400 hover:underline">
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Need a test account?{' '}
              <button onClick={() => setIsRegister(true)} className="text-cyan-400 hover:underline">
                Register here
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
