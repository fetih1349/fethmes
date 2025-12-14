import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import Logo from '../components/Logo';
import { LogOut, Play, Pause, StopCircle, CheckCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function WorkerDashboard({ user, token, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [machines, setMachines] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentWorkLog, setCurrentWorkLog] = useState(null);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [completedQuantity, setCompletedQuantity] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [tasksRes, machinesRes, ordersRes] = await Promise.all([
        axios.get(`${API_URL}/tasks/worker/${user.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/machines`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/work-orders`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setTasks(tasksRes.data);
      setMachines(machinesRes.data);
      setWorkOrders(ordersRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [token, user.id]);

  const handleStartPrep = async () => {
    try {
      await axios.post(`${API_URL}/work-logs`, {
        task_id: selectedTask.id,
        event_type: 'prep_start'
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Ön hazırlık başlatıldı');
      setCurrentWorkLog({ type: 'prep_start', time: new Date() });
      fetchData();
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
      toast.success('Ön hazırlık tamamlandı');
      setCurrentWorkLog({ type: 'prep_end', time: new Date() });
      fetchData();
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
      setCurrentWorkLog({ type: 'work_start', time: new Date() });
      fetchData();
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
      setCurrentWorkLog({ type: 'work_pause', time: new Date() });
      fetchData();
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
      setCurrentWorkLog({ type: 'work_resume', time: new Date() });
      fetchData();
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
      setCurrentWorkLog(null);
      fetchData();
    } catch (error) {
      toast.error('Tamamlanamadı');
    }
  };

  const getMachineInfo = (machineId) => machines.find(m => m.id === machineId);
  const getWorkOrderInfo = (orderId) => workOrders.find(o => o.id === orderId);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Yükleniyor...</div>;
  }

  if (!selectedTask) {
    return (
      <div className="min-h-screen bg-background" data-testid="worker-dashboard">
        <nav className="border-b border-border glass-card">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <Logo size="sm" />
              <div className="flex items-center gap-4">
                <span className="text-lg font-mono font-bold">{user.full_name}</span>
                <Button onClick={onLogout} data-testid="logout-button" variant="ghost" size="sm" className="gap-2">
                  <LogOut className="w-4 h-4" />
                  Çıkış
                </Button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto p-6">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black tracking-tight mb-2">İş Seçimi</h1>
            <p className="text-muted-foreground text-lg">Yapacak olduğunuz işi seçin</p>
          </div>

          {tasks.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {tasks.map((task) => {
                const machine = getMachineInfo(task.machine_id);
                const workOrder = getWorkOrderInfo(task.work_order_id);
                return (
                  <Card 
                    key={task.id} 
                    data-testid={`task-option-${task.id}`}
                    className="bg-card/50 backdrop-blur-md border-white/5 cursor-pointer hover:border-primary/50 transition-all"
                    onClick={() => setSelectedTask(task)}
                  >
                    <CardContent className="p-8">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-3xl font-black mb-2">{workOrder?.part_name}</h3>
                          <p className="text-xl font-mono text-muted-foreground mb-4">{workOrder?.order_no}</p>
                          <div className="flex gap-6">
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Makine</p>
                              <p className="text-lg font-bold">{machine?.name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Adet</p>
                              <p className="text-lg font-bold font-mono">{task.quantity_assigned}</p>
                            </div>
                          </div>
                        </div>
                        <Button className="h-20 px-8 text-xl font-bold neon-glow-primary" data-testid={`select-task-${task.id}`}>
                          Seç
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-card/50">
              <CardContent className="py-16 text-center">
                <p className="text-2xl text-muted-foreground">Size atanmış iş bulunmuyor.</p>
                <p className="text-lg text-muted-foreground mt-2">Ustabaşınız size bir iş atamasını bekleyin.</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    );
  }

  const machine = getMachineInfo(selectedTask.machine_id);
  const workOrder = getWorkOrderInfo(selectedTask.work_order_id);

  return (
    <div className="min-h-screen bg-background" data-testid="work-control-panel">
      <nav className="border-b border-border glass-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Logo size="sm" />
            <div className="flex items-center gap-4">
              <span className="text-lg font-mono font-bold">{user.full_name}</span>
              <Button 
                onClick={() => {
                  setSelectedTask(null);
                  setCurrentWorkLog(null);
                }} 
                data-testid="back-button"
                variant="ghost" 
                size="sm"
              >
                Geri Dön
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="p-8">
            <h2 className="text-4xl font-black mb-4">{workOrder?.part_name}</h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">İş Emri</p>
                <p className="text-xl font-mono font-bold">{workOrder?.order_no}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Makine</p>
                <p className="text-xl font-bold">{machine?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Adet</p>
                <p className="text-xl font-mono font-bold">{selectedTask.quantity_assigned}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedTask.status === 'assigned' && (
          <div className="space-y-4">
            <h3 className="text-3xl font-black">Ön Hazırlık</h3>
            <Button 
              onClick={handleStartPrep} 
              data-testid="start-prep-button"
              className="w-full h-32 text-2xl font-bold neon-glow-primary gap-4"
            >
              <Play className="w-10 h-10" />
              Ön Hazırlığı Başlat
            </Button>
          </div>
        )}

        {selectedTask.status === 'preparation' && (
          <div className="space-y-4">
            <h3 className="text-3xl font-black">Ön Hazırlık Devam Ediyor</h3>
            <Button 
              onClick={handleEndPrep} 
              data-testid="end-prep-button"
              className="w-full h-32 text-2xl font-bold bg-green-600 hover:bg-green-700 gap-4"
            >
              <CheckCircle className="w-10 h-10" />
              Ön Hazırlık Tamamlandı
            </Button>
          </div>
        )}

        {selectedTask.status === 'in_progress' && (
          <div className="space-y-4">
            <h3 className="text-3xl font-black">Üretim Devam Ediyor</h3>
            <div className="grid grid-cols-1 gap-4">
              <Button 
                onClick={() => setPauseDialogOpen(true)} 
                data-testid="pause-work-button"
                className="h-24 text-2xl font-bold bg-yellow-600 hover:bg-yellow-700 gap-4"
              >
                <Pause className="w-8 h-8" />
                Durdur
              </Button>
              <Button 
                onClick={() => setCompleteDialogOpen(true)} 
                data-testid="complete-work-button"
                className="h-24 text-2xl font-bold bg-green-600 hover:bg-green-700 gap-4 neon-glow-destructive"
              >
                <CheckCircle className="w-8 h-8" />
                Bitir
              </Button>
            </div>
          </div>
        )}

        {selectedTask.status === 'paused' && (
          <div className="space-y-4">
            <h3 className="text-3xl font-black">Mola Veriliyor</h3>
            <Button 
              onClick={handleResumeWork} 
              data-testid="resume-work-button"
              className="w-full h-32 text-2xl font-bold neon-glow-primary gap-4"
            >
              <Play className="w-10 h-10" />
              Devam Et
            </Button>
          </div>
        )}

        {(selectedTask.status === 'assigned' || selectedTask.status === 'preparation') && (
          <div />
        )}

        {selectedTask.status === 'in_progress' && (
          <Button 
            onClick={handleStartWork} 
            data-testid="start-work-button"
            className="w-full h-32 text-2xl font-bold bg-green-600 hover:bg-green-700 gap-4"
            style={{ display: 'none' }}
          >
            <Play className="w-10 h-10" />
            Üretime Başla
          </Button>
        )}
      </main>

      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl">Mola Sebebi Seçin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={pauseReason} onValueChange={setPauseReason}>
              <SelectTrigger data-testid="pause-reason-select" className="h-14 text-lg">
                <SelectValue placeholder="Sebep seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="break">Mola</SelectItem>
                <SelectItem value="failure">Arıza</SelectItem>
                <SelectItem value="material_shortage">Ham Madde Eksikliği</SelectItem>
                <SelectItem value="toilet">Tuvalet</SelectItem>
                <SelectItem value="prayer">Namaz</SelectItem>
                <SelectItem value="meal">Yemek</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handlePauseWork} data-testid="confirm-pause-button" className="w-full h-14 text-lg">Onayla</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl">Tamamlanan Adet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-lg">Kaç adet tamamladınız? (Maks: {selectedTask.quantity_assigned})</Label>
              <Input
                data-testid="completed-quantity-input"
                type="number"
                max={selectedTask.quantity_assigned}
                value={completedQuantity}
                onChange={(e) => setCompletedQuantity(e.target.value)}
                className="h-14 text-xl font-mono"
                placeholder="örn: 50"
              />
            </div>
            <Button onClick={handleCompleteWork} data-testid="confirm-complete-button" className="w-full h-14 text-lg">Tamamla</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}