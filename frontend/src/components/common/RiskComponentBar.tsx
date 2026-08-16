import React from 'react';
import { RiskBreakdown } from '../../types';
import { Stethoscope, Activity, MapPin, Layers } from 'lucide-react';

interface RiskComponentBarProps {
  breakdown: RiskBreakdown;
  compact?: boolean;
}

export const RiskComponentBar: React.FC<RiskComponentBarProps> = ({ breakdown, compact = false }) => {
  const components = [
    {
      key: 'health',
      label: 'Health Risk',
      score: breakdown.healthRiskScore,
      icon: Stethoscope,
      color: 'bg-rose-500',
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500/20',
      description: 'Clinical chronic condition severity, vitals telemetry, & disease progression.',
    },
    {
      key: 'utilization',
      label: 'Utilization Risk',
      score: breakdown.utilizationRiskScore,
      icon: Activity,
      color: 'bg-amber-500',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
      description: 'Historical inpatient admissions, ED visits, & 30-day readmission pattern.',
    },
    {
      key: 'sdoh',
      label: 'SDOH Risk',
      score: breakdown.sdohRiskScore,
      icon: MapPin,
      color: 'bg-sky-500',
      textColor: 'text-sky-400',
      borderColor: 'border-sky-500/20',
      description: 'County SVI vulnerability, transit barriers, & community resource access.',
    },
    {
      key: 'combined',
      label: 'Combined Risk',
      score: breakdown.combinedRiskScore,
      icon: Layers,
      color: 'bg-teal-500',
      textColor: 'text-teal-400',
      borderColor: 'border-teal-500/30',
      description: 'Predictive composite risk index synthesizing health, utilization, & SDOH vectors.',
    },
  ];

  if (compact) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {components.map((c) => (
          <div key={c.key} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">{c.label}</span>
              <span className={`font-mono font-bold ${c.textColor}`}>{c.score}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${c.color} rounded-full`} style={{ width: `${c.score}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {components.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.key}
              className={`p-4 rounded-xl bg-slate-950/70 border ${c.borderColor} space-y-3 hover:border-slate-700 transition-all`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg bg-slate-900 ${c.textColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">{c.label}</h4>
                </div>
                <span className={`text-lg font-extrabold font-mono ${c.textColor}`}>
                  {c.score}<span className="text-xs text-slate-500">/100</span>
                </span>
              </div>

              <div className="space-y-1">
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div className={`h-full ${c.color} rounded-full transition-all duration-500`} style={{ width: `${c.score}%` }} />
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {c.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
