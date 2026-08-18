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
  AlertTriangle,
  MapPin,
  Stethoscope
} from 'lucide-react';
import { apiService } from '../services/api';
import { Member, PopulationMetrics, User } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { RiskBadge } from '../components/common/RiskBadge';
import { USCountyRiskMap } from '../components/dashboard/USCountyRiskMap';
import { RiskCategoryBarChart } from '../components/dashboard/RiskCategoryBarChart';

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PopulationMetrics | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
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
      setMembers(membersData);
      // Top high-priority members (top 6 by risk score)
      setHighRiskMembers(membersData.slice(0, 6));
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
      const topFlagged = highRiskMembers.slice(0, 3).map((m) => ({
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
      setTimeout(() => setDigestState((prev) => ({ ...prev, message: null })), 6000);
    } catch (err: any) {
      console.error('Failed to send weekly digest:', err);
      setDigestState({
        sending: false,
        message: err?.response?.data?.detail || 'Failed to dispatch weekly digest notification.',
        isError: true,
      });
      setTimeout(() => setDigestState((prev) => ({ ...prev, message: null })), 6000);
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

  const isCareOrAdmin = currentUser?.role === 'care_manager' || currentUser?.role === 'payer_admin';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Executive Welcome & Action Header */}
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
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-in fade-in ${
            digestState.isError
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {digestState.isError ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{digestState.message}</span>
          </div>
          <button
            onClick={() => setDigestState((prev) => ({ ...prev, message: null }))}
            className="text-slate-400 hover:text-white p-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. RISK SUMMARY METRICS (Top Row KPI Cards)                  */}
      {/* ============================================================ */}
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
          trend={{ value: 'Urgent Priority', direction: 'up', isPositive: false }}
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
          trend={{ value: 'Cohort Mean', direction: 'neutral' }}
        />
      </div>

      {/* ============================================================ */}
      {/* VISUALIZATION GRID: 2. RISK DISTRIBUTION + 3. US COUNTY MAP */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 3. US COUNTY RISK MAP (Hero Visualization - 7 cols on lg, 8 cols on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          <USCountyRiskMap members={members} />
        </div>

        {/* 2. RISK CATEGORY DISTRIBUTION (Bar Chart - 5 cols on lg, 4 cols on xl) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
          <RiskCategoryBarChart metrics={metrics} />
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. HIGH-PRIORITY MEMBERS TABLE                               */}
      {/* ============================================================ */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 lg:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                High-Priority Members Cohort
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                Top Elevated Risk
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Highest-risk members identified by the stacking ensemble prediction pipeline.
            </p>
          </div>

          <Link
            to="/members"
            className="text-xs text-teal-400 hover:text-teal-300 font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto bg-teal-500/10 hover:bg-teal-500/20 px-3 py-1.5 rounded-lg border border-teal-500/30 transition-all"
          >
            <span>View All Members ({metrics.totalMembers})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* High-Priority Members Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                <th className="py-2.5 px-3.5">Member ID</th>
                <th className="py-2.5 px-3.5">County FIPS</th>
                <th className="py-2.5 px-3.5">Risk Category</th>
                <th className="py-2.5 px-3.5">Risk Score</th>
                <th className="py-2.5 px-3.5">Top Risk Driver</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {highRiskMembers.map((m) => {
                const topDriver = m.shapDrivers?.[0];
                const driverText = topDriver
                  ? `${topDriver.feature} (${topDriver.shapValue > 0 ? '+' : ''}${topDriver.shapValue.toFixed(2)})`
                  : m.riskSummary?.topDrivers?.[0]?.factor || 'Clinical Burden';

                return (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-white">
                      <Link
                        to={`/members/${m.id}`}
                        className="hover:text-teal-400 transition-colors font-mono"
                      >
                        {m.memberCode || m.id}
                      </Link>
                    </td>

                    <td className="py-3 px-3.5">
                      <span className="inline-flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                        <MapPin className="w-3 h-3 text-teal-400" />
                        {m.countyFips || m.rawBackendData?.county_fips || 'N/A'}
                      </span>
                    </td>

                    <td className="py-3 px-3.5">
                      <RiskBadge level={m.riskSummary?.riskLevel || 'High'} size="sm" />
                    </td>

                    <td className="py-3 px-3.5 font-mono font-bold text-teal-300">
                      {m.riskSummary?.overallRiskScore?.toFixed(1) ?? 'N/A'}
                      <span className="text-[10px] text-slate-500 font-normal"> / 100</span>
                    </td>

                    <td className="py-3 px-3.5 text-slate-300">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-[11px] font-mono text-teal-300 truncate max-w-xs">
                        <Stethoscope className="w-3 h-3 text-teal-400 shrink-0" />
                        <span className="truncate">{driverText}</span>
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <Link
                        to={`/members/${m.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-all"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info note */}
        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>Displaying top priority members from the current PostgreSQL cohort.</span>
          <Link to="/members" className="text-teal-400 hover:underline">
            View full registry ({metrics.totalMembers} total members) &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
