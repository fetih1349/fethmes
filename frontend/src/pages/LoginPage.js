import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import Logo from '../components/Logo';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, { username, password });
      const { token, user } = response.data;
      toast.success('Giriş başarılı!');
      onLogin(token, user);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleInitData = async () => {
    try {
      await axios.post(`${API_URL}/init-data`);
      toast.success('Demo veriler oluşturuldu! admin/admin123 ile giriş yapabilirsiniz.');
    } catch (error) {
      toast.info('Veriler zaten mevcut.');
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1720036236697-018370867320?crop=entropy&cs=srgb&fm=jpg&q=85" 
          alt="Factory Background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
      </div>

      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none grid-background"></div>

      <div className="relative z-10 w-full max-w-md p-8">
        <div className="glass-card rounded-2xl p-8 space-y-8">
          <div className="text-center">
            <Logo className="justify-center mb-4" size="lg" />
            <p className="text-muted-foreground text-sm mt-4">Endüstriyel İş Takip ve Yönetim Sistemi</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Kullanıcı Adı</Label>
              <Input
                id="username"
                data-testid="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-input/50 border-white/10 focus:border-primary focus:ring-primary/50 h-12"
                placeholder="admin"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Şifre</Label>
              <Input
                id="password"
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-input/50 border-white/10 focus:border-primary focus:ring-primary/50 h-12"
                placeholder="••••••••"
                required
              />
            </div>

            <Button 
              type="submit" 
              data-testid="login-button"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base uppercase tracking-wider neon-glow-primary"
              disabled={loading}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>

          <div className="pt-4 border-t border-white/10">
            <Button 
              type="button"
              onClick={handleInitData}
              data-testid="init-data-button"
              variant="ghost"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Demo Verileri Oluştur
            </Button>
            <p className="text-xs text-center text-muted-foreground/70 mt-2">
              Varsayılan: admin/admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}