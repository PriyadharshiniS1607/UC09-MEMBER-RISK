import React from 'react';
import { ShapDriver } from '../../types';
import { Sparkles, Info, TrendingUp, TrendingDown } from 'lucide-react';

interface RiskDriverShapVisualizerProps {
  drivers: ShapDriver[];
  loading?: boolean;
}

export const RiskDriverShapVisualizer: React.FC<RiskDriverShapVisualizerProps> = ({ 
  drivers, 
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl animate-pulse space-y-4">
        <div className="h-5 bg-slate-800 rounded w-48" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-12 bg-slate-800/60 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!drivers || drivers.length === 0) {
    return null;
  }

  // Find max absolute SHAP value for proportional bar scaling
  const maxShap = Math.max(...drivers.map((d) => Math.abs(d.shapValue)), 1.0);

  return (
    <div className="bg-slate-900/90 border border-teal-500/30 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header & Section Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-extrabold text-white tracking-tight">Top Risk Drivers</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[10px] font-mono font-bold">
              SHAP Feature Attribution
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            "Why is this member at risk?" — Ranked model feature contributions to overall risk score.
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            Mock SHAP Engine
          </span>
        </div>
      </div>

      {/* Safety & Healthcare Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong className="text-white font-semibold">Healthcare Prototype Disclaimer: </strong>
          Risk drivers shown are synthetic prototype outputs and are not clinical diagnoses. Values demonstrate how backend SHAP feature contributions will display.
        </p>
      </div>

      {/* Ranked SHAP Feature Visualization List */}
      <div className="space-y-3.5">
        {drivers.map((driver) => {
          const isPositive = driver.shapValue >= 0;
          const barPercent = Math.min(Math.max((Math.abs(driver.shapValue) / maxShap) * 100, 8), 100);
          const formattedContribution = isPositive ? `+${driver.shapValue.toFixed(2)}` : driver.shapValue.toFixed(2);

          return (
            <div
              key={driver.rank}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2.5"
            >
              {/* Top Row: Rank, Feature Name, Value, Contribution */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-teal-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    #{driver.rank}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{driver.feature}</h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        driver.category === 'Health' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' :
                        driver.category === 'Utilization' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
                        'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                      }`}>
                        {driver.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Observed Value: <span className="font-mono font-semibold text-white">{driver.value}</span>
                    </p>
                  </div>
                </div>

                {/* Contribution Badge & Direction Indicator */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 font-medium">Contribution:</span>
                  <span className={`inline-flex items-center gap-1 font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg border ${
                    isPositive 
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' 
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  }`}>
                    {isPositive ? <TrendingUp className="w-3.5 h-3.5 text-rose-400" /> : <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{formattedContribution}</span>
                  </span>
                </div>
              </div>

              {/* Horizontal SHAP Contribution Bar */}
              <div className="space-y-1">
                <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex items-center">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isPositive ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                    }`}
                    style={{ width: `${barPercent}%` }}
                  />
                </div>
              </div>

              {/* Description / Explanation */}
              {driver.description && (
                <p className="text-[11px] text-slate-400 leading-relaxed pl-1 pt-0.5">
                  {driver.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
