import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { getMyGrievances } from '../../api/grievances';
import type { Grievance } from '../../types';
import { Button } from '../../components/ui/button';
import { AlertTriangle, Clock, RefreshCw, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../utils/utils';

export function MyComplaints() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrievances = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMyGrievances();
      // Sort newest first
      setGrievances(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to load complaints. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGrievances();
  }, []);

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
      case 'EMERGENCY': return 'text-red-500 font-bold';
      default: return 'text-[var(--muted)]';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 text-[var(--accent)] animate-spin mb-4" />
        <p className="text-[var(--muted)]">Loading your complaints...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="h-16 w-16 bg-[var(--danger)]/10 text-[var(--danger)] rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-medium text-white mb-2">Failed to load</h3>
        <p className="text-[var(--muted)] mb-6">{error}</p>
        <Button onClick={fetchGrievances} variant="secondary">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (grievances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
        <div className="h-20 w-20 bg-[var(--surface-strong)] text-[var(--muted)] rounded-full flex items-center justify-center mb-6">
          <FileText className="h-10 w-10" />
        </div>
        <h3 className="text-xl font-medium text-white mb-2">No complaints yet</h3>
        <p className="text-[var(--muted)] mb-8">You haven't submitted any grievances yet. If you are facing an issue in your locality, let us know.</p>
        <Button href="/citizen/submit">
          Raise a Grievance
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">My Complaints</h1>
          <p className="text-[var(--muted)]">Track the status and progress of your submitted issues.</p>
        </div>
        <Button href="/citizen/submit" size="sm">
          New Grievance
        </Button>
      </div>

      <div className="grid gap-4">
        {grievances.map((g) => (
          <Link 
            key={g.id} 
            to={`/citizen/complaints/${g.id}`}
            className="block p-5 bg-[var(--surface-strong)] hover:bg-[var(--surface-soft)] border border-[var(--border)] rounded-2xl transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono px-2.5 py-1 bg-[var(--background)] border border-[var(--border)] rounded-md text-[var(--foreground)]">
                    {g.trackingCode}
                  </span>
                  <span className={cn("text-xs px-2.5 py-1 rounded-full border", getStatusColor(g.status))}>
                    {g.status.replace('_', ' ')}
                  </span>
                  {g.priority !== 'NORMAL' && (
                    <span className={cn("text-xs flex items-center gap-1", getPriorityColor(g.priority))}>
                      <AlertCircle className="h-3 w-3" />
                      {g.priority}
                    </span>
                  )}
                </div>
                
                <p className="text-white font-medium line-clamp-2">
                  {g.description}
                </p>
                
                <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(g.createdAt), 'MMM d, yyyy • h:mm a')}
                  </div>
                  {g.departmentCode && (
                    <div className="px-2 py-0.5 bg-white/5 rounded">
                      Dept: {g.departmentCode.replace('_', ' ')}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="shrink-0 text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-strong)] flex items-center">
                View Details &rarr;
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
