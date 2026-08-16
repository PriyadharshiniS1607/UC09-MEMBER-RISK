import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldCheck, ArrowRight, Lock, Mail, Sparkles, Stethoscope, HeartHandshake, UserCheck } from 'lucide-react';
import { mockApiService } from '../services/api';
import { MOCK_USERS } from '../mock/mockData';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('s.jenkins@healthfirst.org');
  const [password, setPassword] = useState('demo-password-123');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(MOCK_USERS[0].id);
  const navigate = useNavigate();

  const handlePersonaSelect = (user: User) => {
    setSelectedRole(user.id);
    setEmail(user.email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await mockApiService.login(email);
      onLoginSuccess(response.user);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-xl z-10">
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-400 text-white shadow-xl shadow-teal-500/20 mb-2">
            <Activity className="w-9 h-9 animate-pulse" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              CareRisk<span className="text-teal-400">Pulse</span>
            </h1>
            <span className="px-2 py-0.5 rounded bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-mono font-bold">
              UC-09
            </span>
          </div>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Population Health Member Risk Prediction & Proactive Clinical Intervention Management
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white">Clinical Portal Sign In</h2>
              <p className="text-xs text-slate-400 mt-0.5">Select a simulated healthcare role or enter credentials</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-full">
              <Sparkles className="w-3 h-3" /> Phase 1 Demo
            </span>
          </div>

          {/* Quick Demo Persona Pickers */}
          <div className="mt-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Quick Select Demo Persona:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {MOCK_USERS.map((user: User) => {
                const isSelected = selectedRole === user.id;
                const Icon = user.role === 'Chief Medical Officer' ? Stethoscope : user.role === 'Care Manager' ? HeartHandshake : UserCheck;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handlePersonaSelect(user)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-teal-500/15 border-teal-500/50 text-white shadow-sm ring-1 ring-teal-500/50'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-2 ${isSelected ? 'text-teal-400' : 'text-slate-400'}`} />
                    <p className="text-xs font-bold truncate text-white">{user.name.split(',')[0]}</p>
                    <p className="text-[11px] text-teal-400/90 truncate">{user.role}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all"
                  placeholder="name@healthfirst.org"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password (Mock)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-bold text-sm py-3 rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating Session...</span>
              ) : (
                <>
                  <span>Access Clinical Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Prototype Notice */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-slate-500 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Synthetic data / prototype session (Local Auth Context)</span>
          </div>
        </div>

        {/* Project Footer Note */}
        <div className="text-center mt-6 text-xs text-slate-500">
          UC09 Member Risk Prediction & Intervention System &bull; Frontend Phase 1
        </div>
      </div>
    </div>
  );
};
