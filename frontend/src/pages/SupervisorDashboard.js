import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import Logo from '../components/Logo';
import WorkOrdersList from './supervisor/WorkOrdersList';
import TaskManagement from './supervisor/TaskManagement';
import { LogOut, Clipboard, Settings } from 'lucide-react';

export default function SupervisorDashboard({ user, token, onLogout }) {
  const location = useLocation();

  const navItems = [
    { path: '/supervisor', label: 'İş Emirleri', icon: Clipboard },
    { path: '/supervisor/tasks', label: 'Görev Yönetimi', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border glass-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Logo size="sm" />
            <div className="flex items-center gap-6">
              <span className="text-sm text-muted-foreground">
                <span className="font-mono">{user.full_name}</span>
                <span className="ml-2 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-semibold uppercase">Ustabaşı</span>
              </span>
              <Button 
                onClick={onLogout} 
                data-testid="logout-button"
                variant="ghost" 
                size="sm" 
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Çıkış
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 min-h-[calc(100vh-5rem)] border-r border-border glass-card p-4">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<WorkOrdersList token={token} user={user} />} />
            <Route path="/tasks" element={<TaskManagement token={token} user={user} />} />
            <Route path="*" element={<Navigate to="/supervisor" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}