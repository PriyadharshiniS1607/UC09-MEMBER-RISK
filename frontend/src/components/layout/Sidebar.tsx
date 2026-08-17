import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  Activity, 
  LogOut, 
  Lock,
  HeartHandshake,
  UploadCloud
} from 'lucide-react';
import { apiService } from '../../services/api';
import { User } from '../../types';

interface SidebarProps {
  currentUser: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    apiService.logout();
    onLogout();
    navigate('/login');
  };

  const navItems = [
    {
      label: 'Executive Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      badge: 'Overview',
    },
    {
      label: 'Member Population',
      path: '/members',
      icon: Users,
      badge: 'Registry',
    },
    {
      label: 'Clinical Interventions',
      path: '/interventions',
      icon: ClipboardList,
      badge: 'Active',
      highlightBadge: false,
    },
    {
      label: 'Data Ingestion (CSV)',
      path: '/upload',
      icon: UploadCloud,
      badge: 'CSV',
      highlightBadge: true,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800/80 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-white tracking-tight text-base font-sans">CareRisk<span className="text-teal-400 font-extrabold">Pulse</span></h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                UC-09
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Risk Prediction & Intervention</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="p-4 space-y-1">
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Clinical Workflows
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      item.highlightBadge
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Clinical Protocol Info Box */}
        <div className="mx-4 my-2 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center gap-2 text-teal-400 font-semibold">
            <HeartHandshake className="w-4 h-4 shrink-0" />
            <span>Care Management Focus</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Combining individual health, utilization, and county-level SDOH indicators for proactive intervention.
          </p>
        </div>
      </div>

      {/* User Footer & Logout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 space-y-3">
        {currentUser && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-9 h-9 rounded-full object-cover border border-teal-500/30"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-teal-600/20 text-teal-400 flex items-center justify-center font-bold text-xs border border-teal-500/30">
                {currentUser.name.charAt(0)}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
              <p className="text-[11px] text-teal-400 truncate">{currentUser.role}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.hospitalAffiliation}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Lock className="w-3.5 h-3.5 text-teal-400" />
            <span>Privacy & Security</span>
          </div>
          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
