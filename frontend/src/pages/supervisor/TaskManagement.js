import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { User, Trash2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function TaskManagement({ token, user }) {
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState('');

  const fetchData = async () => {
    try {
      const [tasksRes, workersRes, machinesRes, ordersRes] = await Promise.all([
        axios.get(`${API_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/machines`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/work-orders`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setTasks(tasksRes.data.filter(t => t.status !== 'completed' && t.status !== 'cancelled'));
      setWorkers(workersRes.data.filter(u => u.role === 'worker'));
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
  }, [token]);

  const handleAssignWorker = async () => {
    if (!selectedWorker) return;
    try {
      await axios.put(`${API_URL}/tasks/${selectedTask.id}/assign-worker?worker_id=${selectedWorker}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Eleman atandı');
      setAssignDialogOpen(false);
      setSelectedTask(null);
      setSelectedWorker('');
      fetchData();
    } catch (error) {
      toast.error('Eleman atanamadı');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Bu görevi geri çekmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Görev geri çekildi');
      fetchData();
    } catch (error) {
      toast.error('Görev geri çekilemedi');
    }
  };

  const getMachineInfo = (machineId) => machines.find(m => m.id === machineId);
  const getWorkerInfo = (workerId) => workers.find(w => w.id === workerId);
  const getWorkOrderInfo = (orderId) => workOrders.find(o => o.id === orderId);

  const getStatusBadge = (status) => {
    const statuses = {
      assigned: { label: 'Atanmış', className: 'bg-blue-500/20 text-blue-400' },
      preparation: { label: 'Ön Hazırlık', className: 'bg-yellow-500/20 text-yellow-400' },
      in_progress: { label: 'Devam Ediyor', className: 'bg-green-500/20 text-green-400' },
      paused: { label: 'Duraklatmış', className: 'bg-orange-500/20 text-orange-400' }
    };
    const config = statuses[status];
    return <Badge className={`${config.className} font-mono text-xs`}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="task-management">
      <div>
        <h1 className="text-4xl font-black tracking-tight">Görev Yönetimi</h1>
        <p className="text-muted-foreground mt-1">Atanan görevleri yönetin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => {
          const machine = getMachineInfo(task.machine_id);
          const worker = getWorkerInfo(task.assigned_worker_id);
          const workOrder = getWorkOrderInfo(task.work_order_id);

          return (
            <Card key={task.id} data-testid={`task-${task.id}`} className="bg-card/50 backdrop-blur-md border-white/5">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{workOrder?.part_name}</CardTitle>
                    <p className="font-mono text-sm text-muted-foreground mt-1">{workOrder?.order_no}</p>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    data-testid={`delete-task-${task.id}`}
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Makine</p>
                  <p className="font-bold text-lg text-primary">{machine?.name}</p>
                  <p className="font-mono text-sm text-muted-foreground mt-1">Kod: {machine?.code}</p>
                </div>
                {task.current_worker_id && (() => {
                  const currentWorker = workers.find(w => w.id === task.current_worker_id);
                  return currentWorker && (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                      <p className="text-xs text-green-400 mb-1 font-semibold">AKTİF ÇALIŞAN</p>
                      <p className="font-bold text-lg text-green-400">{currentWorker.full_name}</p>
                    </div>
                  );
                })()}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Durum:</span>
                  {getStatusBadge(task.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Adet:</span>
                  <span className="font-mono font-bold">{task.quantity_assigned}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <Card className="bg-card/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            Henüz aktif görev yok.
          </CardContent>
        </Card>
      )}

      {/* Eleman ataması artık gerekli değil - eleman kendisi makineyi seçip işi alır */}
    </div>
  );
}