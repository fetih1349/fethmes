import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function WorkOrders({ token, user }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ order_no: '', part_name: '', quantity: '', description: '' });

  const fetchWorkOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/work-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkOrders(response.data);
    } catch (error) {
      toast.error('İş emirleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/work-orders`, {
        ...formData,
        quantity: parseInt(formData.quantity)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('İş emri eklendi');
      setDialogOpen(false);
      setFormData({ order_no: '', part_name: '', quantity: '', description: '' });
      fetchWorkOrders();
    } catch (error) {
      toast.error('İş emri eklenemedi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu iş emrini silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/work-orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('İş emri silindi');
      fetchWorkOrders();
    } catch (error) {
      toast.error('İş emri silinemedi');
    }
  };

  const getStatusBadge = (status) => {
    const statuses = {
      pending: { label: 'Bekliyor', className: 'bg-slate-500/20 text-slate-400' },
      assigned: { label: 'Atandı', className: 'bg-blue-500/20 text-blue-400' },
      in_progress: { label: 'Devam Ediyor', className: 'bg-yellow-500/20 text-yellow-400' },
      completed: { label: 'Tamamlandı', className: 'bg-green-500/20 text-green-400' },
      cancelled: { label: 'İptal', className: 'bg-red-500/20 text-red-400' }
    };
    const config = statuses[status];
    return <Badge className={`${config.className} font-mono text-xs`}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="work-orders-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight">İş Emirleri</h1>
          <p className="text-muted-foreground mt-1">Tüm iş emirlerini yönetin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-work-order-button" className="gap-2 neon-glow-primary">
              <Plus className="w-4 h-4" />
              Yeni İş Emri
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Yeni İş Emri Ekle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>İş Emri No</Label>
                <Input
                  data-testid="order-no-input"
                  value={formData.order_no}
                  onChange={(e) => setFormData({ ...formData, order_no: e.target.value })}
                  placeholder="örn: IS-2025-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Parça Adı</Label>
                <Input
                  data-testid="part-name-input"
                  value={formData.part_name}
                  onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
                  placeholder="örn: Mil"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Adet</Label>
                <Input
                  data-testid="quantity-input"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="örn: 100"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Açıklama (Opsiyonel)</Label>
                <Textarea
                  data-testid="description-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="İş emri detayları..."
                />
              </div>
              <Button type="submit" data-testid="submit-work-order-button" className="w-full">Kaydet</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workOrders.map((order) => (
          <Card key={order.id} data-testid={`work-order-item-${order.order_no}`} className="bg-card/50 backdrop-blur-md border-white/5">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{order.part_name}</CardTitle>
                  <p className="font-mono text-sm text-muted-foreground mt-1">{order.order_no}</p>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost"
                  data-testid={`delete-order-${order.order_no}`}
                  onClick={() => handleDelete(order.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Adet:</span>
                <span className="font-mono font-bold text-lg">{order.quantity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Durum:</span>
                {getStatusBadge(order.status)}
              </div>
              {order.description && (
                <p className="text-sm text-muted-foreground pt-2 border-t border-border">{order.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {workOrders.length === 0 && (
        <Card className="bg-card/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            Henüz iş emri eklenmemiş. "Yeni İş Emri" butonuna tıklayarak ekleyebilirsiniz.
          </CardContent>
        </Card>
      )}
    </div>
  );
}