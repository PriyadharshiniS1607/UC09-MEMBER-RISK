import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  AlertTriangle, 
  ClipboardCheck, 
  Activity, 
  TrendingDown, 
  ArrowRight, 
  ShieldCheck, 
  HeartPulse, 
  UserCheck,
  UploadCloud
} from 'lucide-react';
import { mockApiService } from '../services/api';
import { Member, Intervention, PopulationMetrics } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PopulationMetrics | null>(null);
  const [highRiskMembers, setHighRiskMembers] = useState<Member[]>([]);
  const [recentInterventions, setRecentInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [metricsData, membersData, interventionsData] = await Promise.all([
          mockApiService.getPopulationMetrics(),
          mockApiService.getMembers({ riskLevel: 'High' }),
          mockApiService.getInterventions({ status: 'In Progress' }),
        ]);

        setMetrics(metricsData);
        setHighRiskMembers(membersData.slice(0, 4));
        setRecentInterventions(interventionsData.slice(0, 4));
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Activity className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Loading population risk intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 p-6 lg:p-8 border border-slate-800 shadow-xl overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-teal-500/5 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>UC09 Healthcare Risk Prediction Engine</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Population Health & Risk Executive Overview
            </h1>
            <p className="text-xs lg:text-sm text-slate-400 mt-1.5 max-w-2xl">
              Continuous real-time risk stratification and early intervention orchestration to curb avoidable hospital readmissions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 text-xs font-semibold border border-teal-500/30 transition-all shadow-sm"
            >
              <UploadCloud className="w-4 h-4 text-teal-400" />
              <span>Ingest CSV</span>
            </Link>
            <Link
              to="/members"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all shadow-sm"
            >
              <Users className="w-4 h-4 text-teal-400" />
              <span>Explore Members</span>
            </Link>
            <Link
              to="/interventions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Manage Interventions</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <MetricCard
          title="Total Monitored Members"
          value={metrics.totalMembers.toLocaleString()}
          subtitle="Across active Medicare & Commercial lines"
          icon={Users}
          accentColor="blue"
          trend={{ value: '+4.2% MoM', direction: 'up' }}
        />

        <MetricCard
          title="High Risk Population"
          value={`${metrics.highRiskCount} (${metrics.highRiskPercentage}%)`}
          subtitle="Identified for immediate clinical outreach"
          icon={AlertTriangle}
          accentColor="rose"
          progress={metrics.highRiskPercentage}
          trend={{ value: 'Urgent Priority', direction: 'up', isPositive: false }}
        />

        <MetricCard
          title="Active Interventions"
          value={metrics.activeInterventionsCount}
          subtitle={`${metrics.pendingInterventionsCount} pending dispatch`}
          icon={ClipboardCheck}
          accentColor="teal"
          progress={75}
          trend={{ value: '78% On-track', direction: 'up' }}
        />

        <MetricCard
          title="Mean Population Risk"
          value={`${metrics.averageRiskScore}/100`}
          subtitle={`Proj. Readmission Cut: -${metrics.projectedReadmissionReductionPct}%`}
          icon={HeartPulse}
          accentColor="amber"
          progress={metrics.averageRiskScore}
          trend={{ value: '-2.4 pts vs Q2', direction: 'down', isPositive: true }}
        />
      </div>

      {/* Risk Distribution Breakdown & Top Clinical Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Card */}
        <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Risk Stratification</h3>
                <p className="text-xs text-slate-400 mt-0.5">Cohort distribution breakdown</p>
              </div>
              <Activity className="w-5 h-5 text-teal-400" />
            </div>

            <div className="mt-6 space-y-4">
              {/* High Risk */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> High Risk
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Medium Risk
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Low Risk
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

          <div className="mt-6 pt-4 border-t border-slate-800 bg-slate-950/40 rounded-xl p-3 text-xs text-slate-400 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Targeting 15% reduction in high-risk escalations via proactive outreach.</span>
          </div>
        </div>

        {/* High Risk Members Quick Roster */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Urgent High-Risk Members</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-bold">Action Required</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Top prioritized members needing immediate clinical intervention</p>
            </div>
            <Link
              to="/members?risk=High"
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-800">
            {highRiskMembers.map((member) => (
              <div
                key={member.id}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/40 px-3 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-teal-400 font-bold flex items-center justify-center border border-slate-700 text-xs shrink-0">
                    {member.firstName[0]}{member.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/members/${member.id}`}
                        className="text-sm font-bold text-white hover:text-teal-400 transition-colors truncate"
                      >
                        {member.firstName} {member.lastName}
                      </Link>
                      <span className="text-[11px] font-mono text-slate-400">{member.memberCode}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {member.age} yo &bull; {member.gender} &bull; {member.chronicConditions.map((c) => c.name).join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <RiskBadge level={member.riskSummary.riskLevel} score={member.riskSummary.overallRiskScore} />
                  <Link
                    to={`/members/${member.id}`}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="View Clinical Profile"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Interventions Stream */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Active Care Interventions</h3>
            <p className="text-xs text-slate-400 mt-0.5">Currently assigned clinical tasks and follow-ups in progress</p>
          </div>
          <Link
            to="/interventions"
            className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
          >
            <span>Intervention Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentInterventions.map((intv) => (
            <div
              key={intv.id}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-teal-500/30 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                    {intv.type}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-1.5">{intv.title}</h4>
                </div>
                <StatusBadge priority={intv.priority} />
              </div>

              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {intv.description}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-white">{intv.memberName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">Due {intv.dueDate}</span>
                  <StatusBadge status={intv.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
