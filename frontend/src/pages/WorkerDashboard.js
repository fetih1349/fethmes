import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import Logo from '../components/Logo';
import { LogOut, Play, Pause, CheckCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function WorkerDashboard({ user, token, onLogout }) {
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [workOrder, setWorkOrder] = useState(null);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [completedQuantity, setCompletedQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pauseElapsedTime, setPauseElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [pauseStartTime, setPauseStartTime] = useState(null);

  useEffect(() => {
    checkActiveTask();
  }, [token, user.id]);

  useEffect(() => {
    if (selectedTask && selectedTask.status !== 'assigned' && startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [selectedTask, startTime]);

  useEffect(() => {
    if (selectedTask && selectedTask.status === 'paused' && pauseStartTime) {
      const interval = setInterval(() => {
        setPauseElapsedTime(Math.floor((Date.now() - pauseStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [selectedTask, pauseStartTime]);

  const checkActiveTask = async () => {
    try {
      const response = await axios.get(`${API_URL}/tasks/worker/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const activeTasks = response.data.filter(t => 
        t.current_worker_id === user.id &&
        (t.status === 'preparation' || t.status === 'in_progress' || t.status === 'paused')
      );
      
      if (activeTasks.length > 0) {
        const task = activeTasks[0];
        setSelectedTask(task);
        
        const [machineRes, workOrderRes, logsRes] = await Promise.all([
          axios.get(`${API_URL}/machines`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/work-orders`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/work-logs/task/${task.id}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        const machine = machineRes.data.find(m => m.id === task.machine_id);
        const wo = workOrderRes.data.find(w => w.id === task.work_order_id);
        setSelectedMachine(machine);
        setWorkOrder(wo);
        
        const logs = logsRes.data;
        if (logs.length > 0) {
          const lastLog = logs[logs.length - 1];
          if (lastLog.event_type === 'prep_start' || lastLog.event_type === 'work_start' || lastLog.event_type === 'work_resume') {
            setStartTime(new Date(lastLog.timestamp).getTime());
          }
          if (lastLog.event_type === 'work_pause') {
            setPauseStartTime(new Date(lastLog.timestamp).getTime());
          }
        }
      } else {
        const machinesRes = await axios.get(`${API_URL}/machines`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMachines(machinesRes.data);
      }
    } catch (error) {
      toast.error('Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMachine = async (machine) => {
    try {
      const [tasksRes, ordersRes] = await Promise.all([
        axios.get(`${API_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/work-orders`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const machineTasks = tasksRes.data.filter(t => 
        t.machine_id === machine.id && 
        t.status === 'assigned' &&
        !t.current_worker_id
      );
      
      if (machineTasks.length === 0) {
        toast.error('Bu makinede boş iş yok');
        return;
      }
      
      const task = machineTasks[0];
      const wo = ordersRes.data.find(w => w.id === task.work_order_id);
      
      setSelectedMachine(machine);
      setSelectedTask(task);
      setWorkOrder(wo);
    } catch (error) {
      toast.error('İş yüklenemedi');
    }
  };

  const handleStartPrep = async () => {
    try {
      await axios.post(`${API_URL}/work-logs`, {
        task_id: selectedTask.id,
        event_type: 'prep_start'
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      await axios.put(`${API_URL}/tasks/${selectedTask.id}/claim-worker?worker_id=${user.id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Ön hazırlık başlatıldı');
      setSelectedTask({...selectedTask, status: 'preparation'});
      setStartTime(Date.now());
      setTimeout(() => checkActiveTask(), 500);
    } catch (error) {
      toast.error('Başlatılamadı');
    }
  };

  const handleEndPrep = async () => {
    try {
      await axios.post(`${API_URL}/work-logs`, {
        task_id: selectedTask.id,
        event_type: 'prep_end'
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Ön hazırlık tamamlandı - Üretime başlayabilirsiniz');
      setSelectedTask({...selectedTask, status: 'preparation'});
      setElapsedTime(0);
      setStartTime(null);
      setTimeout(() => checkActiveTask(), 500);
    } catch (error) {
      toast.error('Tamamlanamadı');
    }
  };

  const handleStartWork = async () => {
    try {
      await axios.post(`${API_URL}/work-logs`, {
        task_id: selectedTask.id,
        event_type: 'work_start'
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Üretim başlatıldı');
      setSelectedTask({...selectedTask, status: 'in_progress'});
      setStartTime(Date.now());
      setTimeout(() => checkActiveTask(), 500);
    } catch (error) {
      toast.error('Başlatılamadı');
    }
  };

  const handlePauseWork = async () => {
    if (!pauseReason) {
      toast.error('Mola sebebi seçiniz');
      return;
    }
    try {
      await axios.post(`${API_URL}/work-logs`, {
        task_id: selectedTask.id,
        event_type: 'work_pause',
        pause_reason: pauseReason
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Üretim durduruldu');
      setPauseDialogOpen(false);
      setPauseReason('');
      setSelectedTask({...selectedTask, status: 'paused'});
      setStartTime(null);
      setPauseStartTime(Date.now());
      setTimeout(() => checkActiveTask(), 500);
    } catch (error) {
      toast.error('Durdurulamadı');
    }
  };

  const handleResumeWork = async () => {
    try {
      await axios.post(`${API_URL}/work-logs`, {
        task_id: selectedTask.id,
        event_type: 'work_resume'
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Üretim devam ediyor');
      setStartTime(Date.now());
      setPauseStartTime(null);
      setPauseElapsedTime(0);
      checkActiveTask();
    } catch (error) {
      toast.error('Devam ettirilemedi');
    }
  };

  const handleCompleteWork = async () => {
    if (!completedQuantity || parseInt(completedQuantity) <= 0) {
      toast.error('Geçerli bir adet giriniz');
      return;
    }
    try {
      await axios.post(`${API_URL}/work-logs`, {
        task_id: selectedTask.id,
        event_type: 'work_complete',
        quantity_completed: parseInt(completedQuantity)
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Üretim tamamlandı');
      setCompleteDialogOpen(false);
      setCompletedQuantity('');
      setSelectedTask(null);
      setSelectedMachine(null);
      setWorkOrder(null);
      setElapsedTime(0);
      setPauseElapsedTime(0);
      setStartTime(null);
      setPauseStartTime(null);
      checkActiveTask();
    } catch (error) {
      toast.error('Tamamlanamadı');
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-2xl text-muted-foreground">Yükleniyor...</div>;
  }

  if (!selectedTask || !selectedMachine) {
    return (
      <div className="min-h-screen bg-background" data-testid="worker-dashboard">
        <nav className="border-b border-border glass-card">
          <div className="max-w-5xl mx-auto px-8">
            <div className="flex items-center justify-between h-24">
              <Logo size="md" />
              <div className="flex items-center gap-6">
                <span className="text-2xl font-mono font-bold">{user.full_name}</span>
                <Button onClick={onLogout} data-testid="logout-button" variant="ghost" size="lg" className="gap-2 text-lg">
                  <LogOut className="w-5 h-5" />
                  Çıkış
                </Button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-5xl mx-auto p-8">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-black tracking-tight mb-4">Makine Seçimi</h1>
            <p className="text-muted-foreground text-2xl">Hangi makinede çalışacaksınız?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {machines.map((machine) => (
              <Card 
                key={machine.id} 
                data-testid={`machine-option-${machine.code}`}
                className="bg-card/50 backdrop-blur-md border-2 border-white/5 cursor-pointer hover:border-primary/50 transition-all transform hover:scale-105"
                onClick={() => handleSelectMachine(machine)}
              >
                <CardContent className="p-12 text-center">
                  <h3 className="text-5xl font-black mb-4">{machine.name}</h3>
                  <p className="text-2xl font-mono text-muted-foreground mb-8">Kod: {machine.code}</p>
                  <Button className="w-full h-20 text-2xl font-bold neon-glow-primary" data-testid={`select-machine-${machine.code}`}>
                    Bu Makineyi Seç
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const statusLabels = {
    assigned: 'Hazır',
    preparation: 'Ön Hazırlık',
    in_progress: 'Üretim Yapılıyor',
    paused: 'Durakladı'
  };

  return (
    <div className="min-h-screen bg-background" data-testid="work-control-panel">
      <nav className="border-b border-border glass-card">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between h-24">
            <Logo size="md" />
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-lg font-mono font-bold">{user.full_name}</p>
                <p className="text-primary text-xl font-bold">{selectedMachine?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-8">
        <Card className="bg-primary/10 border-2 border-primary/30">
          <CardContent className="p-8">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Parça</p>
                <p className="text-3xl font-black">{workOrder?.part_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">İş Emri</p>
                <p className="text-2xl font-mono font-bold">{workOrder?.order_no}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Adet</p>
                <p className="text-3xl font-mono font-bold">{selectedTask.quantity_assigned}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-6">
          <div className="inline-block px-12 py-4 bg-secondary/50 rounded-2xl border-2 border-border">
            <p className="text-xl text-muted-foreground mb-2">Durum</p>
            <p className="text-4xl font-black text-primary">{statusLabels[selectedTask.status]}</p>
          </div>

          {(selectedTask.status === 'preparation' || selectedTask.status === 'in_progress') && (
            <div className="inline-block">
              <div className="text-8xl font-mono font-black text-primary" data-testid="elapsed-timer">
                {formatTime(elapsedTime)}
              </div>
              <p className="text-xl text-muted-foreground mt-2">Geçen Süre</p>
            </div>
          )}

          {selectedTask.status === 'paused' && (
            <div className="inline-block">
              <div className="text-8xl font-mono font-black text-yellow-500" data-testid="pause-timer">
                {formatTime(pauseElapsedTime)}
              </div>
              <p className="text-xl text-yellow-500 mt-2">Mola Süresi</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
          {selectedTask.status === 'assigned' && (
            <Button 
              onClick={handleStartPrep} 
              data-testid="start-prep-button"
              className="h-32 text-3xl font-black neon-glow-primary gap-6"
            >
              <Play className="w-12 h-12" />
              ÖN HAZIRLIĞI BAŞLAT
            </Button>
          )}

          {selectedTask.status === 'preparation' && (
            <>
              <Button 
                onClick={handleEndPrep} 
                data-testid="end-prep-button"
                className="h-32 text-3xl font-black bg-green-600 hover:bg-green-700 gap-6"
              >
                <CheckCircle className="w-12 h-12" />
                ÖN HAZIRLIĞI BİTİR
              </Button>
              <Button 
                onClick={handleStartWork} 
                data-testid="start-work-button"
                className="h-32 text-3xl font-black bg-primary hover:bg-primary/90 gap-6"
              >
                <Play className="w-12 h-12" />
                ÜRETİMİ BAŞLAT
              </Button>
            </>
          )}

          {selectedTask.status === 'in_progress' && (
            <>
              <Button 
                onClick={() => setPauseDialogOpen(true)} 
                data-testid="pause-work-button"
                className="h-32 text-3xl font-black bg-yellow-600 hover:bg-yellow-700 gap-6"
              >
                <Pause className="w-12 h-12" />
                ÜRETİMİ DURDUR
              </Button>
              <Button 
                onClick={() => setCompleteDialogOpen(true)} 
                data-testid="complete-work-button"
                className="h-32 text-3xl font-black bg-green-600 hover:bg-green-700 gap-6"
              >
                <CheckCircle className="w-12 h-12" />
                ÜRETİMİ BİTİR
              </Button>
            </>
          )}

          {selectedTask.status === 'paused' && (
            <Button 
              onClick={handleResumeWork} 
              data-testid="resume-work-button"
              className="h-32 text-3xl font-black neon-glow-primary gap-6"
            >
              <Play className="w-12 h-12" />
              ÜRETİME DEVAM ET
            </Button>
          )}
        </div>
      </main>

      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl">Durdurma Sebebi</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <Select value={pauseReason} onValueChange={setPauseReason}>
              <SelectTrigger data-testid="pause-reason-select" className="h-20 text-2xl">
                <SelectValue placeholder="Sebep seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="break" className="text-xl py-4">Mola</SelectItem>
                <SelectItem value="failure" className="text-xl py-4">Arıza</SelectItem>
                <SelectItem value="material_shortage" className="text-xl py-4">Ham Madde Eksikliği</SelectItem>
                <SelectItem value="toilet" className="text-xl py-4">Tuvalet</SelectItem>
                <SelectItem value="prayer" className="text-xl py-4">Namaz</SelectItem>
                <SelectItem value="meal" className="text-xl py-4">Yemek</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handlePauseWork} data-testid="confirm-pause-button" className="w-full h-20 text-2xl">Onayla</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl">Tamamlanan Adet</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-2xl">Kaç adet tamamladınız?</Label>
              <Input
                data-testid="completed-quantity-input"
                type="number"
                max={selectedTask.quantity_assigned}
                value={completedQuantity}
                onChange={(e) => setCompletedQuantity(e.target.value)}
                className="h-20 text-3xl font-mono text-center"
                placeholder="örn: 150"
              />
              <p className="text-center text-muted-foreground text-xl">Maksimum: {selectedTask.quantity_assigned}</p>
            </div>
            <Button onClick={handleCompleteWork} data-testid="confirm-complete-button" className="w-full h-20 text-2xl">Tamamla</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}