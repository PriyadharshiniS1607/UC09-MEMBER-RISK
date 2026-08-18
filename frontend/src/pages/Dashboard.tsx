import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Activity, 
  ArrowRight, 
  ShieldCheck, 
  Flame, 
  HeartPulse, 
  UploadCloud, 
  Mail, 
  CheckCircle2, 
  AlertTriangle
} from 'lucide-react';
import { apiService } from '../services/api';
import { Member, PopulationMetrics, User } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { RiskBadge } from '../components/common/RiskBadge';
import { RiskComponentBar } from '../components/common/RiskComponentBar';

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PopulationMetrics | null>(null);
  const [highRiskMembers, setHighRiskMembers] = useState<Member[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [digestState, setDigestState] = useState<{ sending: boolean; message: string | null; isError: boolean }>({
    sending: false,
    message: null,
    isError: false,
  });

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [metricsData, membersData, user] = await Promise.all([
        apiService.getPopulationMetrics(),
        apiService.getMembers({ sortBy: 'riskScore_desc' }),
        apiService.getCurrentUser(),
      ]);

      setMetrics(metricsData);
      setHighRiskMembers(membersData.slice(0, 5));
      setCurrentUser(user);
    } catch (err) {
      console.error('Error fetching live dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSendWeeklyDigest = async () => {
    if (!metrics) return;
    setDigestState({ sending: true, message: null, isError: false });

    try {
      const topFlagged = highRiskMembers.slice(0, 3).map(m => ({
        name: m.id,
        code: m.memberCode,
        score: Math.round(m.riskSummary.overallRiskScore),
        level: m.riskSummary.riskLevel,
        barrier: m.shapDrivers[0]?.feature || 'Elevated chronic risk',
      }));

      const res = await apiService.sendWeeklyDigestEmail({
        to_email: currentUser?.email || 'care.management@healthfirst.org',
        coordinator_name: currentUser?.name || 'Care Management Team',
        total_members: metrics.totalMembers,
        very_high_count: metrics.veryHighRiskCount,
        high_count: metrics.highRiskCount,
        active_interventions: metrics.activeInterventionsCount,
        flagged_members: topFlagged,
        portal_url: window.location.origin,
        attach_report: true,
      });

      setDigestState({
        sending: false,
        message: res.message || 'Weekly cohort digest queued successfully.',
        isError: false,
      });
      setTimeout(() => setDigestState(prev => ({ ...prev, message: null })), 6000);
    } catch (err: any) {
      console.error('Failed to send weekly digest:', err);
      setDigestState({
        sending: false,
        message: err?.response?.data?.detail || 'Failed to dispatch weekly digest notification.',
        isError: true,
      });
      setTimeout(() => setDigestState(prev => ({ ...prev, message: null })), 6000);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Activity className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Loading live population risk intelligence...</p>
        </div>
      </div>
    );
  }

  const populationRiskBreakdown = {
    healthRiskScore: metrics.healthAverageScore || 62,
    utilizationRiskScore: metrics.utilizationAverageScore || 54,
    sdohRiskScore: metrics.sdohAverageScore || 59,
    combinedRiskScore: metrics.averageRiskScore,
  };

  const isCareOrAdmin = currentUser?.role === 'care_manager' || currentUser?.role === 'payer_admin';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Executive Welcome Header */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/30 p-6 lg:p-7 border border-slate-800 shadow-xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Population Risk Intelligence &bull; Live Cohort Data</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Population Risk Overview
            </h1>
            <p className="text-xs lg:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Consolidated member risk prediction, clinical condition monitoring, and county-level SDOH indicator analytics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isCareOrAdmin && (
              <button
                onClick={handleSendWeeklyDigest}
                disabled={digestState.sending}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
              >
                <Mail className="w-4 h-4 text-teal-400" />
                <span>{digestState.sending ? 'Queueing Digest...' : 'Send Weekly Digest'}</span>
              </button>
            )}

            {currentUser?.role !== 'payer_viewer' && (
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 text-xs font-semibold border border-teal-500/30 transition-all"
              >
                <UploadCloud className="w-4 h-4 text-teal-400" />
                <span>Data Ingestion</span>
              </Link>
            )}

            <Link
              to="/members"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20"
            >
              <Users className="w-4 h-4" />
              <span>Member Registry ({metrics.totalMembers})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Digest Notification Alert */}
      {digestState.message && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-in fade-in ${
          digestState.isError
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            {digestState.isError ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span>{digestState.message}</span>
          </div>
          <button onClick={() => setDigestState(prev => ({ ...prev, message: null }))} className="text-slate-400 hover:text-white p-1">
            &times;
          </button>
        </div>
      )}

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Monitored Members"
          value={metrics.totalMembers.toLocaleString()}
          subtitle="Active cohort records in PostgreSQL"
          icon={Users}
          accentColor="blue"
          trend={{ value: 'Database Live', direction: 'neutral' }}
        />

        <MetricCard
          title="Very High Risk"
          value={`${metrics.veryHighRiskCount} (${metrics.veryHighRiskPercentage.toFixed(1)}%)`}
          subtitle="Immediate clinical intervention priority"
          icon={Flame}
          accentColor="rose"
          progress={metrics.veryHighRiskPercentage}
          trend={{ value: 'Urgent Care', direction: 'up', isPositive: false }}
        />

        <MetricCard
          title="High Risk"
          value={`${metrics.highRiskCount} (${metrics.highRiskPercentage.toFixed(1)}%)`}
          subtitle="Proactive care management queue"
          icon={Activity}
          accentColor="amber"
          progress={metrics.highRiskPercentage}
          trend={{ value: 'Elevated Risk', direction: 'neutral' }}
        />

        <MetricCard
          title="Average Risk Score"
          value={`${metrics.averageRiskScore.toFixed(1)} / 100`}
          subtitle="Ensemble composite population mean"
          icon={HeartPulse}
          accentColor="teal"
          progress={metrics.averageRiskScore}
          trend={{ value: 'Population Score', direction: 'neutral' }}
        />
      </div>

      {/* Visual Analytics & High Priority Cohort Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Visual */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Risk Tier Distribution</h3>
              <span className="text-[11px] font-mono text-slate-400">{metrics.totalMembers} total</span>
            </div>

            <div className="mt-4 space-y-3.5">
              {/* Very High Risk */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Very High Risk
                  </span>
                  <span className="font-mono font-bold text-white">
                    {metrics.veryHighRiskCount} ({metrics.veryHighRiskPercentage}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${metrics.veryHighRiskPercentage}%` }} />
                </div>
              </div>

              {/* High Risk */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> High Risk
                  </span>
                  <span className="font-mono font-bold text-white">
                    {metrics.highRiskCount} ({metrics.highRiskPercentage}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${metrics.highRiskPercentage}%` }} />
                </div>
              </div>

              {/* Medium Risk */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Medium Risk
                  </span>
                  <span className="font-mono font-bold text-white">
                    {metrics.mediumRiskCount} ({metrics.mediumRiskPercentage}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${metrics.mediumRiskPercentage}%` }} />
                </div>
              </div>

              {/* Low Risk */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Low Risk
                  </span>
                  <span className="font-mono font-bold text-white">
                    {metrics.lowRiskCount} ({metrics.lowRiskPercentage}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${metrics.lowRiskPercentage}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Ensemble Cutoffs: Low &lt; 30 &bull; Med 30-55 &bull; High 55-75 &bull; V.High &gt; 75</span>
          </div>
        </div>

        {/* High-Priority Member Roster */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">High-Priority Members</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-bold">Top Risk Cohort</span>
              </div>
              <Link to="/members" className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1">
                <span>View Full Registry &rarr;</span>
              </Link>
            </div>

            <div className="mt-3 divide-y divide-slate-800/80">
              {highRiskMembers.map((m) => {
                const topDriver = m.shapDrivers[0];
                return (
                  <div key={m.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-teal-400 font-mono font-bold flex items-center justify-center text-xs shrink-0">
                        {m.id.replace(/^M0*/, '#')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link to={`/members/${m.id}`} className="text-xs font-bold text-white hover:text-teal-400 truncate">
                            {m.id}
                          </Link>
                          <span className="text-[11px] text-slate-400">{m.age} yrs &bull; {m.gender}</span>
                          <span className="text-[11px] text-slate-500 font-mono">FIPS: {m.countyFips}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          Top Risk Driver: <span className="font-mono text-teal-300">{topDriver?.feature || 'Chronic Disease Burden'}</span> ({topDriver ? `${topDriver.shapValue > 0 ? '+' : ''}${topDriver.shapValue.toFixed(2)}` : 'N/A'})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <RiskBadge level={m.riskSummary.riskLevel} score={m.riskSummary.overallRiskScore} size="sm" />
                      <Link
                        to={`/members/${m.id}`}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="View Profile"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Ranked by ML Stacking Ensemble Prediction Score</span>
            <Link to="/members" className="text-teal-400 hover:underline">
              Search all {metrics.totalMembers} members &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Risk Component Comparison Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">Population Risk Component Vectors</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Population-wide mean scores across Health Diagnosis, Historical Utilization, and County-Level SDOH indicators
            </p>
          </div>
        </div>

        <RiskComponentBar breakdown={populationRiskBreakdown} />
      </div>
    </div>
  );
};
