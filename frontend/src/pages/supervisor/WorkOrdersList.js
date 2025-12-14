import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { ArrowRight } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function WorkOrdersList({ token, user }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formData, setFormData] = useState({ machine_id: '', quantity_assigned: '' });

  const fetchData = async () => {
    try {
      const [ordersRes, machinesRes] = await Promise.all([
        axios.get(`${API_URL}/work-orders`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/machines`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setWorkOrders(ordersRes.data.filter(o => o.status === 'pending' || o.status === 'assigned'));
      setMachines(machinesRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleAssignTask = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/tasks`, {
        work_order_id: selectedOrder.id,
        machine_id: formData.machine_id,
        quantity_assigned: parseInt(formData.quantity_assigned)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Görev atandı');
      setDialogOpen(false);
      setFormData({ machine_id: '', quantity_assigned: '' });
      setSelectedOrder(null);
      fetchData();
    } catch (error) {
      toast.error('Görev atanamadı');
    }
  };

  const getStatusBadge = (status) => {
    const statuses = {
      pending: { label: 'Bekliyor', className: 'bg-slate-500/20 text-slate-400' },
      assigned: { label: 'Atandı', className: 'bg-blue-500/20 text-blue-400' },
    };
    const config = statuses[status];
    return <Badge className={`${config.className} font-mono text-xs`}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="work-orders-list">
      <div>
        <h1 className="text-4xl font-black tracking-tight">Bekleyen İş Emirleri</h1>
        <p className="text-muted-foreground mt-1">Makinelere iş atayın</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workOrders.map((order) => (
          <Card key={order.id} data-testid={`work-order-${order.order_no}`} className="bg-card/50 backdrop-blur-md border-white/5">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{order.part_name}</CardTitle>
                  <p className="font-mono text-sm text-muted-foreground mt-1">{order.order_no}</p>
                </div>
                {getStatusBadge(order.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Adet:</span>
                <span className="font-mono font-bold text-lg">{order.quantity}</span>
              </div>
              {order.description && (
                <p className="text-sm text-muted-foreground pt-2 border-t border-border">{order.description}</p>
              )}
              <Dialog open={dialogOpen && selectedOrder?.id === order.id} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) setSelectedOrder(null);
              }}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full gap-2 neon-glow-primary" 
                    data-testid={`assign-task-${order.order_no}`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    Makineye Ata
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle>Görev Ata - {order.part_name}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAssignTask} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Makine Seç</Label>
                      <Select value={formData.machine_id} onValueChange={(value) => setFormData({ ...formData, machine_id: value })}>
                        <SelectTrigger data-testid="machine-select">
                          <SelectValue placeholder="Makine seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {machines.map((machine) => (
                            <SelectItem key={machine.id} value={machine.id}>
                              {machine.name} ({machine.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Atanacak Adet (Maks: {order.quantity})</Label>
                      <Input
                        data-testid="quantity-input"
                        type="number"
                        max={order.quantity}
                        value={formData.quantity_assigned}
                        onChange={(e) => setFormData({ ...formData, quantity_assigned: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" data-testid="submit-task-button" className="w-full">Ata</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>

      {workOrders.length === 0 && (
        <Card className="bg-card/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            Henüz bekleyen iş emri yok.
          </CardContent>
        </Card>
      )}
    </div>
  );
}