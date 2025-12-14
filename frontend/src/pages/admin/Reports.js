import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, User } from 'lucide-react';
import * as XLSX from 'xlsx';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports({ token }) {
  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [selectedEndDate, setSelectedEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [workerReport, setWorkerReport] = useState(null);

  useEffect(() => {
    fetchWorkers();
  }, [token]);

  const fetchWorkers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const workersList = response.data.filter(u => u.role === 'worker');
      setWorkers(workersList);
    } catch (error) {
      console.error('Elemanlar yüklenemedi:', error);
    }
  };

  const handleFetchReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/reports/weekly?start_date=${selectedStartDate}&end_date=${selectedEndDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReportData(response.data);
      toast.success('Haftalık rapor yüklendi');
    } catch (error) {
      toast.error('Rapor yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!reportData) {
      toast.error('Önce rapor oluşturun');
      return;
    }

    const wb = XLSX.utils.book_new();
    
    const summaryData = [
      ['FETHMES - Haftalık Üretim Raporu', ''],
      ['Tarih Aralığı', `${selectedStartDate} - ${selectedEndDate}`],
      ['', ''],
      ['Toplam Olay Sayısı', reportData.total_logs],
      ['Toplam Üretim (Adet)', reportData.total_production],
      ['', ''],
      ['Mola Sebepleri', 'Sayı']
    ];

    Object.entries(reportData.pause_reasons || {}).forEach(([key, value]) => {
      const label = {
        break: 'Mola',
        failure: 'Arıza',
        material_shortage: 'Ham Madde Eksikliği',
        toilet: 'Tuvalet',
        prayer: 'Namaz',
        meal: 'Yemek'
      }[key] || key;
      summaryData.push([label, value]);
    });

    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws, 'Özet');

    if (reportData.logs && reportData.logs.length > 0) {
      const logsData = reportData.logs.map(log => ({
        'Tarih': new Date(log.timestamp).toLocaleString('tr-TR'),
        'Olay Tipi': log.event_type,
        'Duruş Sebebi': log.pause_reason || '-',
        'Üretilen Adet': log.quantity_completed || '-'
      }));
      const wsLogs = XLSX.utils.json_to_sheet(logsData);
      XLSX.utils.book_append_sheet(wb, wsLogs, 'Detaylar');
    }

    XLSX.writeFile(wb, `Fethmes_Haftalik_Rapor_${selectedStartDate}_${selectedEndDate}.xlsx`);
    toast.success('Excel dosyası indirildi');
  };

  const pauseReasonsData = reportData ? Object.entries(reportData.pause_reasons).map(([key, value]) => ({
    name: {
      break: 'Mola',
      failure: 'Arıza',
      material_shortage: 'Ham Madde Eksikliği',
      toilet: 'Tuvalet',
      prayer: 'Namaz',
      meal: 'Yemek'
    }[key] || key,
    value
  })) : [];

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div>
        <h1 className="text-4xl font-black tracking-tight">Raporlar</h1>
        <p className="text-muted-foreground mt-1">Haftalık raporları görüntüleyin ve Excel olarak indirin</p>
      </div>

      <Card className="bg-card/50 backdrop-blur-md border-white/5">
        <CardHeader>
          <CardTitle>Haftalık Rapor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label>Başlangıç Tarihi</Label>
              <Input
                data-testid="start-date-input"
                type="date"
                value={selectedStartDate}
                onChange={(e) => setSelectedStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Bitiş Tarihi</Label>
              <Input
                data-testid="end-date-input"
                type="date"
                value={selectedEndDate}
                onChange={(e) => setSelectedEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button 
                onClick={handleFetchReport} 
                data-testid="fetch-report-button"
                disabled={loading}
                className="neon-glow-primary"
              >
                {loading ? 'Yükleniyor...' : 'Rapor Getir'}
              </Button>
              {reportData && (
                <Button 
                  onClick={handleExportExcel} 
                  data-testid="export-excel-button"
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Excel İndir
                </Button>
              )}
            </div>
          </div>

          {reportData && (
            <div className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary/10 border-primary/30">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Toplam Olay</p>
                    <p className="text-4xl font-black font-mono text-primary" data-testid="total-logs">{reportData.total_logs}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Toplam Üretim</p>
                    <p className="text-4xl font-black font-mono text-green-400" data-testid="total-production">{reportData.total_production}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/10 border-blue-500/30">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Toplam Mola</p>
                    <p className="text-4xl font-black font-mono text-blue-400" data-testid="total-pauses">
                      {Object.values(reportData.pause_reasons).reduce((a, b) => a + b, 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {pauseReasonsData.length > 0 && (
                <Card className="bg-card/50 backdrop-blur-md border-white/5">
                  <CardHeader>
                    <CardTitle>Mola Sebepleri Dağılımı</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pauseReasonsData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pauseReasonsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!reportData && (
            <div className="text-center py-12 text-muted-foreground">
              Tarih aralığı seçip &quot;Rapor Getir&quot; butonuna tıklayarak haftalık rapor oluşturabilirsiniz.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}