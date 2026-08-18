import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight, 
  Activity, 
  ShieldCheck, 
  FileText,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { apiService } from '../../services/api';
import { RagRecommendationResponse, RagRecommendation, Member } from '../../types';
import { generateInterventionPdf } from '../../utils/generateInterventionPdf';

interface RagRecommendationPanelProps {
  memberId: string;
  member?: Member | null;
  className?: string;
  onInterventionScheduled?: () => void;
}

export const RagRecommendationPanel: React.FC<RagRecommendationPanelProps> = ({
  memberId,
  member = null,
  className = '',
}) => {
  const [data, setData] = useState<RagRecommendationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});

  const fetchRecommendations = async () => {
    if (!memberId) return;
    setLoading(true);
    setError(null);
    setData(null); // Clear previous data so no stale recommendations show while loading
    try {
      const res = await apiService.getMemberRecommendations(memberId);
      setData(res);
    } catch (err: any) {
      console.error(`Failed to load recommendations for ${memberId}:`, err);
      const detail = err?.response?.data?.detail || err.message || 'Failed to fetch recommendations.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [memberId]);

  const toggleSources = (index: number) => {
    setExpandedSources((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // PDF report download
  const handleDownloadPdf = () => {
    if (!data) return;
    generateInterventionPdf(data, member);
  };

  const getPriorityStyle = (priority?: string) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'high' || p === 'urgent') {
      return {
        badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        card: 'border-rose-500/20 bg-slate-950/60',
        dot: 'bg-rose-500',
        text: 'text-rose-400',
      };
    }
    if (p === 'medium') {
      return {
        badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        card: 'border-amber-500/20 bg-slate-950/60',
        dot: 'bg-amber-500',
        text: 'text-amber-400',
      };
    }
    return {
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      card: 'border-emerald-500/20 bg-slate-950/60',
      dot: 'bg-emerald-500',
      text: 'text-emerald-400',
    };
  };

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-5 lg:p-6 shadow-xl space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              Evidence-Grounded RAG Clinical &amp; SDOH Recommendations
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Intervention guidance synthesized via FAISS medical guideline retrieval &amp; Gemini reasoning for member <strong className="text-teal-300 font-mono">{memberId}</strong>.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {data && data.recommendations?.length > 0 && (
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 hover:text-teal-200 border border-teal-500/30 text-xs font-semibold transition-all shadow-sm"
              title="Download natural-language PDF intervention report"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download Intervention Report</span>
            </button>
          )}

          <button
            onClick={fetchRecommendations}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-all disabled:opacity-50"
            title="Refresh recommendations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Analyzing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="py-12 text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <Activity className="w-12 h-12 text-teal-400 animate-spin" />
            <Sparkles className="w-5 h-5 text-teal-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Retrieving Evidence &amp; Generating Recommendations</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Querying FAISS clinical / SDOH knowledge vectors and evaluating member risk drivers...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-sm">Failed to Load Recommendations</h4>
              <p className="text-xs text-rose-300/90 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchRecommendations}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && (!data || !data.recommendations || data.recommendations.length === 0) && (
        <div className="py-10 text-center space-y-3 bg-slate-950/40 rounded-xl border border-slate-800">
          <FileText className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-xs font-semibold text-slate-300">No Recommendations Available</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No specific clinical or SDOH protocol triggers identified for this member. Ensure model predictions have been calculated.
          </p>
        </div>
      )}

      {/* Successful Content State */}
      {!loading && !error && data && data.recommendations && data.recommendations.length > 0 && (
        <div className="space-y-4">
          {/* Metadata Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                Source: <strong className="text-teal-300 font-mono uppercase">{data.source || 'RAG Engine'}</strong>
              </span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-slate-400">
                Status: <strong className="text-white font-mono">{data.status || 'ACTIVE'}</strong>
              </span>
              {data.intervention_id && (
                <>
                  <span className="text-slate-600">&bull;</span>
                  <span className="text-slate-400">
                    Intervention ID: <strong className="text-slate-300 font-mono">#{data.intervention_id}</strong>
                  </span>
                </>
              )}
            </div>

            <div className="text-slate-400 text-[11px]">
              {data.recommendations.length} Protocol{data.recommendations.length > 1 ? 's' : ''} Formulated
            </div>
          </div>

          {/* List of Recommendations */}
          <div className="space-y-4">
            {data.recommendations.map((rec: RagRecommendation, idx: number) => {
              const styles = getPriorityStyle(rec.priority);
              const title = rec.concept || rec.title || `Protocol: ${rec.feature || 'Clinical Intervention'}`;
              const hasSources = rec.evidence_sources && rec.evidence_sources.length > 0;
              const isExpanded = expandedSources[idx] ?? false;

              return (
                <div
                  key={idx}
                  className={`p-4 lg:p-5 rounded-xl border transition-all ${styles.card} space-y-3.5`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${styles.dot}`} />
                      <h4 className="font-bold text-white text-sm tracking-tight">{title}</h4>
                      {rec.domain && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-300 uppercase">
                          {rec.domain.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {rec.shap_impact !== undefined && (
                        <span className="px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[10px] font-mono font-semibold">
                          SHAP Impact: {rec.shap_impact > 0 ? '+' : ''}{rec.shap_impact.toFixed(2)}
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${styles.badge}`}>
                        {rec.priority || 'Standard'} Priority
                      </span>
                    </div>
                  </div>

                  {/* Target Driver Feature */}
                  {rec.feature && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Tag className="w-3 h-3 text-teal-400" />
                      <span>Target Risk Driver:</span>
                      <span className="font-mono font-bold text-teal-300">{rec.feature}</span>
                    </div>
                  )}

                  {/* Clinical & SDOH Rationale */}
                  {(rec.rationale || rec.description) && (
                    <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs space-y-1">
                      <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-[11px]">
                        <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                        Clinical &amp; SDOH Rationale:
                      </span>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        {rec.rationale || rec.description}
                      </p>
                    </div>
                  )}

                  {/* Recommended Action */}
                  {(rec.recommended_action || rec.action_required) && (
                    <div className="p-3 rounded-lg bg-teal-950/20 border border-teal-500/20 text-xs space-y-1">
                      <span className="font-semibold text-teal-300 flex items-center gap-1.5 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                        Recommended Action Plan:
                      </span>
                      <p className="text-slate-200 text-xs leading-relaxed">
                        {rec.recommended_action || rec.action_required}
                      </p>
                    </div>
                  )}

                  {/* Next Step / Follow-up */}
                  {rec.next_step && (
                    <div className="flex items-start gap-2 text-xs text-slate-300 pt-1">
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-300">Next Step: </strong>
                        <span>{rec.next_step}</span>
                      </div>
                    </div>
                  )}

                  {/* Grounded Evidence Basis / FAISS Sources */}
                  {hasSources && (
                    <div className="pt-2 border-t border-slate-800/70">
                      <button
                        onClick={() => toggleSources(idx)}
                        className="text-[11px] font-semibold text-slate-400 hover:text-teal-300 flex items-center gap-1.5 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                        <span>Supporting FAISS Medical / SDOH Evidence ({rec.evidence_sources?.length} source{rec.evidence_sources && rec.evidence_sources.length > 1 ? 's' : ''})</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 space-y-2 animate-in fade-in duration-150">
                          {rec.evidence_sources?.map((src, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] space-y-1 font-mono text-slate-300"
                            >
                              <div className="flex items-center justify-between text-teal-300 font-bold">
                                <span>{src.source || 'Medical Evidence Citation'}</span>
                                {src.score !== undefined && (
                                  <span className="text-[10px] text-slate-400">
                                    Sim: {(src.score * 100).toFixed(1)}%
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Doc: <strong className="text-slate-300">{src.document || src.chunk_id}</strong> &bull; Topic: {src.topic || src.domain || 'Guideline'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
