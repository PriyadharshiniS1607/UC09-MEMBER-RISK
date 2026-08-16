import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Filter, 
  Plus, 
  CheckCircle2, 
  PlayCircle, 
  Activity, 
  Calendar, 
  ArrowRight,
  Flame,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { mockApiService } from '../services/api';
import { Intervention, InterventionStatus, InterventionPriority, Member } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';

export const Interventions: React.FC = () => {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<InterventionStatus | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<InterventionPriority | 'All'>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Intervention['type']>('Medication Adherence Outreach');
  const [newPriority, setNewPriority] = useState<InterventionPriority>('High');
  const [newDueDate, setNewDueDate] = useState('2026-08-25');
  const [newDescription, setNewDescription] = useState('');
  const [newAction, setNewAction] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [intvData, membersData] = await Promise.all([
          mockApiService.getInterventions({
            status: statusFilter,
            priority: priorityFilter,
          }),
          mockApiService.getMembers(),
        ]);
        setInterventions(intvData);
        setMembers(membersData);
        if (membersData.length > 0 && !selectedMemberId) {
          setSelectedMemberId(membersData[0].id);
        }
      } catch (err) {
        console.error('Error loading interventions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [statusFilter, priorityFilter]);

  const handleUpdateStatus = async (id: string, newStatus: InterventionStatus) => {
    try {
      const updated = await mockApiService.updateInterventionStatus(id, newStatus);
      if (updated) {
        setInterventions((prev) =>
          prev.map((item) => (item.id === id ? updated : item))
        );
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMember = members.find((m) => m.id === selectedMemberId);
    if (!targetMember) return;

    setSubmitting(true);
    try {
      const created = await mockApiService.createIntervention({
        memberId: targetMember.id,
        memberName: `${targetMember.firstName} ${targetMember.lastName}`,
        memberCode: targetMember.memberCode,
        memberRiskLevel: targetMember.riskSummary.riskLevel,
        title: newTitle,
        type: newType,
        priority: newPriority,
        status: 'In Progress',
        assignedTo: targetMember.assignedCareManager,
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
      console.error('Error dispatching intervention:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const urgentCount = interventions.filter((i) => i.priority === 'Urgent' || i.priority === 'High').length;
  const inProgressCount = interventions.filter((i) => i.status === 'In Progress').length;
  const completedCount = interventions.filter((i) => i.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Clinical Intervention Hub</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-teal-400 font-mono text-xs font-bold">
              {interventions.length} Tasks
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Orchestrate and track proactive multidisciplinary clinical actions to mitigate member readmission risks.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Intervention</span>
        </button>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-rose-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">Urgent / High Priority</p>
            <p className="text-2xl font-bold text-white font-mono mt-0.5">{urgentCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-sky-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider">In Active Outreach</p>
            <p className="text-2xl font-bold text-white font-mono mt-0.5">{inProgressCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400">
            <PlayCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">Completed Actions</p>
            <p className="text-2xl font-bold text-white font-mono mt-0.5">{completedCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-2">Status:</span>
          {(['All', 'Pending', 'In Progress', 'Completed', 'Deferred'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === status
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as InterventionPriority | 'All')}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent Priority</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Standard">Standard</option>
          </select>
        </div>
      </div>

      {/* Interventions List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Activity className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading clinical interventions...</p>
          </div>
        ) : interventions.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">No interventions found</h3>
            <p className="text-xs text-slate-400">Try changing the status or priority filters above.</p>
          </div>
        ) : (
          interventions.map((intv) => (
            <div
              key={intv.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                    {intv.type}
                  </span>
                  <StatusBadge priority={intv.priority} />
                  <StatusBadge status={intv.status} />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Due: <strong className="text-slate-300">{intv.dueDate}</strong></span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1 max-w-3xl">
                  <h3 className="text-base font-bold text-white">{intv.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{intv.description}</p>
                </div>

                {/* Member Tag */}
                <div className="shrink-0 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-teal-400 font-bold flex items-center justify-center text-xs">
                    {intv.memberName.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <Link
                      to={`/members/${intv.memberId}`}
                      className="text-xs font-bold text-white hover:text-teal-400 transition-colors flex items-center gap-1"
                    >
                      <span>{intv.memberName}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-400">{intv.memberCode}</span>
                      <RiskBadge level={intv.memberRiskLevel} size="sm" showIcon={false} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action and Resolution Details */}
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold">Immediate Protocol: </span>
                  <span className="text-slate-200">{intv.actionRequired}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {intv.status !== 'Completed' && (
                    <button
                      onClick={() => handleUpdateStatus(intv.id, 'Completed')}
                      className="px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Complete Task</span>
                    </button>
                  )}
                  {intv.status === 'Pending' && (
                    <button
                      onClick={() => handleUpdateStatus(intv.id, 'In Progress')}
                      className="px-3 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Start Outreach</span>
                    </button>
                  )}
                  <Link
                    to={`/members/${intv.memberId}`}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    title="View Member Details"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Interactive Modal: Create Intervention */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Population Health Intervention"
        subtitle="Initiate a targeted clinical protocol for a monitored member"
      >
        <form onSubmit={handleCreateIntervention} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Monitored Member
            </label>
            <select
              required
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} ({m.memberCode}) — {m.riskSummary.riskLevel} Risk (Score: {m.riskSummary.overallRiskScore})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Intervention Title
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. At-Home Chronic Kidney Disease & Vitals Assessment"
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
              Intervention Rationale
            </label>
            <textarea
              required
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Clinical reasoning and objectives..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Required Execution Step
            </label>
            <input
              type="text"
              required
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              placeholder="e.g. Schedule home care nurse visit for lab draw and adherence review"
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
