import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  Sparkles, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';

interface HeaderProps {
  currentUser: User | null;
}

export const Header: React.FC<HeaderProps> = ({ currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/members?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const mockNotifications = [
    {
      id: 'notif-1',
      title: 'High Risk Alert: Beatrice Sterling',
      time: '15m ago',
      desc: 'Risk score elevated to 94 due to recent fall risk and anticoagulation therapy.',
      urgent: true,
    },
    {
      id: 'notif-2',
      title: 'Intervention Due: Eleanor Vance',
      time: '1h ago',
      desc: 'Home nurse vitals and medication box setup due tomorrow.',
      urgent: false,
    },
  ];

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-96">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by member name, ID, or condition..."
          className="w-full bg-slate-950/70 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all"
        />
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Date Display */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-800">
          <Calendar className="w-3.5 h-3.5 text-teal-400" />
          <span>{todayStr}</span>
        </div>

        {/* Phase 1 Badge */}
        <div className="flex items-center gap-1.5 bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs px-3 py-1.5 rounded-lg font-medium">
          <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span>Phase 1 Mock Engine</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Clinical Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Clinical Alerts</h4>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-bold">2 New</span>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] text-teal-400 hover:underline"
                >
                  Mark all read
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {mockNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-lg border text-xs transition-colors ${
                      n.urgent
                        ? 'bg-rose-500/5 border-rose-500/20 text-rose-200'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span className="font-semibold text-white">{n.title}</span>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Pill */}
        {currentUser && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-teal-600/30 text-teal-300 flex items-center justify-center font-bold text-xs border border-teal-500/40">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-white leading-tight">{currentUser.name.split(',')[0]}</p>
              <p className="text-[10px] text-slate-400">{currentUser.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
