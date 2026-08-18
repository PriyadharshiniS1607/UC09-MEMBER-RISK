import React, { useEffect, useState } from 'react';
import { Mail, CheckCircle2, RefreshCw } from 'lucide-react';
import { apiService } from '../../services/api';
import { EmailLog } from '../../types';
import { Modal } from './Modal';

interface EmailActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailActivityModal: React.FC<EmailActivityModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await apiService.getEmailSentLogs();
      setLogs(data);
    } catch (err) {
      console.error('Error loading email logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Clinical Email Activity & Audit Logs"
      subtitle="Notification history generated from care alerts, weekly digests, and intervention workflows"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
          <span className="text-slate-400">
            Total Logged Events: <strong className="text-teal-300 font-mono">{logs.length}</strong>
          </span>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 text-[11px] font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Loading notification audit trail...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-2">
            <Mail className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No email notifications dispatched yet in this session.</p>
            <p className="text-[11px] text-slate-500">
              Dispatched risk alerts, intervention reminders, and weekly digests will appear here.
            </p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
            {logs.map((log, idx) => (
              <div
                key={log.id || idx}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-white block">{log.subject}</span>
                    <span className="text-[11px] text-teal-400 font-mono">To: {log.recipient}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Queued</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900 font-mono">
                  <span>Type: {log.type || 'Clinical Alert'}</span>
                  <span>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Just now'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
