import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ArrowRight, 
  Activity, 
  AlertCircle
} from 'lucide-react';
import { mockApiService } from '../services/api';
import { Member, RiskLevel } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';

export const Members: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const initialSearch = searchParams.get('q') || '';
  const initialRisk = (searchParams.get('risk') as RiskLevel | 'All') || 'All';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | 'All'>(initialRisk);
  const [selectedCondition, setSelectedCondition] = useState<string>('All');

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const data = await mockApiService.getMembers({
          search: searchQuery,
          riskLevel: selectedRisk,
          condition: selectedCondition,
        });
        setMembers(data);
      } catch (err) {
        console.error('Error loading members:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [searchQuery, selectedRisk, selectedCondition]);

  const handleRiskTabChange = (risk: RiskLevel | 'All') => {
    setSelectedRisk(risk);
    if (risk === 'All') {
      searchParams.delete('risk');
    } else {
      searchParams.set('risk', risk);
    }
    setSearchParams(searchParams);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val) {
      searchParams.set('q', val);
    } else {
      searchParams.delete('q');
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Member Population Registry</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-teal-400 font-mono text-xs font-bold">
              {members.length} Members
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Browse and triage cohort populations based on predictive risk stratification and clinical severity.
          </p>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search member name, ID (e.g. MBR-98241), or physician..."
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all"
            />
          </div>

          {/* Chronic Condition Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50"
            >
              <option value="All">All Conditions</option>
              <option value="Diabetes">Diabetes Mellitus</option>
              <option value="Heart Failure">Congestive Heart Failure</option>
              <option value="COPD">COPD / Respiratory</option>
              <option value="Hypertension">Hypertension</option>
              <option value="Atrial Fibrillation">Atrial Fibrillation</option>
            </select>
          </div>
        </div>

        {/* Risk Level Filter Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 overflow-x-auto">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-2">
            Risk Tier:
          </span>
          {(['All', 'High', 'Medium', 'Low'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => handleRiskTabChange(tier)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedRisk === tier
                  ? tier === 'High'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : tier === 'Medium'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : tier === 'Low'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'bg-slate-950/50 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {tier === 'All' ? 'All Tiers' : `${tier} Risk`}
            </button>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Activity className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Filtering population registry...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">No matching members found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your search keywords, risk level filters, or chronic condition criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Member Info</th>
                  <th className="py-3.5 px-4">Chronic Conditions</th>
                  <th className="py-3.5 px-4">Clinical Vitals</th>
                  <th className="py-3.5 px-4">Risk Stratification</th>
                  <th className="py-3.5 px-4">Care Manager</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {members.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Member Info */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 text-teal-400 font-bold flex items-center justify-center border border-slate-700 text-xs shrink-0 group-hover:border-teal-500/40 transition-colors">
                          {m.firstName[0]}{m.lastName[0]}
                        </div>
                        <div>
                          <Link
                            to={`/members/${m.id}`}
                            className="font-bold text-white hover:text-teal-400 transition-colors block text-sm"
                          >
                            {m.firstName} {m.lastName}
                          </Link>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="font-mono">{m.memberCode}</span>
                            <span>&bull;</span>
                            <span>{m.age}y, {m.gender}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Chronic Conditions */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {m.chronicConditions.slice(0, 2).map((c, i) => (
                          <span
                            key={i}
                            className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 truncate max-w-[140px]"
                            title={c.name}
                          >
                            {c.name}
                          </span>
                        ))}
                        {m.chronicConditions.length > 2 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-bold">
                            +{m.chronicConditions.length - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Clinical Vitals */}
                    <td className="py-4 px-4 font-mono text-[11px]">
                      <div className="space-y-0.5 text-slate-300">
                        <div>
                          <span className="text-slate-400">BP:</span> {m.vitals.bloodPressure}
                        </div>
                        <div>
                          <span className="text-slate-400">HR:</span> {m.vitals.heartRateBpm} bpm
                          {m.vitals.hba1c && (
                            <span className="ml-2 text-amber-400 font-semibold">
                              HbA1c: {m.vitals.hba1c}%
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Risk Stratification */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <RiskBadge level={m.riskSummary.riskLevel} score={m.riskSummary.overallRiskScore} />
                        <p className="text-[10px] text-slate-400">
                          Adm Risk: <span className="text-slate-300 font-mono font-bold">{m.riskSummary.hospitalAdmissionRiskPct}%</span>
                        </p>
                      </div>
                    </td>

                    {/* Care Manager */}
                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <p className="text-slate-200 font-medium truncate">{m.assignedCareManager}</p>
                        <p className="text-[11px] text-teal-400 flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          <span>{m.activeInterventionsCount} active task(s)</span>
                        </p>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <Link
                        to={`/members/${m.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-all group-hover:border-teal-500/60 shadow-sm"
                      >
                        <span>View Profile</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
