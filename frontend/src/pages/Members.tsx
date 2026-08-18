import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  ArrowRight, 
  Activity, 
  AlertCircle,
  ArrowUpDown,
  MapPin,
  Sparkles
} from 'lucide-react';
import { apiService } from '../services/api';
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
  const [selectedFips, setSelectedFips] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('riskScore_desc');

  const availableFipsList = useMemo(() => {
    const fipsSet = new Set<string>();
    members.forEach((m: Member) => {
      if (m.countyFips && m.countyFips !== 'N/A') fipsSet.add(m.countyFips);
    });
    return Array.from(fipsSet).sort();
  }, [members]);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const data = await apiService.getMembers({
          search: searchQuery,
          riskCategory: selectedRisk,
          countyFips: selectedFips !== 'All' ? selectedFips : undefined,
          sortBy: sortBy,
        });
        setMembers(data);
      } catch (err) {
        console.error('Error loading real members:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [searchQuery, selectedRisk, selectedFips, sortBy]);

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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">Member Registry</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-teal-400 font-mono text-xs font-bold">
              {members.length} Active Records
            </span>
          </div>
          <p className="text-xs lg:text-sm text-slate-400 mt-1">
            Cohort population records sourced from PostgreSQL with ML Stacking predictions &amp; SHAP feature drivers.
          </p>
        </div>
      </div>

      {/* Controls Toolbar (Search, Risk Filter, FIPS Filter, Sorting) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by Member ID (e.g. M00001) or FIPS code..."
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all font-mono"
            />
          </div>

          {/* County FIPS Filter */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedFips}
              onChange={(e) => setSelectedFips(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
            >
              <option value="All">All County FIPS Locations</option>
              {availableFipsList.map(fips => (
                <option key={fips} value={fips}>County FIPS {fips}</option>
              ))}
            </select>
          </div>

          {/* Sorting Control */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="riskScore_desc">Sort: Risk Score (High to Low)</option>
              <option value="riskScore_asc">Sort: Risk Score (Low to High)</option>
              <option value="age_desc">Sort: Member Age (Oldest First)</option>
            </select>
          </div>
        </div>

        {/* 4-Tier Risk Level Filter Tabs */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-800 overflow-x-auto">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-2">
            Risk Tier:
          </span>
          {(['All', 'Very High', 'High', 'Medium', 'Low'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => handleRiskTabChange(tier)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedRisk === tier
                  ? tier === 'Very High'
                    ? 'bg-purple-950/80 text-purple-200 border border-purple-500/50 shadow-sm'
                    : tier === 'High'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : tier === 'Medium'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : tier === 'Low'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'bg-slate-950/50 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {tier === 'All' ? 'All Tiers' : `${tier}`}
            </button>
          ))}
        </div>
      </div>

      {/* Members Registry Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Activity className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading cohort from PostgreSQL...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">No matching members found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No members matched the filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Member Identifier</th>
                  <th className="py-3 px-3">Demographics</th>
                  <th className="py-3 px-3">Geographic FIPS</th>
                  <th className="py-3 px-3">Chronic Diagnoses</th>
                  <th className="py-3 px-3">Utilization</th>
                  <th className="py-3 px-3">Top SHAP Risk Driver</th>
                  <th className="py-3 px-3 text-center">Risk Score</th>
                  <th className="py-3 px-3">Risk Tier</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {members.map((m) => {
                  const topDriver = m.shapDrivers[0];
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Member ID */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/members/${m.id}`}
                          className="font-mono font-bold text-teal-300 hover:text-teal-200 text-sm block"
                        >
                          {m.id}
                        </Link>
                      </td>

                      {/* Demographics */}
                      <td className="py-3.5 px-3">
                        <span className="text-white font-medium">{m.age} yrs</span>
                        <span className="text-slate-400 block text-[11px]">{m.gender}</span>
                      </td>

                      {/* Geographic FIPS */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-slate-300 text-xs">County: {m.countyFips}</span>
                        <span className="text-slate-500 block text-[10px] font-mono">State: {m.stateFips}</span>
                      </td>

                      {/* Chronic Diagnoses */}
                      <td className="py-3.5 px-3">
                        <span className="text-white font-semibold">{m.vitals.chronicConditionCount} conditions</span>
                        <span className="text-slate-400 block text-[11px] truncate max-w-[140px]">
                          {m.chronicConditions.length > 0 ? m.chronicConditions.map(c => c.name.replace('Type 2 ', '')).join(', ') : 'None diagnosed'}
                        </span>
                      </td>

                      {/* Utilization */}
                      <td className="py-3.5 px-3">
                        <span className="text-slate-300 font-mono">
                          {m.utilizationData.hospitalizationsLast12m} Hosp &bull; {m.utilizationData.erVisitsLast12m} ED
                        </span>
                        <span className="text-slate-500 block text-[10px] font-mono">
                          {m.utilizationData.medicationCount} Meds
                        </span>
                      </td>

                      {/* Top SHAP Risk Driver */}
                      <td className="py-3.5 px-3">
                        {topDriver ? (
                          <div>
                            <span className="font-mono text-slate-200 text-[11px] block truncate max-w-[140px]">
                              {topDriver.feature}
                            </span>
                            <span className={`text-[10px] font-mono font-bold ${
                              topDriver.shapValue > 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}>
                              {topDriver.shapValue > 0 ? `+${topDriver.shapValue.toFixed(2)}` : topDriver.shapValue.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">N/A</span>
                        )}
                      </td>

                      {/* Risk Score */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-bold text-sm text-white">
                          {m.riskSummary.overallRiskScore.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-500 block">/ 100</span>
                      </td>

                      {/* Risk Tier */}
                      <td className="py-3.5 px-3">
                        <RiskBadge level={m.riskSummary.riskLevel} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/members/${m.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all"
                            title={`View profile for ${m.id}`}
                          >
                            <span>View</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>

                          <Link
                            to={`/interventions?memberId=${m.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 hover:text-teal-200 border border-teal-500/30 text-xs font-semibold transition-all shadow-sm"
                            title={`Open RAG Interventions for ${m.id}`}
                          >
                            <Sparkles className="w-3 h-3 text-teal-400" />
                            <span>Intervention</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
