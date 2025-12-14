import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import Logo from '../components/Logo';
import LiveMonitoring from './admin/LiveMonitoring';
import Machines from './admin/Machines';
import Workers from './admin/Workers';
import WorkOrders from './admin/WorkOrders';
import Reports from './admin/Reports';
import { LogOut, Activity, Settings, Users, Clipboard, BarChart3 } from 'lucide-react';

export default function AdminDashboard({ user, token, onLogout }) {
  const location = useLocation();

  const navItems = [
    { path: '/admin', label: 'Canlı İzleme', icon: Activity },
    { path: '/admin/machines', label: 'Makineler', icon: Settings },
    { path: '/admin/workers', label: 'Elemanlar', icon: Users },
    { path: '/admin/work-orders', label: 'İş Emirleri', icon: Clipboard },
    { path: '/admin/reports', label: 'Raporlar', icon: BarChart3 },
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
                <span className="ml-2 px-2 py-1 bg-primary/20 text-primary text-xs rounded font-semibold uppercase">Yönetici</span>
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
            <Route path="/" element={<LiveMonitoring token={token} />} />
            <Route path="/machines" element={<Machines token={token} />} />
            <Route path="/workers" element={<Workers token={token} />} />
            <Route path="/work-orders" element={<WorkOrders token={token} user={user} />} />
            <Route path="/reports" element={<Reports token={token} />} />
            <Route path="*" element={<Navigate to="/admin" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}