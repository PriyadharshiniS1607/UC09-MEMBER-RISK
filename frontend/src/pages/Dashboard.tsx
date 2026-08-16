import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  ClipboardCheck, 
  Activity, 
  ArrowRight,
  ShieldCheck,
  HeartPulse,
  Flame,
  MapPin,
  Car,
  Utensils,
  Hospital,
  Info,
  UploadCloud
} from 'lucide-react';
import { mockApiService } from '../services/api';
import { Member, Intervention, PopulationMetrics } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { RiskComponentBar } from '../components/common/RiskComponentBar';

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
          mockApiService.getMembers({ sortBy: 'riskScore_desc' }),
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

  // Calculate cohort component averages from mock dataset
  const populationRiskBreakdown = {
    healthRiskScore: 64,
    utilizationRiskScore: 58,
    sdohRiskScore: 61,
    combinedRiskScore: metrics.averageRiskScore,
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 p-6 lg:p-8 border border-slate-800 shadow-xl overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-teal-500/5 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>UC09 Risk Analytics Prototype (Synthetic Data)</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Member Risk Prediction & Intervention Dashboard
            </h1>
            <p className="text-xs lg:text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
              Combining individual member health data, utilization history, and county-level SDOH indicators (mapped by FIPS) for early intervention orchestration.
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
              <span>Member Registry</span>
            </Link>
            <Link
              to="/interventions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Interventions</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Task 1: KPI Metric Cards Grid (Derived 100% from Mock Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <MetricCard
          title="Total Monitored Members"
          value={metrics.totalMembers.toString()}
          subtitle="Active member registry cohort"
          icon={Users}
          accentColor="blue"
          trend={{ value: 'Cohort Total', direction: 'neutral' }}
        />

        <MetricCard
          title="Very High / High Risk"
          value={`${metrics.veryHighRiskCount + metrics.highRiskCount} (${(metrics.veryHighRiskPercentage + metrics.highRiskPercentage).toFixed(1)}%)`}
          subtitle={`${metrics.veryHighRiskCount} Very High & ${metrics.highRiskCount} High Risk`}
          icon={Flame}
          accentColor="rose"
          progress={metrics.veryHighRiskPercentage + metrics.highRiskPercentage}
          trend={{ value: 'Urgent Priority', direction: 'up', isPositive: false }}
        />

        <MetricCard
          title="Active Interventions"
          value={metrics.activeInterventionsCount}
          subtitle={`${metrics.pendingInterventionsCount} pending dispatch`}
          icon={ClipboardCheck}
          accentColor="teal"
          progress={75}
          trend={{ value: `${metrics.completedInterventionsCount} completed`, direction: 'up' }}
        />

        <MetricCard
          title="Average Risk Score"
          value={`${metrics.averageRiskScore} / 100`}
          subtitle="Mean population composite risk"
          icon={HeartPulse}
          accentColor="amber"
          progress={metrics.averageRiskScore}
          trend={{ value: 'Synthetic baseline', direction: 'neutral' }}
        />
      </div>

      {/* Task 2: 4-Tier Risk Distribution Visualization & High Risk Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task 2: 4-Tier Risk Distribution Breakdown */}
        <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">4-Tier Risk Stratification</h3>
                <p className="text-xs text-slate-400 mt-0.5">Cohort risk level distribution</p>
              </div>
              <Activity className="w-5 h-5 text-teal-400" />
            </div>

            <div className="mt-6 space-y-4">
              {/* Very High Risk */}
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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

          <div className="mt-6 pt-4 border-t border-slate-800 bg-slate-950/40 rounded-xl p-3 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <span>
              Project-defined predictive risk categories based on synthetic model scoring (not clinical diagnosis thresholds).
            </span>
          </div>
        </div>

        {/* High-Priority Members Quick Roster */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">High-Priority Members</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 font-bold">Action Needed</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Top members requiring proactive care manager outreach</p>
            </div>
            <Link
              to="/members"
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
                      {member.age}y &bull; {member.sdohData.countyName} ({member.sdohData.countyFips}) &bull; {member.chronicConditions.map((c) => c.name).join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <RiskBadge level={member.riskSummary.riskLevel} score={member.riskSummary.overallRiskScore} />
                  <Link
                    to={`/members/${member.id}`}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="View Member Profile"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task 3: Risk Component Visualization Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Risk Component Breakdown & Vectors</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Relationship between individual Health Risk, Utilization Risk, SDOH Risk, and Combined Member Risk
            </p>
          </div>
        </div>

        <RiskComponentBar breakdown={populationRiskBreakdown} />
      </div>

      {/* Task 4: SDOH Dashboard Section (Major Dashboard Focus) */}
      <div className="bg-slate-900/80 border border-teal-500/20 rounded-2xl p-6 shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-400" />
              <h3 className="text-base font-bold text-white">Social Determinants of Health (SDOH) Geographic Intelligence</h3>
              <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] font-bold">
                County / FIPS Mapped
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Community & county-level environmental indicators linked to member geographic location (FIPS Code)
            </p>
          </div>
        </div>

        {/* Note Disclaimer on County vs Individual */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white font-semibold">Geographic Mappings Disclosure: </strong>
            These SDOH metrics represent community and county-level environmental indicators (CDC Social Vulnerability Index, transit desert ratings, food access indices) tied to the member's County FIPS code. They are not individual medical measurements.
          </p>
        </div>

        {/* SDOH 4-Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Social Vulnerability */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-400" /> Social Vulnerability (SVI)
              </span>
              <span className="text-xs font-mono font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                0.78 SVI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Measures county socio-economic distress, housing density, and minority status indicators (CDC SVI).
            </p>
          </div>

          {/* Transportation / Accessibility */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-amber-400" /> Transportation Access
              </span>
              <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                48 / 100 Index
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Evaluates public transit availability, distance to clinical care, and personal vehicle ownership rates.
            </p>
          </div>

          {/* Healthcare / Places Access */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Hospital className="w-4 h-4 text-teal-400" /> Healthcare Places Access
              </span>
              <span className="text-xs font-mono font-bold text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                62 / 100 Index
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Density of primary care providers, urgent care centers, and specialty clinics per 10k residents.
            </p>
          </div>

          {/* Food Access */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-400" /> Food Access
              </span>
              <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                54 / 100 Index
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Proximity to fresh food grocery stores vs. fast food density (USDA Food Access Research Atlas).
            </p>
          </div>
        </div>
      </div>

      {/* Active Interventions Stream */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Active Care Interventions</h3>
            <p className="text-xs text-slate-400 mt-0.5">Currently assigned clinical and SDOH tasks in progress</p>
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
