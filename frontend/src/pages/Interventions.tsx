import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Sparkles, 
  Users, 
  RefreshCw, 
  AlertCircle, 
  ArrowRight, 
  Activity,
  MapPin,
  HeartPulse
} from 'lucide-react';
import { apiService } from '../services/api';
import { Member } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { RagRecommendationPanel } from '../components/common/RagRecommendationPanel';

export const Interventions: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  const queryMemberId = searchParams.get('memberId');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(queryMemberId || '');

  const fetchMembersList = async () => {
    setLoadingMembers(true);
    setMembersError(null);
    try {
      const data = await apiService.getMembers();
      setMembers(data);

      // Resolve selected member ID dynamically
      if (queryMemberId && data.some((m) => m.id === queryMemberId)) {
        setSelectedMemberId(queryMemberId);
      } else if (data.length > 0) {
        // Fallback to first member in the cohort
        const defaultId = data[0].id;
        setSelectedMemberId(defaultId);
        setSearchParams({ memberId: defaultId }, { replace: true });
      }
    } catch (err: any) {
      console.error('Failed to load member cohort for interventions:', err);
      setMembersError('Failed to load member registry. Please refresh.');
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchMembersList();
  }, []);

  // Sync state if URL query param changes from external navigation
  useEffect(() => {
    if (queryMemberId && queryMemberId !== selectedMemberId) {
      setSelectedMemberId(queryMemberId);
    }
  }, [queryMemberId]);

  const handleMemberChange = (newMemberId: string) => {
    setSelectedMemberId(newMemberId);
    setSearchParams({ memberId: newMemberId });
  };

  const selectedMember = members.find((m) => m.id === selectedMemberId) || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                Clinical &amp; SDOH Intervention Hub
              </h1>
              <span className="text-xs text-teal-400 font-mono">
                RAG Evidence-Grounded Recommendations
              </span>
            </div>
          </div>
          <p className="text-xs lg:text-sm text-slate-400 mt-2">
            Synthesize evidence-grounded care recommendations formulated from FAISS medical guidelines, SDOH indicators, and Gemini clinical reasoning.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchMembersList}
            disabled={loadingMembers}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
            title="Reload latest cohort members (including newly uploaded data)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingMembers ? 'animate-spin' : ''}`} />
            <span>{loadingMembers ? 'Refreshing Cohort...' : 'Refresh Cohort'}</span>
          </button>
        </div>
      </div>

      {/* Cohort Member Selector Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 lg:p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Member Dropdown */}
          <div className="space-y-1.5 flex-1 max-w-xl">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-teal-400" />
              Select Monitored Member from Cohort
            </label>

            {loadingMembers ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Activity className="w-4 h-4 text-teal-400 animate-spin" />
                <span>Loading available members...</span>
              </div>
            ) : membersError ? (
              <div className="flex items-center gap-2 text-xs text-rose-400 py-1">
                <AlertCircle className="w-4 h-4" />
                <span>{membersError}</span>
              </div>
            ) : members.length === 0 ? (
              <div className="text-xs text-slate-500 py-1 font-mono">
                No members found in registry. Upload a dataset to begin.
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedMemberId}
                  onChange={(e) => handleMemberChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs lg:text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-teal-500/40 transition-all cursor-pointer"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} &bull; {m.age}y {m.gender} &bull; Risk: {m.riskSummary.overallRiskScore.toFixed(1)} ({m.riskSummary.riskLevel}) &bull; County FIPS: {m.countyFips || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quick Member Context Badge & Profile Link */}
          {selectedMember && (
            <div className="flex flex-wrap items-center gap-3 self-start md:self-end bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 px-3.5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-white font-bold">{selectedMember.id}</span>
                <RiskBadge level={selectedMember.riskSummary.riskLevel} />
                <span className="text-slate-400">Score: <strong className="text-white">{selectedMember.riskSummary.overallRiskScore.toFixed(1)}</strong></span>
              </div>

              {selectedMember.countyFips && selectedMember.countyFips !== 'N/A' && (
                <div className="flex items-center gap-1 text-slate-400 border-l border-slate-800 pl-3">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>FIPS {selectedMember.countyFips}</span>
                </div>
              )}

              <Link
                to={`/members/${selectedMember.id}`}
                className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 text-[11px] font-sans font-semibold ml-auto hover:underline"
              >
                <span>Full Profile</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main RAG Evidence-Grounded Recommendations Section */}
      {selectedMemberId ? (
        <RagRecommendationPanel
          memberId={selectedMemberId}
          member={selectedMember}
        />
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Member Selected</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Please select a member from the dropdown above to view dynamic RAG evidence-grounded recommendations.
          </p>
        </div>
      )}
    </div>
  );
};
