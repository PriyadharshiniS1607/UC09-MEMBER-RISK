import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Activity, 
  AlertTriangle, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle,
  Stethoscope,
  HeartPulse
} from 'lucide-react';
import { mockApiService } from '../services/api';
import { Member, Intervention, InterventionPriority, InterventionStatus } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';

export const MemberDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  // Intervention Creation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Intervention['type']>('Medication Adherence Outreach');
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
        const [memberData, intvData] = await Promise.all([
          mockApiService.getMemberById(id),
          mockApiService.getInterventions({ memberId: id }),
        ]);

        setMember(memberData || null);
        setInterventions(intvData);
      } catch (err) {
        console.error('Error fetching member details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberData();
  }, [id]);

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setSubmitting(true);
    try {
      const created = await mockApiService.createIntervention({
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

  const handleUpdateStatus = async (intvId: string, newStatus: InterventionStatus) => {
    try {
      const updated = await mockApiService.updateInterventionStatus(intvId, newStatus);
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
          <p className="text-xs text-slate-400">Loading comprehensive member profile...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Member Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          The requested member record could not be located in the current population registry.
        </p>
        <Link
          to="/members"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Members</span>
        </Link>
      </div>
    );
  }

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
          <span>Dispatch New Intervention</span>
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
                <span>Plan: {member.insurancePlan}</span>
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

      {/* Main Grid: Risk Stratification & Explanations + Vitals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Risk Summary & Clinical Probabilities */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Predictive Risk Profile</h3>
                <p className="text-xs text-slate-400">Model Stratification Assessment</p>
              </div>
              <Activity className="w-5 h-5 text-teal-400" />
            </div>

            {/* Score Big Display */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overall Risk Score</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-extrabold font-mono text-white">
                    {member.riskSummary.overallRiskScore}
                  </span>
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Assessed: {member.riskSummary.lastAssessedDate}
                </p>
              </div>
              <div className="text-right">
                <RiskBadge level={member.riskSummary.riskLevel} size="lg" />
              </div>
            </div>

            {/* Sub-Risk Categorical Bars */}
            <div className="space-y-3.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Hospital Readmission Risk</span>
                  <span className="font-mono font-bold text-rose-400">{member.riskSummary.hospitalAdmissionRiskPct}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${member.riskSummary.hospitalAdmissionRiskPct}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Emergency Dept. Visit Risk</span>
                  <span className="font-mono font-bold text-amber-400">{member.riskSummary.edVisitRiskPct}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${member.riskSummary.edVisitRiskPct}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Medication Non-Adherence Gap</span>
                  <span className="font-mono font-bold text-teal-400">{member.riskSummary.medicationAdherenceRiskPct}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${member.riskSummary.medicationAdherenceRiskPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Vitals Telemetry Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Clinical Vitals Telemetry</h3>
              </div>
              <span className="text-[11px] text-slate-400">Updated: {member.vitals.lastUpdated}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Blood Pressure</span>
                <span className="text-base font-mono font-bold text-white">{member.vitals.bloodPressure}</span>
                <span className="text-[10px] text-amber-400 block mt-0.5">Stage 2 Hypertension</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Heart Rate</span>
                <span className="text-base font-mono font-bold text-white">{member.vitals.heartRateBpm} <span className="text-xs text-slate-400">bpm</span></span>
                <span className="text-[10px] text-teal-400 block mt-0.5">Normal Sinus</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">HbA1c Level</span>
                <span className="text-base font-mono font-bold text-white">{member.vitals.hba1c || 'N/A'}%</span>
                <span className="text-[10px] text-rose-400 block mt-0.5">Poor Control (&gt; 8.0%)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">BMI</span>
                <span className="text-base font-mono font-bold text-white">{member.vitals.bmi}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">kg/m²</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Key Risk Drivers & Chronic Conditions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Risk Drivers / Explainability (Phase 1 Mock View) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Top Predictive Risk Drivers</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    Feature Impact Weights
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Primary contributing factors influencing overall risk elevation (Backend SHAP integration in Phase 2)
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {member.riskSummary.topDrivers.map((driver) => {
                const impactPct = Math.round(driver.impactWeight * 100);
                return (
                  <div
                    key={driver.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-teal-300 border border-slate-700">
                          {driver.category}
                        </span>
                        <h4 className="text-xs font-bold text-white">{driver.factor}</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          +{impactPct}% Impact
                        </span>
                        <span className="flex items-center text-[11px] text-slate-400">
                          {driver.trend === 'increasing' && <TrendingUp className="w-3.5 h-3.5 text-rose-400 mr-1" />}
                          {driver.trend === 'decreasing' && <TrendingDown className="w-3.5 h-3.5 text-emerald-400 mr-1" />}
                          {driver.trend === 'stable' && <Minus className="w-3.5 h-3.5 text-slate-400 mr-1" />}
                          {driver.trend}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed pl-1">
                      {driver.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chronic Conditions */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Documented Chronic Conditions</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">{member.chronicConditions.length} active diagnoses</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {member.chronicConditions.map((c, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-white truncate max-w-[200px]">{c.name}</h5>
                    <span className="font-mono text-[11px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                      {c.icd10Code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Severity: <strong className="text-slate-200">{c.severity}</strong></span>
                    <span>Diag: {c.diagnosedDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Linked Interventions Roster */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Intervention Care Management Plan</h3>
                <p className="text-xs text-slate-400">Assigned clinical actions for this member</p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            {interventions.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No interventions currently assigned to this member.
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
                      <span className="text-slate-400 font-semibold">Action Required: </span>
                      <span className="text-slate-200">{intv.actionRequired}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                      <span className="text-slate-400">Due: <strong className="text-slate-300">{intv.dueDate}</strong> &bull; Assigned: {intv.assignedTo}</span>
                      <div className="flex items-center gap-2">
                        {intv.status !== 'Completed' && (
                          <button
                            onClick={() => handleUpdateStatus(intv.id, 'Completed')}
                            className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle className="w-3 h-3" /> Mark Completed
                          </button>
                        )}
                        {intv.status === 'Pending' && (
                          <button
                            onClick={() => handleUpdateStatus(intv.id, 'In Progress')}
                            className="px-2.5 py-1 rounded bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 border border-sky-500/30 text-[11px] font-semibold transition-colors"
                          >
                            Start Outreach
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Modal: Assign Intervention */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Clinical Intervention"
        subtitle={`Dispatch proactive care intervention for ${member.firstName} ${member.lastName}`}
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
              placeholder="e.g. Telehealth Blood Pressure Titration Review"
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
                <option value="Medication Adherence Outreach">Medication Adherence Outreach</option>
                <option value="Diabetic Care Management">Diabetic Care Management</option>
                <option value="Telehealth Clinical Review">Telehealth Clinical Review</option>
                <option value="In-Home Nurse Visit">In-Home Nurse Visit</option>
                <option value="Cardiology Follow-Up">Cardiology Follow-Up</option>
                <option value="Social Determinants Support">Social Determinants Support</option>
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
              Clinical Description
            </label>
            <textarea
              required
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Clinical rationale and objectives for care manager..."
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
              placeholder="e.g. Confirm home delivery of BP tele-monitor cuff"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {submitting ? 'Dispatching...' : 'Dispatch Intervention'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
