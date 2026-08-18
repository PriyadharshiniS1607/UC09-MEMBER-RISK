import React, { useState } from 'react';
import { 
  Search, 
  Calendar,
  Shield,
  Mail
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { EmailActivityModal } from '../common/EmailActivityModal';

interface HeaderProps {
  currentUser: User | null;
}

export const Header: React.FC<HeaderProps> = ({ currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
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

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-96">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Member ID (e.g. M00001) or FIPS code..."
          className="w-full bg-slate-950/70 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all font-mono"
        />
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Date Display */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-800">
          <Calendar className="w-3.5 h-3.5 text-teal-400" />
          <span>{todayStr}</span>
        </div>

        {/* Email Activity Modal Launcher */}
        <button
          onClick={() => setShowEmailModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold transition-all shadow-sm"
          title="View Email Audit Logs"
        >
          <Mail className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden sm:inline">Email Activity</span>
        </button>

        {/* User Pill */}
        {currentUser && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-teal-600/30 text-teal-300 flex items-center justify-center font-bold text-xs border border-teal-500/40">
              <Shield className="w-4 h-4 text-teal-400" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-white leading-tight">
                {currentUser.name || currentUser.username || 'User'}
              </p>
              <p className="text-[10px] text-teal-400 font-semibold font-mono uppercase">
                {currentUser.role?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Email Activity Modal */}
      <EmailActivityModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      />
    </header>
  );
};
