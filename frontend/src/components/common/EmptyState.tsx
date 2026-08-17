import React from 'react';
import { LucideIcon, FolderSearch, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message?: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FolderSearch,
  title = 'No Records Found',
  message = 'No data is currently available for the selected criteria.',
  actionText,
  actionHref,
  onAction,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="p-6 text-center space-y-2 bg-slate-950/40 rounded-xl border border-slate-800">
        <Icon className="w-6 h-6 text-slate-500 mx-auto" />
        <p className="text-xs font-semibold text-white">{title}</p>
        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">{message}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 lg:p-12 text-center space-y-4 max-w-md mx-auto shadow-lg">
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto shadow-md">
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">{message}</p>
      </div>
      {(actionText && (actionHref || onAction)) && (
        <div className="pt-2">
          {actionHref ? (
            <Link
              to={actionHref}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 font-semibold text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{actionText}</span>
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{actionText}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
export default EmptyState;
