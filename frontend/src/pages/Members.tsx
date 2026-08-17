import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  ArrowRight, 
  ArrowUpDown,
  MapPin,
  Users
} from 'lucide-react';
import { apiService } from '../services/api';
import { Member, RiskLevel, InterventionPriority } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';

export const Members: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialSearch = searchParams.get('q') || '';
  const initialRisk = (searchParams.get('risk') as RiskLevel | 'All') || 'All';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | 'All'>(initialRisk);
  const [selectedSdohTier, setSelectedSdohTier] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('riskScore_desc');

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getMembers({
        search: searchQuery,
        riskLevel: selectedRisk,
        sdohTier: selectedSdohTier,
        sortBy: sortBy,
      });
      setMembers(data);
    } catch (err) {
      console.error('Error loading members:', err);
      setError('Unable to load member registry. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedRisk, selectedSdohTier, sortBy]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

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

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRisk('All');
    setSelectedSdohTier('All');
    setSortBy('riskScore_desc');
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Member Population Registry</h1>
            {!loading && !error && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-teal-400 font-mono text-xs font-bold">
                {members.length} Monitored Members
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Multidisciplinary cohort registry integrated across clinical, utilization, and county-level SDOH risk factors.
          </p>
        </div>
      </div>

      {/* Controls Toolbar (Search, Risk Filter, SDOH Filter, Sorting) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search member name, ID (e.g. MBR-98241), county, or FIPS..."
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-all"
            />
          </div>

          {/* SDOH Risk Filter */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedSdohTier}
              onChange={(e) => setSelectedSdohTier(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="All">All SDOH Vulnerability Tiers</option>
              <option value="Very High">Very High SDOH (SVI &gt; 0.85)</option>
              <option value="High">High SDOH (SVI 0.70 - 0.85)</option>
              <option value="Moderate">Moderate SDOH (SVI 0.40 - 0.70)</option>
              <option value="Low">Low SDOH (SVI &lt; 0.40)</option>
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
              <option value="name_asc">Sort: Member Name (A to Z)</option>
              <option value="healthRisk_desc">Sort: Health Risk (Highest)</option>
              <option value="utilizationRisk_desc">Sort: Utilization Risk (Highest)</option>
              <option value="sdohRisk_desc">Sort: SDOH Risk (Highest)</option>
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
              {tier === 'All' ? 'All Tiers' : `${tier} Risk`}
            </button>
          ))}
        </div>
      </div>

      {/* Members Table with States */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <LoadingState 
            type="table-skeleton" 
            message="Filtering population registry..." 
            rows={6}
          />
        ) : error ? (
          <div className="p-8">
            <ErrorState
              title="Unable to Retrieve Members"
              message={error}
              onRetry={fetchMembers}
              actionText="Retry Registry Load"
            />
          </div>
        ) : members.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Users}
              title="No Matching Members Found"
              message="No member records match your current search query, risk tier selection, or SDOH filter."
              actionText="Reset Filters"
              onAction={handleResetFilters}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Member Info &amp; Geography</th>
                  <th className="py-3.5 px-4 text-center">Combined Score</th>
                  <th className="py-3.5 px-4">Risk Category</th>
                  <th className="py-3.5 px-4">Health Risk</th>
                  <th className="py-3.5 px-4">Utilization Risk</th>
                  <th className="py-3.5 px-4">SDOH Risk (FIPS)</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {members.map((m) => {
                  const topPriority: InterventionPriority = 
                    m.riskSummary.riskLevel === 'Very High' ? 'Urgent' : 
                    m.riskSummary.riskLevel === 'High' ? 'High' : 
                    m.riskSummary.riskLevel === 'Medium' ? 'Medium' : 'Standard';

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Member Info & Geography */}
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
                              <span>{m.sdohData.countyName} ({m.sdohData.countyFips})</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Combined Risk Score */}
                      <td className="py-4 px-4 text-center">
                        <span className="font-mono font-extrabold text-base text-white">
                          {m.riskSummary.overallRiskScore}
                        </span>
                        <span className="text-[10px] text-slate-500 block">/ 100</span>
                      </td>

                      {/* 4-Tier Risk Category */}
                      <td className="py-4 px-4">
                        <RiskBadge level={m.riskSummary.riskLevel} />
                      </td>

                      {/* Health Risk Score */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-rose-400">{m.riskBreakdown.healthRiskScore}</span>
                          </div>
                          <div className="h-1.5 w-20 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${m.riskBreakdown.healthRiskScore}%` }} />
                          </div>
                        </div>
                      </td>

                      {/* Utilization Risk Score */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-amber-400">{m.riskBreakdown.utilizationRiskScore}</span>
                          </div>
                          <div className="h-1.5 w-20 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${m.riskBreakdown.utilizationRiskScore}%` }} />
                          </div>
                        </div>
                      </td>

                      {/* SDOH Risk Score */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-sky-400">{m.riskBreakdown.sdohRiskScore}</span>
                            <span className="text-[10px] text-slate-500 font-mono">SVI {m.sdohData.sviScore}</span>
                          </div>
                          <div className="h-1.5 w-20 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${m.riskBreakdown.sdohRiskScore}%` }} />
                          </div>
                        </div>
                      </td>

                      {/* Intervention Priority */}
                      <td className="py-4 px-4">
                        <StatusBadge priority={topPriority} />
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

export default Members;
