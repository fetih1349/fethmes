import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function LiveMonitoring({ token }) {
  const [machineStatus, setMachineStatus] = useState([]);
  const [workLogs, setWorkLogs] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchLiveStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/live-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMachineStatus(response.data);
      
      const logsMap = {};
      for (const item of response.data) {
        if (item.task) {
          try {
            const logsRes = await axios.get(`${API_URL}/work-logs/task/${item.task.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            logsMap[item.task.id] = logsRes.data;
          } catch (err) {
            console.error('Log yüklenemedi:', err);
          }
        }
      }
      setWorkLogs(logsMap);
    } catch (error) {
      console.error('Canlı durum yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      running: { label: 'Çalışıyor', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
      stopped: { label: 'Durmuş', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
      pause: { label: 'Mola', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
      idle: { label: 'Boşta', className: 'bg-slate-500/20 text-slate-400 border-slate-500/50' }
    };
    const config = statusConfig[status] || statusConfig.idle;
    return <Badge className={`${config.className} font-mono text-xs`} data-testid={`status-${status}`}>{config.label}</Badge>;
  };

  const getStatusDotClass = (status) => {
    const classes = {
      running: 'status-dot-running',
      stopped: 'status-dot-stopped',
      pause: 'status-dot-pause',
      idle: 'status-dot-idle'
    };
    return classes[status] || classes.idle;
  };

  const calculateDuration = (logs, task) => {
    if (!logs || logs.length === 0) return { phase: '', duration: '0:00' };
    
    const lastLog = logs[logs.length - 1];
    const startLog = logs.find(l => 
      l.event_type === 'prep_start' || l.event_type === 'work_start' || l.event_type === 'work_resume'
    );
    
    if (!startLog) return { phase: '', duration: '0:00' };
    
    const start = new Date(startLog.timestamp);
    const now = new Date();
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    let phase = '';
    if (task.status === 'preparation') phase = 'Ön Hazırlık';
    else if (task.status === 'in_progress') phase = 'Üretim';
    else if (task.status === 'paused') phase = 'Mola';
    
    return { 
      phase, 
      duration: `${diffMins}:${diffSecs.toString().padStart(2, '0')}`,
      startTime: start.toLocaleTimeString('tr-TR')
    };
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="live-monitoring">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Canlı İzleme</h1>
          <p className="text-muted-foreground mt-1">Makinelerin ve iş süreçlerinin anlık durumu</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Son Güncelleme</p>
          <p className="text-lg font-mono font-bold text-primary">{new Date().toLocaleTimeString('tr-TR')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machineStatus.map((item) => (
          <Card 
            key={item.machine.id} 
            data-testid={`machine-card-${item.machine.code}`}
            className="bg-card/50 backdrop-blur-md border-white/5 hover:border-primary/20 transition-all"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${getStatusDotClass(item.machine.status)}`}></div>
                  <CardTitle className="text-xl font-bold">{item.machine.name}</CardTitle>
                </div>
                {getStatusBadge(item.machine.status)}
              </div>
              <p className="text-sm font-mono text-muted-foreground mt-1">Kod: {item.machine.code}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {item.task ? (
                <>
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">İş Emri</p>
                    {item.work_order && (
                      <p className="font-mono font-bold text-sm">{item.work_order.order_no} - {item.work_order.part_name}</p>
                    )}
                  </div>
                  {(() => {
                    const logs = workLogs[item.task.id] || [];
                    const { phase, duration, startTime } = calculateDuration(logs, item.task);
                    const statusColors = {
                      'Ön Hazırlık': 'bg-blue-500/10 border-blue-500/30 text-blue-400',
                      'Üretim': 'bg-green-500/10 border-green-500/30 text-green-400',
                      'Mola': 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    };
                    const colorClass = statusColors[phase] || 'bg-primary/10 border-primary/30 text-primary';
                    
                    return (
                      <div className={`p-4 border-2 rounded-md ${colorClass}`}>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs font-semibold uppercase">AŞAMA</p>
                          {startTime && <p className="text-xs">Başlangıç: {startTime}</p>}
                        </div>
                        <p className="font-black text-2xl mb-2">{phase || 'Bekliyor'}</p>
                        {duration && <p className="font-mono font-black text-3xl">{duration}</p>}
                        {item.worker && (
                          <div className="mt-3 pt-3 border-t border-current/20">
                            <p className="text-xs uppercase font-semibold mb-1">OPERATÖR</p>
                            <p className="font-bold text-lg">{item.worker.full_name}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-accent/50 rounded">
                      <p className="text-xs text-muted-foreground">Atanan</p>
                      <p className="font-mono font-bold text-lg">{item.task.quantity_assigned}</p>
                    </div>
                    <div className="p-2 bg-accent/50 rounded">
                      <p className="text-xs text-muted-foreground">Tamamlanan</p>
                      <p className="font-mono font-bold text-lg text-green-500">{item.task.quantity_completed}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Atanmış iş yok
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {machineStatus.length === 0 && (
        <Card className="bg-card/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            Henüz makine eklenmemiş. "Makineler" bölümünden makine ekleyebilirsiniz.
          </CardContent>
        </Card>
      )}
    </div>
  );
}