import React from 'react';
import { InterventionStatus, InterventionPriority } from '../../types';
import { Clock, PlayCircle, CheckCircle, AlertOctagon, Flame } from 'lucide-react';

interface StatusBadgeProps {
  status?: InterventionStatus;
  priority?: InterventionPriority;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, priority }) => {
  if (status) {
    const config: Record<InterventionStatus, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
      'Pending': {
        bg: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
        text: 'Pending',
        icon: Clock,
      },
      'In Progress': {
        bg: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
        text: 'In Progress',
        icon: PlayCircle,
      },
      'Completed': {
        bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
        text: 'Completed',
        icon: CheckCircle,
      },
      'Deferred': {
        bg: 'bg-slate-500/10 border-slate-500/20 text-slate-300',
        text: 'Deferred',
        icon: AlertOctagon,
      },
    };

    const item = config[status] || config['Pending'];
    const Icon = item.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.bg}`}>
        <Icon className="w-3 h-3" />
        {item.text}
      </span>
    );
  }

  if (priority) {
    const pConfig: Record<InterventionPriority, { bg: string; text: string; icon?: React.ComponentType<{ className?: string }> }> = {
      'Urgent': {
        bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300 font-semibold',
        text: 'Urgent Priority',
        icon: Flame,
      },
      'High': {
        bg: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
        text: 'High Priority',
      },
      'Medium': {
        bg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
        text: 'Medium Priority',
      },
      'Standard': {
        bg: 'bg-slate-500/15 border-slate-500/30 text-slate-300',
        text: 'Standard',
      },
    };

    const item = pConfig[priority] || pConfig['Standard'];
    const Icon = item.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border ${item.bg}`}>
        {Icon && <Icon className="w-3 h-3" />}
        {item.text}
      </span>
    );
  }

  return null;
};
