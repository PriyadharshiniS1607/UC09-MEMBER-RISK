import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    isPositive?: boolean;
  };
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: 'teal' | 'rose' | 'amber' | 'blue' | 'indigo' | 'emerald';
  progress?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  accentColor = 'teal',
  progress,
}) => {
  const colorMap = {
    teal: {
      border: 'border-teal-500/20 hover:border-teal-500/40',
      iconBg: 'bg-teal-500/10 text-teal-400',
      progressBar: 'bg-teal-500',
      glow: 'group-hover:shadow-teal-500/10',
    },
    rose: {
      border: 'border-rose-500/20 hover:border-rose-500/40',
      iconBg: 'bg-rose-500/10 text-rose-400',
      progressBar: 'bg-rose-500',
      glow: 'group-hover:shadow-rose-500/10',
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400',
      progressBar: 'bg-amber-500',
      glow: 'group-hover:shadow-amber-500/10',
    },
    blue: {
      border: 'border-blue-500/20 hover:border-blue-500/40',
      iconBg: 'bg-blue-500/10 text-blue-400',
      progressBar: 'bg-blue-500',
      glow: 'group-hover:shadow-blue-500/10',
    },
    indigo: {
      border: 'border-indigo-500/20 hover:border-indigo-500/40',
      iconBg: 'bg-indigo-500/10 text-indigo-400',
      progressBar: 'bg-indigo-500',
      glow: 'group-hover:shadow-indigo-500/10',
    },
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      progressBar: 'bg-emerald-500',
      glow: 'group-hover:shadow-emerald-500/10',
    },
  }[accentColor];

  return (
    <div className={`group relative rounded-xl bg-slate-900/80 p-5 border ${colorMap.border} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${colorMap.glow}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-white font-mono tracking-tight">{value}</span>
            {trend && (
              <span
                className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded ${
                  trend.isPositive !== false
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-rose-400 bg-rose-500/10'
                }`}
              >
                {trend.direction === 'up' && <TrendingUp className="w-3 h-3 mr-0.5" />}
                {trend.direction === 'down' && <TrendingDown className="w-3 h-3 mr-0.5" />}
                {trend.direction === 'neutral' && <Minus className="w-3 h-3 mr-0.5" />}
                {trend.value}
              </span>
            )}
          </div>
        </div>
        <div className={`rounded-lg p-3 ${colorMap.iconBg} transition-transform group-hover:scale-110 duration-200`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {progress !== undefined && (
        <div className="mt-4 space-y-1">
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${colorMap.progressBar}`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {subtitle && <p className="mt-3 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};
