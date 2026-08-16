import React from 'react';
import { RiskLevel } from '../../types';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ 
  level, 
  score, 
  showIcon = true,
  size = 'md' 
}) => {
  const config = {
    High: {
      bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
      dot: 'bg-rose-400',
      icon: AlertCircle,
      label: 'High Risk',
    },
    Medium: {
      bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
      dot: 'bg-amber-400',
      icon: AlertTriangle,
      label: 'Medium Risk',
    },
    Low: {
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
      dot: 'bg-emerald-400',
      icon: CheckCircle2,
      label: 'Low Risk',
    },
  }[level] || {
    bg: 'bg-slate-500/15 border-slate-500/30 text-slate-300',
    dot: 'bg-slate-400',
    icon: CheckCircle2,
    label: level,
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-xs font-medium gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm font-semibold gap-2',
  }[size];

  return (
    <span 
      className={`inline-flex items-center rounded-full border ${config.bg} ${sizeClasses} backdrop-blur-sm transition-all shadow-sm`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      {!showIcon && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
      <span>{config.label}</span>
      {score !== undefined && (
        <span className="ml-1 px-1.5 py-0.2 bg-slate-900/40 rounded-full font-mono text-[11px] font-bold">
          {score}
        </span>
      )}
    </span>
  );
};
