import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle,
  Stethoscope,
  Hospital,
  Car,
  Utensils,
  Info,
  Activity
} from 'lucide-react';
import { apiService } from '../services/api';
import { Member, Intervention, InterventionPriority, InterventionStatus, MemberExplanation } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { RiskComponentBar } from '../components/common/RiskComponentBar';
import { RiskDriverShapVisualizer } from '../components/common/RiskDriverShapVisualizer';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';

export const MemberDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [explanation, setExplanation] = useState<MemberExplanation | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Intervention['type']>('Clinical');
  const [newPriority, setNewPriority] = useState<InterventionPriority>('High');
  const [newDueDate, setNewDueDate] = useState('2026-08-28');
  const [newDescription, setNewDescription] = useState('');
  const [newAction, setNewAction] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchMemberData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [memberData, explanationData, intvData] = await Promise.all([
        apiService.getMemberById(id),
        apiService.getMemberExplanation(id),
        apiService.getInterventions({ memberId: id }),
      ]);

      setMember(memberData);
      setExplanation(explanationData);
      setInterventions(intvData);
    } catch (err: any) {
      console.error('Error fetching member details:', err);
      setError('Unable to load member profile details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMemberData();
  }, [fetchMemberData]);

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setSubmitting(true);
    try {
      const created = await apiService.createIntervention({
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`,
        memberCode: member.memberCode,
        memberRiskLevel: member.riskSummary.riskLevel,
        title: newTitle,
        type: newType,
        priority: newPriority,
        status: 'In Progress',
        assignedTo: member.assignedCareManager,
        dueDate: newDueDate,
        description: newDescription,
        actionRequired: newAction,
      });

      setInterventions([created, ...interventions]);
      setMember((prev) => prev ? { ...prev, activeInterventionsCount: prev.activeInterventionsCount + 1 } : null);
      setIsModalOpen(false);

      // Reset form
      setNewTitle('');
      setNewDescription('');
      setNewAction('');
    } catch (err) {
      console.error('Error creating intervention:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatchRecommended = async (rec: Member['recommendedInterventions'][0]) => {
    if (!member) return;
    try {
      const created = await apiService.createIntervention({
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`,
        memberCode: member.memberCode,
        memberRiskLevel: member.riskSummary.riskLevel,
        title: rec.title,
        type: rec.category,
        priority: rec.priority,
        status: 'Pending',
        assignedTo: member.assignedCareManager,
        dueDate: '2026-08-25',
        description: rec.reason,
        actionRequired: `Initiate protocol for ${rec.title}`,
      });

      setInterventions([created, ...interventions]);
      setMember((prev) => prev ? { ...prev, activeInterventionsCount: prev.activeInterventionsCount + 1 } : null);
    } catch (err) {
      console.error('Error dispatching recommended intervention:', err);
    }
  };

  const handleUpdateStatus = async (intvId: string, newStatus: InterventionStatus) => {
    try {
      const updated = await apiService.updateInterventionStatus(intvId, newStatus);
      if (updated) {
        setInterventions((prev) =>
          prev.map((item) => (item.id === intvId ? updated : item))
        );
      }
    } catch (err) {
      console.error('Error updating intervention status:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingState
          message="Loading Comprehensive Member Profile..."
          subMessage="Retrieving clinical vitals, utilization telemetry, SDOH factors, and SHAP drivers"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <ErrorState
          title="Failed to Load Member"
          message={error}
          onRetry={fetchMemberData}
          actionText="Retry Member Load"
        />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto mt-12">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
          <Info className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Member Record Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          The requested member record (ID: <span className="font-mono text-teal-300">{id}</span>) could not be located in the population registry.
        </p>
        <div className="pt-2">
          <Link
            to="/members"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Member Directory</span>
          </Link>
        </div>
      </div>
    );
  }

  const topPriority: InterventionPriority = 
    member.riskSummary.riskLevel === 'Very High' ? 'Urgent' : 
    member.riskSummary.riskLevel === 'High' ? 'High' : 
    member.riskSummary.riskLevel === 'Medium' ? 'Medium' : 'Standard';

  // Use SHAP drivers from explanation endpoint or member object
  const shapDriversList = explanation?.risk_drivers || member.shapDrivers;

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/members"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Member Directory</span>
        </Link>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Intervention</span>
        </button>
      </div>

      {/* Member Demographics Hero Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 text-teal-400 font-extrabold text-xl flex items-center justify-center border border-slate-700 shadow-inner shrink-0">
              {member.firstName[0]}{member.lastName[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                  {member.firstName} {member.lastName}
                </h1>
                <RiskBadge level={member.riskSummary.riskLevel} score={member.riskSummary.overallRiskScore} size="lg" />
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  {member.enrollmentStatus}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                <span className="font-mono text-slate-300 font-bold">{member.memberCode}</span>
                <span>&bull;</span>
                <span>DOB: {member.dob} ({member.age} yrs)</span>
                <span>&bull;</span>
                <span>Gender: {member.gender}</span>
                <span>&bull;</span>
                <span className="text-teal-400 font-medium">FIPS: {member.sdohData.countyFips} ({member.sdohData.countyName}, {member.sdohData.state})</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 text-xs text-slate-300">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="w-3.5 h-3.5 text-teal-400" />
                <span>{member.contactNumber}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="w-3.5 h-3.5 text-teal-400" />
                <span>{member.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span className="truncate max-w-[200px]">{member.address}</span>
              </div>
            </div>
            <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Primary Care Physician</p>
              <p className="font-bold text-white">{member.primaryCarePhysician}</p>
              <p className="text-[11px] text-slate-400 uppercase font-semibold mt-1">Assigned Care Manager</p>
              <p className="font-bold text-teal-300">{member.assignedCareManager}</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION A — OVERALL PREDICTIVE RISK */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">Section A: Overall Predictive Risk Profile</h2>
            <p className="text-xs text-slate-400 mt-0.5">Composite score, project-defined tier, and component distribution</p>
          </div>
          <StatusBadge priority={topPriority} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Risk Score</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-extrabold font-mono text-white">
                  {member.riskSummary.overallRiskScore}
                </span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Last Assessed: {member.riskSummary.lastAssessedDate}</p>
            </div>
            <RiskBadge level={member.riskSummary.riskLevel} size="lg" />
          </div>

          <div className="md:col-span-2 p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-300">Risk Component Vectors</h4>
            <RiskComponentBar breakdown={member.riskBreakdown} compact={true} />
          </div>
        </div>
      </div>

      {/* SECTION B — HEALTH RISK & SECTION C — UTILIZATION RISK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section B — Health Risk */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-rose-400" />
              <h3 className="text-base font-bold text-white">Section B: Health Risk &amp; Vitals</h3>
            </div>
            <span className="text-xs font-mono text-rose-400 font-bold">Score: {member.riskBreakdown.healthRiskScore}/100</span>
          </div>

          {/* Vitals Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Clinical Telemetry Vitals</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Blood Pressure</span>
                <span className="text-sm font-mono font-bold text-white">{member.vitals.bloodPressure}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Heart Rate</span>
                <span className="text-sm font-mono font-bold text-white">{member.vitals.heartRateBpm} bpm</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">HbA1c</span>
                <span className="text-sm font-mono font-bold text-amber-400">{member.vitals.hba1c || 'N/A'}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">BMI</span>
                <span className="text-sm font-mono font-bold text-white">{member.vitals.bmi}</span>
              </div>
            </div>
          </div>

          {/* Chronic Conditions Roster */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Documented Chronic Diagnoses</h4>
            <div className="space-y-2">
              {member.chronicConditions.map((c, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-white">{c.name}</h5>
                    <span className="text-[10px] text-slate-400">Diagnosed: {c.diagnosedDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                      {c.icd10Code}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {c.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section C — Utilization Risk */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Section C: Utilization Risk</h3>
            </div>
            <span className="text-xs font-mono text-amber-400 font-bold">Score: {member.riskBreakdown.utilizationRiskScore}/100</span>
          </div>

          {/* Utilization Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400">12m Hospitalizations</span>
              <span className="text-2xl font-mono font-bold text-rose-400 block">{member.utilizationData.hospitalizationsLast12m}</span>
              <span className="text-[10px] text-slate-500">Inpatient admissions</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400">12m ER Visits</span>
              <span className="text-2xl font-mono font-bold text-amber-400 block">{member.utilizationData.erVisitsLast12m}</span>
              <span className="text-[10px] text-slate-500">Emergency department</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400">12m Outpatient Visits</span>
              <span className="text-2xl font-mono font-bold text-teal-400 block">{member.utilizationData.outpatientVisitsLast12m}</span>
              <span className="text-[10px] text-slate-500">Clinic appointments</span>
            </div>
          </div>

          {/* Admission & Readmission Risk Bars */}
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">30-Day Hospital Readmission Risk</span>
                <span className="font-mono font-bold text-rose-400">{member.riskSummary.hospitalAdmissionRiskPct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${member.riskSummary.hospitalAdmissionRiskPct}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">ED Emergency Visit Escalation Risk</span>
                <span className="font-mono font-bold text-amber-400">{member.riskSummary.edVisitRiskPct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${member.riskSummary.edVisitRiskPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SHAP VISUALIZATION ("Why is this member at risk?") */}
      <RiskDriverShapVisualizer drivers={shapDriversList} />

      {/* SECTION D — SDOH RISK */}
      <div className="bg-slate-900/80 border border-sky-500/30 rounded-2xl p-6 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sky-400" />
              <h3 className="text-base font-bold text-white">Section D: Social Determinants of Health (SDOH) Risk</h3>
              <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 text-[10px] font-bold">
                County FIPS: {member.sdohData.countyFips}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Mapped to {member.sdohData.countyName}, {member.sdohData.state} (FIPS {member.sdohData.countyFips})
            </p>
          </div>
          <span className="text-xs font-mono text-sky-400 font-bold">SDOH Risk Score: {member.riskBreakdown.sdohRiskScore}/100</span>
        </div>

        {/* Clear Geographic Disclosure Tag */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-white">County-Level Indicator Disclosure: </strong>
            These SDOH values reflect community and geographic census-block measurements associated with County FIPS {member.sdohData.countyFips}. They are not individual clinical vitals.
          </span>
        </div>

        {/* SDOH Breakdown 4 Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Social Vulnerability (SVI)</span>
              <span className="font-mono font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                {member.sdohData.sviScore} SVI ({member.sdohData.sviTier})
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              CDC Social Vulnerability Index for {member.sdohData.countyName}.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-amber-400" /> Transportation Access
              </span>
              <span className="font-mono font-bold text-amber-300">{member.sdohData.transportationAccessScore}/100</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {member.sdohData.transportationNotes}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Hospital className="w-3.5 h-3.5 text-teal-400" /> Healthcare Access
              </span>
              <span className="font-mono font-bold text-teal-300">{member.sdohData.healthcareAccessScore}/100</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {member.sdohData.healthcareAccessNotes}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-emerald-400" /> Food Access
              </span>
              <span className="font-mono font-bold text-emerald-300">{member.sdohData.foodAccessScore}/100</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {member.sdohData.foodAccessNotes}
            </p>
          </div>
        </div>
      </div>

      {/* RECOMMENDED INTERVENTIONS */}
      <div className="bg-slate-900/80 border border-teal-500/30 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Recommended Care Interventions</h3>
            <p className="text-xs text-slate-400 mt-0.5">Recommended protocols tailored to member risk profile</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {member.recommendedInterventions.map((rec) => (
            <div key={rec.id} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                    {rec.category}
                  </span>
                  <StatusBadge priority={rec.priority} />
                </div>
                <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{rec.reason}</p>
              </div>

              <button
                onClick={() => handleDispatchRecommended(rec)}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dispatch Intervention</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Linked Active Interventions Roster */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Active Intervention Plan</h3>
            <p className="text-xs text-slate-400">Assigned clinical actions for this member</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>

        {interventions.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            No active interventions currently assigned to this member.
          </div>
        ) : (
          <div className="space-y-3">
            {interventions.map((intv) => (
              <div
                key={intv.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                        {intv.type}
                      </span>
                      <StatusBadge priority={intv.priority} />
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1.5">{intv.title}</h4>
                  </div>
                  <StatusBadge status={intv.status} />
                </div>

                <p className="text-xs text-slate-400">{intv.description}</p>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <span className="text-slate-400 font-semibold">Immediate Action: </span>
                  <span className="text-slate-200">{intv.actionRequired}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400">Due: <strong className="text-slate-300">{intv.dueDate}</strong> &bull; Assigned: {intv.assignedTo}</span>
                  <div className="flex items-center gap-2">
                    {intv.status !== 'Completed' && (
                      <button
                        onClick={() => handleUpdateStatus(intv.id, 'Completed')}
                        className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <CheckCircle className="w-3 h-3" /> Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Modal: Assign Intervention */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Clinical Intervention"
        subtitle={`Dispatch care intervention for ${member.firstName} ${member.lastName}`}
      >
        <form onSubmit={handleCreateIntervention} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Intervention Title
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Telehealth Blood Pressure Review"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Intervention Category
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as Intervention['type'])}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Clinical">Clinical</option>
                <option value="Preventive Care">Preventive Care</option>
                <option value="Transportation / SDOH">Transportation / SDOH</option>
                <option value="Food Access / Community Support">Food Access / Community Support</option>
                <option value="Healthcare Access">Healthcare Access</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Priority Tier
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as InterventionPriority)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Urgent">Urgent Priority</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Standard">Standard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              required
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Clinical Rationale
            </label>
            <textarea
              required
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Rationale and objectives for care manager..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Immediate Action Required
            </label>
            <input
              type="text"
              required
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              placeholder="e.g. Schedule home care nurse visit for lab draw"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Dispatching...' : 'Dispatch Intervention'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MemberDetails;
