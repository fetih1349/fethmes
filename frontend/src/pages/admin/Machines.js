import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Machines({ token }) {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '' });

  const fetchMachines = async () => {
    try {
      const response = await axios.get(`${API_URL}/machines`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMachines(response.data);
    } catch (error) {
      toast.error('Makineler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/machines`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Makine eklendi');
      setDialogOpen(false);
      setFormData({ name: '', code: '' });
      fetchMachines();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Makine eklenemedi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu makineyi silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/machines/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Makine silindi');
      fetchMachines();
    } catch (error) {
      toast.error('Makine silinemedi');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="machines-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Makineler</h1>
          <p className="text-muted-foreground mt-1">Tüm makineleri yönetin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-machine-button" className="gap-2 neon-glow-primary">
              <Plus className="w-4 h-4" />
              Yeni Makine
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Yeni Makine Ekle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Makine Adı</Label>
                <Input
                  data-testid="machine-name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="örn: Torna 1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Makine Kodu</Label>
                <Input
                  data-testid="machine-code-input"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="örn: T001"
                  required
                />
              </div>
              <Button type="submit" data-testid="submit-machine-button" className="w-full">Kaydet</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.map((machine) => (
          <Card key={machine.id} data-testid={`machine-item-${machine.code}`} className="bg-card/50 backdrop-blur-md border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{machine.name}</span>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" data-testid={`delete-machine-${machine.code}`} onClick={() => handleDelete(machine.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm text-muted-foreground">Kod: {machine.code}</p>
              <p className="text-sm text-muted-foreground mt-2">Durum: {machine.status}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {machines.length === 0 && (
        <Card className="bg-card/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            Henüz makine eklenmemiş. "Yeni Makine" butonuna tıklayarak ekleyebilirsiniz.
          </CardContent>
        </Card>
      )}
    </div>
  );
}