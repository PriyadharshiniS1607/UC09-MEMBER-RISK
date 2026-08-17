import React from 'react';
import { Activity } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  type?: 'spinner' | 'card-skeleton' | 'table-skeleton' | 'full';
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading population health data...',
  subMessage = 'Fetching predictive risk intelligence from the analytics service',
  type = 'full',
  rows = 4,
}) => {
  if (type === 'card-skeleton') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 bg-slate-800 rounded w-24" />
              <div className="w-8 h-8 bg-slate-800 rounded-xl" />
            </div>
            <div className="h-7 bg-slate-800 rounded w-28" />
            <div className="h-2.5 bg-slate-800/60 rounded w-36" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table-skeleton') {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 animate-pulse">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="h-4 bg-slate-800 rounded w-48" />
          <div className="h-4 bg-slate-800 rounded w-20" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-800 rounded-xl" />
                <div className="space-y-1.5">
                  <div className="h-3 bg-slate-800 rounded w-32" />
                  <div className="h-2 bg-slate-800/60 rounded w-48" />
                </div>
              </div>
              <div className="h-6 bg-slate-800 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-8">
      <div className="text-center space-y-3 max-w-sm">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto shadow-lg shadow-teal-500/10">
          <Activity className="w-6 h-6 animate-spin" />
        </div>
        <h3 className="text-sm font-bold text-white tracking-tight">{message}</h3>
        {subMessage && (
          <p className="text-xs text-slate-400 leading-relaxed">{subMessage}</p>
        )}
      </div>
    </div>
  );
};
export default LoadingState;
