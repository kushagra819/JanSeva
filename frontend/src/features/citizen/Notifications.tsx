import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { getNotifications, markNotificationAsRead } from '../../api/notifications';
import type { Notification } from '../../api/notifications';
import { Bell, Check, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../../components/ui/button';
import { cn } from '../../utils/utils';

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getNotifications();
      setNotifications(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to complaint if clicked
    e.stopPropagation();
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    for (const id of unreadIds) {
      try {
        await markNotificationAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      } catch (err) {
        console.error(`Failed to mark ${id} as read`, err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 text-[var(--accent)] animate-spin mb-4" />
        <p className="text-[var(--muted)]">Loading notifications...</p>
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
        <Button onClick={fetchNotifications} variant="secondary">Retry</Button>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Notifications</h1>
          <p className="text-[var(--muted)]">Updates on your grievances.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
            <Check className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
          <div className="h-20 w-20 bg-[var(--surface-strong)] text-[var(--muted)] rounded-full flex items-center justify-center mb-6">
            <Bell className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">All caught up</h3>
          <p className="text-[var(--muted)]">You don't have any notifications at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {notifications.map((n) => (
            <Link 
              key={n.id} 
              to={`/citizen/complaints/${n.grievanceId}`}
              className={cn(
                "block p-5 rounded-2xl border transition-colors relative",
                n.isRead 
                  ? "bg-[var(--surface-strong)] border-[var(--border)] hover:bg-[var(--surface-soft)]"
                  : "bg-[var(--accent)]/10 border-[var(--accent)]/30 hover:bg-[var(--accent)]/20"
              )}
            >
              {!n.isRead && (
                <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-[var(--accent)]"></div>
              )}
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="pr-6">
                  <h3 className={cn("text-base mb-1", n.isRead ? "text-white font-medium" : "text-white font-bold")}>
                    {n.title}
                  </h3>
                  <p className="text-sm text-white/80 mb-3">{n.message}</p>
                  
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[var(--muted)] font-mono">{format(new Date(n.createdAt), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
                
                <div className="shrink-0 flex items-center gap-2">
                  {!n.isRead && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="text-xs"
                    >
                      <Check className="mr-1.5 h-3 w-3" />
                      Mark read
                    </Button>
                  )}
                  <div className="text-[var(--accent)] flex items-center gap-1 text-sm font-medium">
                    View
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
