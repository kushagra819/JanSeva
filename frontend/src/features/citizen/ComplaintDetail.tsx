import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { getGrievanceById, getGrievanceAnalysis, getGrievanceTimeline } from '../../api/grievances';
import type { Grievance, AIAnalysis, TimelineEvent } from '../../types';
import { format } from 'date-fns';
import { RefreshCw, AlertTriangle, CheckCircle, ShieldAlert, BrainCircuit, User, Settings, Info, MapPin } from 'lucide-react';
import { cn } from '../../utils/utils';
import { Button } from '../../components/ui/button';

export function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('new') === 'true';

  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [gData, aData, tData] = await Promise.all([
        getGrievanceById(id),
        getGrievanceAnalysis(id).catch(() => null), // Analysis might not exist yet or fail
        getGrievanceTimeline(id).catch(() => []), // Timeline might fail
      ]);
      setGrievance(gData);
      setAnalysis(aData);
      setTimeline(tData.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to load complaint details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED':
      case 'PROCESSING':
      case 'PENDING_REVIEW': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ROUTED': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'IN_PROGRESS': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'RESOLVED': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'REJECTED': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-orange-400';
      case 'EMERGENCY': return 'text-red-500';
      default: return 'text-[var(--success)]';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 text-[var(--accent)] animate-spin mb-4" />
        <p className="text-[var(--muted)]">Loading complaint details...</p>
      </div>
    );
  }

  if (error || !grievance) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="h-16 w-16 bg-[var(--danger)]/10 text-[var(--danger)] rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-medium text-white mb-2">Error Loading Details</h3>
        <p className="text-[var(--muted)] mb-6">{error || 'Complaint not found.'}</p>
        <Button onClick={fetchData} variant="secondary">Retry</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Success Banner if newly submitted */}
      {isNew && (
        <div className="bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-[var(--success)] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[var(--success)] font-medium">Grievance Submitted Successfully</h3>
            <p className="text-sm text-[var(--success)]/80 mt-1">Your tracking code is <strong>{grievance.trackingCode}</strong>. Our AI has already analyzed it and routed it to the appropriate department.</p>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">Tracking: {grievance.trackingCode}</h1>
            <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border", getStatusColor(grievance.status))}>
              {grievance.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-[var(--muted)] text-sm">
            Submitted on {format(new Date(grievance.createdAt), 'MMMM d, yyyy • h:mm a')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Complaint Details Card */}
          <div className="bg-[var(--surface-strong)] border border-[var(--border)] rounded-2xl p-6">
            <h2 className="text-lg font-medium text-white mb-4">Complaint Details</h2>
            <p className="text-white whitespace-pre-wrap">{grievance.description}</p>
            
            <div className="mt-6 pt-6 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Location</p>
                <div className="flex items-start gap-2 text-sm text-white">
                  <MapPin className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" />
                  <span>{grievance.locality}, {grievance.district}</span>
                </div>
              </div>
              {grievance.latitude && grievance.longitude && (
                <div>
                  <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Coordinates</p>
                  <p className="text-sm font-mono text-white">{grievance.latitude.toFixed(5)}, {grievance.longitude.toFixed(5)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Language</p>
                <p className="text-sm text-white">{grievance.language}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Channel</p>
                <p className="text-sm text-white">{grievance.channel}</p>
              </div>
            </div>
          </div>

          {/* AI Analysis Result */}
          {analysis && (
            <div className="bg-[var(--surface-strong)] border border-[var(--accent)]/30 rounded-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-[linear-gradient(180deg,var(--accent)_0%,var(--accent-ai)_100%)]"></div>
              
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <BrainCircuit className="h-5 w-5 text-[var(--accent-ai)]" />
                  <h2 className="text-lg font-medium text-white">AI Routing Suggestion</h2>
                </div>
                
                {analysis.requiresHumanReview && (
                  <div className="mb-6 bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-lg p-3 flex gap-3 text-sm text-[var(--warning)]">
                    <ShieldAlert className="h-5 w-5 shrink-0" />
                    <p><strong>Human Review Required:</strong> This grievance requires manual officer verification before processing.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Predicted Department</p>
                    <p className="text-sm font-medium text-white">{analysis.departmentCode.replace('_', ' ')}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      {Math.round(analysis.confidence * 100)}% confidence
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Predicted Category</p>
                    <p className="text-sm font-medium text-white">{analysis.taxonomyCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Priority</p>
                    <p className={cn("text-sm font-bold", getPriorityColor(analysis.priority))}>
                      {analysis.priority}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Routing Explanation</p>
                    <p className="text-sm text-white/90">{analysis.explanation}</p>
                  </div>
                  {(analysis.priority === 'HIGH' || analysis.priority === 'EMERGENCY') && (
                    <div>
                      <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Priority Explanation</p>
                      <p className="text-sm text-white/90">{analysis.priorityReason}</p>
                    </div>
                  )}
                </div>

                <details className="group cursor-pointer">
                  <summary className="text-xs text-[var(--accent)] font-medium list-none flex items-center gap-1 hover:text-[var(--accent-strong)]">
                    <Info className="h-3.5 w-3.5" />
                    Show technical details & alternative predictions
                  </summary>
                  <div className="mt-4 p-4 bg-[var(--background)] rounded-xl border border-[var(--border)] text-xs text-[var(--muted)] space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="font-medium">Provider:</span> {analysis.provider}</div>
                      <div><span className="font-medium">Model:</span> {analysis.modelVersion}</div>
                      <div><span className="font-medium">Decision:</span> {analysis.decision}</div>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Top Predictions:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        {analysis.topPredictions.map((pred, i) => (
                          <li key={i}>{pred.departmentCode} ({pred.taxonomyCode}): {Math.round(pred.confidence * 100)}%</li>
                        ))}
                      </ul>
                    </div>
                    <p className="italic text-white/40">Note: This is an AI recommendation, not a final government decision.</p>
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Timeline */}
        <div className="space-y-6">
          <div className="bg-[var(--surface-strong)] border border-[var(--border)] rounded-2xl p-6">
            <h2 className="text-lg font-medium text-white mb-6">Tracking Timeline</h2>
            
            {timeline.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No events recorded yet.</p>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--border)] before:to-transparent">
                {timeline.map((event) => {
                  const isCitizen = event.type === 'CITIZEN';
                  const isSystem = event.type === 'SYSTEM';
                  const Icon = isCitizen ? User : isSystem ? Settings : ShieldAlert;
                  
                  return (
                    <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      {/* Icon */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <Icon className={cn("h-4 w-4", isSystem && "text-[var(--accent-ai)]", isCitizen && "text-[var(--accent)]")} />
                      </div>
                      
                      {/* Content */}
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[var(--background)] p-4 rounded-xl border border-[var(--border)]">
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", getStatusColor(event.status))}>
                            {event.status.replace('_', ' ')}
                          </span>
                        </div>
                        <time className="text-xs text-[var(--muted)] block mb-2 font-mono">
                          {format(new Date(event.createdAt), 'MMM d, h:mm a')}
                        </time>
                        <div className="text-sm text-white/90">
                          {event.note || (
                            <span className="italic text-[var(--muted)]">
                              Status updated to {event.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
