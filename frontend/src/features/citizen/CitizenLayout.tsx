import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../../components/ui/button';
import { Bell, FileText, PlusCircle, LogOut } from 'lucide-react';
import { cn } from '../../utils/utils';
import janSevaLogo from '../../assets/jandhwani-logo.jpeg';

export function CitizenLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login?portal=citizen');
  };

  const navItems = [
    { label: 'Raise issue', href: '/citizen/submit', icon: PlusCircle },
    { label: 'Track', href: '/citizen/complaints', icon: FileText },
    { label: 'Notifications', href: '/citizen/notifications', icon: Bell },
  ];

  return (
      <div className="flex min-h-screen bg-[var(--background)]">
        {/* Sidebar for Desktop */}
        <aside className="hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex">
          <Link to="/" aria-label="JanDhwani home" className="flex h-16 items-center border-b border-[var(--border)] px-5">
            <img src={janSevaLogo} alt="JanDhwani" className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
            <nav className="flex-1 space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-white/10 text-white" 
                        : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            
            <div className="mt-auto border-t border-[var(--border)] pt-4">
              <div className="mb-4 flex flex-col px-3">
                <span className="text-sm font-medium text-white">{user?.name}</span>
                <span className="text-xs text-[var(--muted)]">{user?.email}</span>
              </div>
              <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile Header & Bottom Nav */}
        <div className="flex flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 md:hidden">
            <Link to="/" aria-label="JanDhwani home"><img src={janSevaLogo} alt="JanDhwani" className="h-8 w-auto object-contain" /></Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-400">
              <LogOut className="h-4 w-4" />
            </Button>
          </header>
          
          <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
            <Outlet />
          </main>

          {/* Mobile Bottom Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[var(--border)] bg-[var(--surface-strong)] p-2 backdrop-blur-lg md:hidden">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg p-2 text-xs font-medium transition-colors",
                    isActive ? "text-[var(--accent-strong)]" : "text-[var(--muted)]"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
  );
}
