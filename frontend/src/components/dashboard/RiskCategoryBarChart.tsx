import React from 'react';
import { BarChart3 } from 'lucide-react';
import { PopulationMetrics } from '../../types';

interface RiskCategoryBarChartProps {
  metrics: PopulationMetrics;
}

export const RiskCategoryBarChart: React.FC<RiskCategoryBarChartProps> = ({ metrics }) => {
  const categories = [
    {
      name: 'Very High Risk',
      count: metrics.veryHighRiskCount,
      percentage: metrics.veryHighRiskPercentage,
      range: 'Score \u2265 75',
      color: 'bg-purple-500',
      textColor: 'text-purple-400',
      borderColor: 'border-purple-500/30',
      bgColor: 'bg-purple-500/10',
      glow: 'shadow-purple-500/20',
    },
    {
      name: 'High Risk',
      count: metrics.highRiskCount,
      percentage: metrics.highRiskPercentage,
      range: 'Score 55 - 74',
      color: 'bg-rose-500',
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500/30',
      bgColor: 'bg-rose-500/10',
      glow: 'shadow-rose-500/20',
    },
    {
      name: 'Medium Risk',
      count: metrics.mediumRiskCount,
      percentage: metrics.mediumRiskPercentage,
      range: 'Score 30 - 54',
      color: 'bg-amber-500',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      bgColor: 'bg-amber-500/10',
      glow: 'shadow-amber-500/20',
    },
    {
      name: 'Low Risk',
      count: metrics.lowRiskCount,
      percentage: metrics.lowRiskPercentage,
      range: 'Score < 30',
      color: 'bg-emerald-500',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      bgColor: 'bg-emerald-500/10',
      glow: 'shadow-emerald-500/20',
    },
  ];

  // Max count to scale bar widths proportionally
  const maxCount = Math.max(...categories.map((c) => c.count), 1);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 lg:p-6 shadow-xl flex flex-col justify-between space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">Risk Category Distribution</h3>
          </div>
          <span className="text-[11px] font-mono font-bold text-slate-400">
            {metrics.totalMembers} Monitored
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Population count across calibrated ML stacking risk classification tiers.
        </p>
      </div>

      {/* Main Bar Visualization */}
      <div className="space-y-4 py-1">
        {categories.map((cat) => {
          const relativeWidthPct = Math.max((cat.count / maxCount) * 100, 2);

          return (
            <div key={cat.name} className="space-y-1.5 group">
              {/* Category Info Row */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${cat.color} shadow-sm`} />
                  <span className="font-semibold text-slate-200">{cat.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">({cat.range})</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-white text-xs">{cat.count} members</span>
                  <span className="text-[11px] text-slate-400">({cat.percentage.toFixed(1)}%)</span>
                </div>
              </div>

              {/* Proportional Bar Track */}
              <div className="h-3.5 w-full bg-slate-950/80 rounded-lg p-0.5 border border-slate-800/80 overflow-hidden">
                <div
                  className={`h-full ${cat.color} rounded-md transition-all duration-500 shadow-sm ${cat.glow}`}
                  style={{ width: `${relativeWidthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Cutoff Reference */}
      <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Cutoffs: Low &lt; 30 &bull; Med 30-54 &bull; High 55-74 &bull; Very High &ge; 75</span>
        <span className="font-mono text-teal-300">Cohort Total: {metrics.totalMembers}</span>
      </div>
    </div>
  );
};
