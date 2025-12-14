import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Trash2, Key } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Workers({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({ username: '', password: '', full_name: '', role: 'worker' });

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/users`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kullanıcı eklendi');
      setDialogOpen(false);
      setFormData({ username: '', password: '', full_name: '', role: 'worker' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kullanıcı eklenemedi');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/users/${selectedUser.id}`, { password: newPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Şifre değiştirildi');
      setPasswordDialogOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error) {
      toast.error('Şifre değiştirilemedi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kullanıcı silindi');
      fetchUsers();
    } catch (error) {
      toast.error('Kullanıcı silinemedi');
    }
  };

  const getRoleBadge = (role) => {
    const roles = {
      admin: { label: 'Yönetici', className: 'bg-primary/20 text-primary' },
      supervisor: { label: 'Ustabaşı', className: 'bg-blue-500/20 text-blue-400' },
      worker: { label: 'Eleman', className: 'bg-green-500/20 text-green-400' }
    };
    const config = roles[role];
    return <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${config.className}`}>{config.label}</span>;
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="workers-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Elemanlar</h1>
          <p className="text-muted-foreground mt-1">Tüm kullanıcıları yönetin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-user-button" className="gap-2 neon-glow-primary">
              <Plus className="w-4 h-4" />
              Yeni Kullanıcı
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Kullanıcı Adı</Label>
                <Input
                  data-testid="user-username-input"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Şifre</Label>
                <Input
                  data-testid="user-password-input"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input
                  data-testid="user-fullname-input"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger data-testid="user-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Yönetici</SelectItem>
                    <SelectItem value="supervisor">Ustabaşı</SelectItem>
                    <SelectItem value="worker">Eleman</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" data-testid="submit-user-button" className="w-full">Kaydet</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <Card key={user.id} data-testid={`user-item-${user.username}`} className="bg-card/50 backdrop-blur-md border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span>{user.full_name}</span>
                  {getRoleBadge(user.role)}
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="icon" 
                    variant="ghost"
                    data-testid={`change-password-${user.username}`}
                    onClick={() => {
                      setSelectedUser(user);
                      setPasswordDialogOpen(true);
                    }}
                  >
                    <Key className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    data-testid={`delete-user-${user.username}`}
                    onClick={() => handleDelete(user.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm text-muted-foreground">@{user.username}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Şifre Değiştir - {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label>Yeni Şifre</Label>
              <Input
                data-testid="new-password-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" data-testid="submit-password-button" className="w-full">Değiştir</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}