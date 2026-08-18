import React, { useState } from 'react';
import { ShapDriver } from '../../types';
import { Sparkles, Info, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';

interface RiskDriverShapVisualizerProps {
  drivers: ShapDriver[];
  loading?: boolean;
}

export const RiskDriverShapVisualizer: React.FC<RiskDriverShapVisualizerProps> = ({ 
  drivers, 
  loading = false 
}) => {
  const [selectedDriver, setSelectedDriver] = useState<ShapDriver | null>(null);

  if (loading) {
    return (
      <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl animate-pulse space-y-3">
        <div className="h-4 bg-slate-800 rounded w-40" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-10 bg-slate-800/60 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!drivers || drivers.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
        No SHAP feature attribution data available for this member.
      </div>
    );
  }

  // Find max absolute SHAP value for proportional bar scaling
  const maxShap = Math.max(...drivers.map((d) => Math.abs(d.shapValue)), 1.0);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">Top Risk Drivers</h3>
            <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 text-[10px] font-mono font-bold">
              TreeExplainer SHAP
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Model feature impact ranking. Click any feature row to inspect explanation.
          </p>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          Top {Math.min(drivers.length, 10)} Features
        </span>
      </div>

      {/* Compact Horizontal Bar Comparison List */}
      <div className="divide-y divide-slate-800/60 text-xs">
        {drivers.slice(0, 10).map((driver) => {
          const isPositive = driver.shapValue >= 0;
          const barPercent = Math.min(Math.max((Math.abs(driver.shapValue) / maxShap) * 100, 6), 100);
          const isSelected = selectedDriver?.feature === driver.feature;

          return (
            <div
              key={driver.rank}
              onClick={() => setSelectedDriver(isSelected ? null : driver)}
              className={`py-2.5 px-3 rounded-xl transition-all cursor-pointer ${
                isSelected
                  ? 'bg-teal-500/10 border border-teal-500/30'
                  : 'hover:bg-slate-800/40'
              }`}
            >
              <div className="grid grid-cols-12 items-center gap-3">
                {/* Rank & Feature Name */}
                <div className="col-span-4 sm:col-span-3 flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded bg-slate-800 text-teal-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                    #{driver.rank}
                  </span>
                  <div className="min-w-0 truncate">
                    <span className="font-mono font-semibold text-white truncate block text-xs">
                      {driver.feature}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      Val: <strong className="text-slate-300">{driver.value}</strong>
                    </span>
                  </div>
                </div>

                {/* Horizontal SHAP Proportional Bar */}
                <div className="col-span-5 sm:col-span-6 space-y-1">
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex items-center">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isPositive 
                          ? 'bg-gradient-to-r from-rose-600 to-rose-400' 
                          : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                      }`}
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                </div>

                {/* Impact Value & Badge */}
                <div className="col-span-3 text-right flex items-center justify-end gap-1.5 shrink-0">
                  <span className={`inline-flex items-center gap-1 font-mono font-bold text-[11px] px-2 py-0.5 rounded border ${
                    isPositive 
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' 
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  }`}>
                    {isPositive ? <TrendingUp className="w-3 h-3 text-rose-400" /> : <TrendingDown className="w-3 h-3 text-emerald-400" />}
                    <span>{isPositive ? `+${driver.shapValue.toFixed(2)}` : driver.shapValue.toFixed(2)}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Feature Explanation Detail Box */}
      {selectedDriver ? (
        <div className="p-3.5 rounded-xl bg-slate-950 border border-teal-500/40 text-xs space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-teal-300 font-mono flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
              Feature Detail: {selectedDriver.feature}
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">
              Category: {selectedDriver.category}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {selectedDriver.description}
          </p>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>Positive values indicate factors increasing risk; negative values indicate protective/lowering factors.</span>
        </div>
      )}
    </div>
  );
};
