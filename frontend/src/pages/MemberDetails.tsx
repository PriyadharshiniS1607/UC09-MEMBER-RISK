import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Activity, 
  AlertTriangle, 
  Plus, 
  Mail, 
  MapPin, 
  CheckCircle,
  Stethoscope,
  Hospital,
  Utensils,
  Info,
  X,
  Sparkles,
  ClipboardList,
  HeartPulse
} from 'lucide-react';
import { apiService } from '../services/api';
import { Member, Intervention, InterventionPriority, InterventionStatus, User } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { RiskComponentBar } from '../components/common/RiskComponentBar';
import { RiskDriverShapVisualizer } from '../components/common/RiskDriverShapVisualizer';

type MemberTab = 'overview' | 'clinical' | 'utilization' | 'shap' | 'sdoh' | 'interventions';

export const MemberDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<MemberTab>('overview');
  const [loading, setLoading] = useState(true);

  // Email Notification feedback state
  const [emailState, setEmailState] = useState<{ sending: boolean; feedback: string | null; isError: boolean }>({
    sending: false,
    feedback: null,
    isError: false,
  });

  // Modal State for scheduling intervention
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Intervention['type']>('Clinical');
  const [newPriority, setNewPriority] = useState<InterventionPriority>('High');
  const [newDueDate, setNewDueDate] = useState('2026-08-28');
  const [newDescription, setNewDescription] = useState('');
  const [newAction, setNewAction] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchMemberData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [memberData, intvData, user] = await Promise.all([
          apiService.getMemberById(id),
          apiService.getInterventions({ memberId: id }),
          apiService.getCurrentUser(),
        ]);

        setMember(memberData || null);
        setInterventions(intvData);
        setCurrentUser(user);
      } catch (err) {
        console.error('Error fetching member details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberData();
  }, [id]);

  const handleSendRiskAlertEmail = async () => {
    if (!member) return;
    setEmailState({ sending: true, feedback: null, isError: false });

    try {
      const shapPayload = member.shapDrivers.map(d => ({
        feature: d.feature,
        value: d.value,
        shap_value: d.shapValue,
        description: d.description,
      }));

      const res = await apiService.sendRiskAlertEmail({
        to_email: currentUser?.email || 'provider@healthfirst.org',
        provider_name: 'Primary Care Team',
        member_id: member.id,
        member_name: member.id,
        member_code: member.memberCode,
        age: member.age,
        gender: member.gender,
        risk_level: member.riskSummary.riskLevel,
        overall_score: Math.round(member.riskSummary.overallRiskScore),
        shap_drivers: shapPayload,
        portal_url: window.location.origin,
      });

      setEmailState({
        sending: false,
        feedback: res.message || 'Risk alert queued successfully.',
        isError: false,
      });
      setTimeout(() => setEmailState(prev => ({ ...prev, feedback: null })), 6000);
    } catch (err: any) {
      console.error('Email alert error:', err);
      setEmailState({
        sending: false,
        feedback: err?.response?.data?.detail || 'Failed to queue clinical risk email alert.',
        isError: true,
      });
      setTimeout(() => setEmailState(prev => ({ ...prev, feedback: null })), 6000);
    }
  };

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setSubmitting(true);
    try {
      const created = await apiService.createIntervention({
        memberId: member.id,
        memberName: member.id,
        memberCode: member.memberCode,
        memberRiskLevel: member.riskSummary.riskLevel,
        title: newTitle,
        type: newType,
        priority: newPriority,
        status: 'In Progress',
        assignedTo: 'Care Coordinator',
        dueDate: newDueDate,
        description: newDescription,
        actionRequired: newAction,
      });

      setInterventions([created, ...interventions]);
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Activity className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Loading member profile from database...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-12 text-center bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4 max-w-xl mx-auto mt-8">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Member Not Found</h3>
        <p className="text-xs text-slate-400">
          The requested member ID was not found in the cohort database.
        </p>
        <Link
          to="/members"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Registry</span>
        </Link>
      </div>
    );
  }

  const isCareOrAdmin = currentUser?.role === 'care_manager' || currentUser?.role === 'payer_admin';
  const raw = member.rawBackendData;

  const tabs: { id: MemberTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: HeartPulse },
    { id: 'clinical', label: 'Clinical Diagnoses', icon: Stethoscope },
    { id: 'utilization', label: 'Utilization & Gaps', icon: Hospital },
    { id: 'shap', label: 'SHAP Risk Drivers', icon: Sparkles },
    { id: 'sdoh', label: 'SDOH & Geography', icon: MapPin },
    { id: 'interventions', label: `Interventions (${interventions.length})`, icon: ClipboardList },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navigation Breadcrumb & Role Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to="/members"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Member Registry</span>
        </Link>

        <div className="flex items-center gap-2.5">
          {/* Email Alert Trigger (Permitted for care_manager and payer_admin) */}
          {isCareOrAdmin && (
            <button
              onClick={handleSendRiskAlertEmail}
              disabled={emailState.sending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5 text-rose-400" />
              <span>{emailState.sending ? 'Sending Alert...' : 'Dispatch Risk Alert Email'}</span>
            </button>
          )}

          {currentUser?.role !== 'payer_viewer' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Intervention</span>
            </button>
          )}
        </div>
      </div>

      {/* Email Feedback Banner */}
      {emailState.feedback && (
        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between animate-in fade-in ${
          emailState.isError
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            {emailState.isError ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
            <span>{emailState.feedback}</span>
          </div>
          <button
            onClick={() => setEmailState({ sending: false, feedback: null, isError: false })}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Member Demographics Compact Hero Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-800 text-teal-400 font-mono font-extrabold text-base flex items-center justify-center border border-slate-700 shrink-0">
              {member.id.replace(/^M0*/, '#')}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-extrabold text-white font-mono tracking-tight">
                  {member.id}
                </h1>
                <RiskBadge level={member.riskSummary.riskLevel} score={member.riskSummary.overallRiskScore} size="md" />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                <span>Age: <strong className="text-white">{member.age} yrs</strong></span>
                <span>&bull;</span>
                <span>Gender: <strong className="text-white">{member.gender}</strong></span>
                <span>&bull;</span>
                <span>County FIPS: <strong className="text-teal-300 font-mono">{member.countyFips}</strong></span>
                <span>&bull;</span>
                <span>State FIPS: <strong className="text-slate-300 font-mono">{member.stateFips}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-300 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-5">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Composite Risk</span>
              <span className="text-lg font-mono font-bold text-white">{member.riskSummary.overallRiskScore.toFixed(1)} / 100</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Diagnoses</span>
              <span className="text-lg font-mono font-bold text-teal-400">{member.vitals.chronicConditionCount} active</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Encounters</span>
              <span className="text-lg font-mono font-bold text-amber-400">{member.utilizationData.totalEncounters} total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT AREAS */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Domain Breakdown Vector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <h3 className="text-sm font-bold text-white">Risk Component Breakdown</h3>
            <RiskComponentBar breakdown={member.riskBreakdown} />
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-rose-400" /> Clinical Diagnosis Summary
              </span>
              <p className="text-xs text-slate-300">
                {member.chronicConditions.length > 0 
                  ? member.chronicConditions.map(c => c.name).join(', ')
                  : 'No chronic condition diagnoses recorded in cohort dataset.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Hospital className="w-4 h-4 text-amber-400" /> Utilization &amp; Gaps
              </span>
              <p className="text-xs text-slate-300">
                {member.utilizationData.hospitalizationsLast12m} Inpatient Admissions, {member.utilizationData.erVisitsLast12m} ED Visits, {member.utilizationData.medicationCount} Active Prescriptions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-400" /> SDOH Geospatial Vulnerability
              </span>
              <p className="text-xs text-slate-300">
                County FIPS {member.countyFips} &bull; SVI Index {member.sdohData.sviScore.toFixed(2)} ({member.sdohData.sviTier} Vulnerability).
              </p>
            </div>
          </div>

          {/* Top SHAP Drivers Preview */}
          <RiskDriverShapVisualizer drivers={member.shapDrivers} />
        </div>
      )}

      {/* TAB 2: CLINICAL */}
      {activeTab === 'clinical' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Chronic Clinical Conditions &amp; Diagnoses</h3>
            <span className="text-xs text-slate-400 font-mono">{member.vitals.chronicConditionCount} Diagnosed</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Type 2 Diabetes', active: member.vitals.diabetes, icd: 'E11.9' },
              { label: 'Hypertension', active: member.vitals.hypertension, icd: 'I10' },
              { label: 'Heart Disease (CHD)', active: member.vitals.heartDisease, icd: 'I25.1' },
              { label: 'COPD / Lower Respiratory', active: member.vitals.copd, icd: 'J44.9' },
              { label: 'Clinical Obesity', active: member.vitals.obesity, icd: 'E66.9' },
              { label: 'Malignant Neoplasm (Cancer)', active: member.vitals.cancer, icd: 'C80.1' },
            ].map((item) => (
              <div
                key={item.label}
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  item.active
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}
              >
                <div>
                  <span className="font-semibold block">{item.label}</span>
                  <span className="text-[10px] font-mono text-slate-500">ICD: {item.icd}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  item.active ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-500'
                }`}>
                  {item.active ? 'PRESENT' : 'NO'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: UTILIZATION */}
      {activeTab === 'utilization' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Healthcare Utilization &amp; Care Encounters</h3>
            <span className="text-xs text-slate-400 font-mono">Past 12 Months</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Encounters</span>
              <span className="text-2xl font-bold font-mono text-white block">{member.utilizationData.totalEncounters}</span>
              <span className="text-[10px] text-slate-400">All recorded visits</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Hospital Inpatient</span>
              <span className="text-2xl font-bold font-mono text-rose-400 block">{member.utilizationData.hospitalizationsLast12m}</span>
              <span className="text-[10px] text-slate-400">Admissions past 12m</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">ED Visits</span>
              <span className="text-2xl font-bold font-mono text-amber-400 block">{member.utilizationData.erVisitsLast12m}</span>
              <span className="text-[10px] text-slate-400">Emergency department</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Medication Count</span>
              <span className="text-2xl font-bold font-mono text-teal-400 block">{member.utilizationData.medicationCount}</span>
              <span className="text-[10px] text-slate-400">Active prescriptions</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SHAP EXPLANATION */}
      {activeTab === 'shap' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <RiskDriverShapVisualizer drivers={member.shapDrivers} />
        </div>
      )}

      {/* TAB 5: SDOH GEOSPATIAL */}
      {activeTab === 'sdoh' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Social Determinants of Health (SDOH) Geographic Indicators</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                County-level environmental factors linked to member County FIPS code: <strong className="text-teal-300 font-mono">{member.countyFips}</strong>
              </p>
            </div>
          </div>

          {/* Context Disclaimer Notice */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-teal-500/30 text-xs text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong className="text-white font-semibold">Geospatial Context Disclosure: </strong>
              The indicators below reflect CDC Social Vulnerability Index (SVI), CDC PLACES community prevalence, and USDA Food Access metrics for the member's residential county FIPS ({member.countyFips}). They represent geographic environmental risk factors, not individual clinical measurements.
            </p>
          </div>

          {/* SDOH 3-Grid Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CDC SVI */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-purple-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-purple-400" /> CDC SVI Variables
              </span>
              <div className="space-y-1 font-mono text-[11px] text-slate-300">
                <div className="flex justify-between"><span>Poverty (EP_POV150):</span><strong>{raw?.ep_pov150 ?? 'N/A'}%</strong></div>
                <div className="flex justify-between"><span>Unemployment (EP_UNEMP):</span><strong>{raw?.ep_unemp ?? 'N/A'}%</strong></div>
                <div className="flex justify-between"><span>Uninsured (EP_UNINSUR):</span><strong>{raw?.ep_uninsur ?? 'N/A'}%</strong></div>
                <div className="flex justify-between"><span>Overall SVI (RPL_THEMES):</span><strong>{raw?.rpl_themes ?? 'N/A'}</strong></div>
              </div>
            </div>

            {/* CDC PLACES */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-teal-300 flex items-center gap-1.5">
                <Hospital className="w-4 h-4 text-teal-400" /> CDC PLACES County Health
              </span>
              <div className="space-y-1 font-mono text-[11px] text-slate-300">
                <div className="flex justify-between"><span>Diabetes Prev:</span><strong>{raw?.diabetes_adjprev ?? 'N/A'}%</strong></div>
                <div className="flex justify-between"><span>Obesity Prev:</span><strong>{raw?.obesity_adjprev ?? 'N/A'}%</strong></div>
                <div className="flex justify-between"><span>Smoking Prev:</span><strong>{raw?.csmoking_adjprev ?? 'N/A'}%</strong></div>
                <div className="flex justify-between"><span>High BP Prev:</span><strong>{raw?.bphigh_adjprev ?? 'N/A'}%</strong></div>
              </div>
            </div>

            {/* USDA Food Access */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-amber-400" /> USDA Food Access Atlas
              </span>
              <div className="space-y-1 font-mono text-[11px] text-slate-300">
                <div className="flex justify-between"><span>Low Food Access:</span><strong>{raw?.low_food_access_pct ?? 'N/A'}%</strong></div>
                <div className="flex justify-between"><span>No Vehicle Low Access:</span><strong>{raw?.no_vehicle_low_access_pct ?? 'N/A'}%</strong></div>
                <div className="flex justify-between"><span>Low Income Low Access:</span><strong>{raw?.low_income_low_access_pct ?? 'N/A'}%</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: INTERVENTIONS */}
      {activeTab === 'interventions' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Active &amp; Recommended Interventions</h3>
            {currentUser?.role !== 'payer_viewer' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Intervention</span>
              </button>
            )}
          </div>

          {interventions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <p>No active care interventions scheduled for member {member.id}.</p>
              {member.recommendedInterventions.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-left max-w-md mx-auto">
                  <span className="text-[11px] font-bold text-teal-300 block">Recommended Protocol:</span>
                  <p className="text-slate-300 text-xs mt-1">{member.recommendedInterventions[0].title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{member.recommendedInterventions[0].reason}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {interventions.map((intv) => (
                <div key={intv.id} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white text-sm">{intv.title}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge priority={intv.priority} />
                      <StatusBadge status={intv.status} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">{intv.description}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                    <span>Due: <strong className="text-slate-200">{intv.dueDate}</strong></span>
                    {intv.status !== 'Completed' && currentUser?.role !== 'payer_viewer' && (
                      <button
                        onClick={() => handleUpdateStatus(intv.id, 'Completed')}
                        className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule Intervention Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Schedule Intervention for ${member.id}`}
        subtitle="Initiate a targeted clinical or SDOH protocol"
      >
        <form onSubmit={handleCreateIntervention} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Intervention Protocol Title</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Tele-health Medication Review & Adherence Outreach"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Domain Category</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Standard">Standard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
            <input
              type="date"
              required
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description &amp; Rationale</label>
            <textarea
              required
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Clinical rationale or SDOH barrier context..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Action Required</label>
            <input
              type="text"
              required
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              placeholder="e.g. Schedule clinical assessment with designated care coordinator."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs disabled:opacity-50"
            >
              {submitting ? 'Scheduling...' : 'Save Intervention'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
