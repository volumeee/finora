import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { BarChart3, TrendingUp, PieChart, FileText, ArrowRight, Download, Calendar } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import apiClient from '@/lib/api-client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface CashflowData {
  tanggal: string;
  pemasukan: number;
  pengeluaran: number;
  saldo_akhir: number;
}

interface BudgetVsActualData {
  kategori: string;
  budget: number;
  actual: number;
  variance: number;
  variance_percentage: number;
}

interface NetWorthData {
  tanggal: string;
  total_aset: number;
  total_liabilitas: number;
  net_worth: number;
}

interface Account {
  id: string;
  nama_akun: string;
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  
  // Filter states
  const [cashflowFilters, setCashflowFilters] = useState({
    akun_id: '',
    tanggal_dari: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    tanggal_sampai: new Date().toISOString().split('T')[0]
  });
  
  const [budgetFilters, setBudgetFilters] = useState({
    bulan: new Date().getMonth() + 1,
    tahun: new Date().getFullYear()
  });
  
  const [netWorthFilters, setNetWorthFilters] = useState({
    tanggal_dari: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    tanggal_sampai: new Date().toISOString().split('T')[0]
  });

  const { currentTenant } = useTenant();
  const { toast } = useToast();

  const reports = [
    {
      id: 'cashflow',
      title: 'Laporan Cashflow',
      description: 'Analisis arus kas masuk dan keluar',
      icon: TrendingUp,
      color: 'bg-blue-500'
    },
    {
      id: 'budget',
      title: 'Budget vs Actual',
      description: 'Perbandingan anggaran dengan realisasi',
      icon: BarChart3,
      color: 'bg-green-500'
    },
    {
      id: 'networth',
      title: 'Net Worth',
      description: 'Perkembangan kekayaan bersih',
      icon: PieChart,
      color: 'bg-purple-500'
    }
  ];

  useEffect(() => {
    if (currentTenant) {
      loadAccounts();
    }
  }, [currentTenant]);

  const loadAccounts = async () => {
    if (!currentTenant) return;
    
    try {
      const response = await apiClient.akun.list({ tenant_id: currentTenant });
      setAccounts(response.accounts || response || []);
    } catch (error: any) {
      console.error('Failed to load accounts:', error);
    }
  };

  const generateCashflowReport = async () => {
    if (!currentTenant) return;
    
    setIsLoading(true);
    try {
      const response = await apiClient.laporan.laporanCashflow({
        tenant_id: currentTenant,
        ...cashflowFilters
      });
      setReportData(response);
      toast({
        title: "Laporan cashflow berhasil dibuat",
        description: "Data cashflow telah dianalisis",
      });
    } catch (error: any) {
      console.error('Failed to generate cashflow report:', error);
      toast({
        title: "Gagal membuat laporan cashflow",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat membuat laporan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateBudgetReport = async () => {
    if (!currentTenant) return;
    
    setIsLoading(true);
    try {
      const response = await apiClient.laporan.laporanBudgetVsActual({
        tenant_id: currentTenant,
        ...budgetFilters
      });
      setReportData(response);
      toast({
        title: "Laporan budget vs actual berhasil dibuat",
        description: "Perbandingan budget telah dianalisis",
      });
    } catch (error: any) {
      console.error('Failed to generate budget report:', error);
      toast({
        title: "Gagal membuat laporan budget",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat membuat laporan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateNetWorthReport = async () => {
    if (!currentTenant) return;
    
    setIsLoading(true);
    try {
      const response = await apiClient.laporan.laporanNetWorth({
        tenant_id: currentTenant,
        ...netWorthFilters
      });
      setReportData(response);
      toast({
        title: "Laporan net worth berhasil dibuat",
        description: "Perkembangan kekayaan bersih telah dianalisis",
      });
    } catch (error: any) {
      console.error('Failed to generate net worth report:', error);
      toast({
        title: "Gagal membuat laporan net worth",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat membuat laporan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const resetReport = () => {
    setActiveReport(null);
    setReportData(null);
  };

  const renderCashflowFilters = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="akun_id">Akun (Opsional)</Label>
        <Select value={cashflowFilters.akun_id} onValueChange={(value) => setCashflowFilters(prev => ({ ...prev, akun_id: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Semua akun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua akun</SelectItem>
            {accounts.map(account => (
              <SelectItem key={account.id} value={account.id}>
                {account.nama_akun}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tanggal_dari">Tanggal Dari</Label>
          <Input
            id="tanggal_dari"
            type="date"
            value={cashflowFilters.tanggal_dari}
            onChange={(e) => setCashflowFilters(prev => ({ ...prev, tanggal_dari: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tanggal_sampai">Tanggal Sampai</Label>
          <Input
            id="tanggal_sampai"
            type="date"
            value={cashflowFilters.tanggal_sampai}
            onChange={(e) => setCashflowFilters(prev => ({ ...prev, tanggal_sampai: e.target.value }))}
          />
        </div>
      </div>
      <Button onClick={generateCashflowReport} disabled={isLoading} className="w-full">
        {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
        Generate Laporan Cashflow
      </Button>
    </div>
  );

  const renderBudgetFilters = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bulan">Bulan</Label>
          <Select value={budgetFilters.bulan.toString()} onValueChange={(value) => setBudgetFilters(prev => ({ ...prev, bulan: parseInt(value) }))}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih bulan" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {new Date(2024, i).toLocaleDateString('id-ID', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tahun">Tahun</Label>
          <Input
            id="tahun"
            type="number"
            value={budgetFilters.tahun}
            onChange={(e) => setBudgetFilters(prev => ({ ...prev, tahun: parseInt(e.target.value) || new Date().getFullYear() }))}
          />
        </div>
      </div>
      <Button onClick={generateBudgetReport} disabled={isLoading} className="w-full">
        {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
        Generate Laporan Budget vs Actual
      </Button>
    </div>
  );

  const renderNetWorthFilters = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="networth_tanggal_dari">Tanggal Dari</Label>
          <Input
            id="networth_tanggal_dari"
            type="date"
            value={netWorthFilters.tanggal_dari}
            onChange={(e) => setNetWorthFilters(prev => ({ ...prev, tanggal_dari: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="networth_tanggal_sampai">Tanggal Sampai</Label>
          <Input
            id="networth_tanggal_sampai"
            type="date"
            value={netWorthFilters.tanggal_sampai}
            onChange={(e) => setNetWorthFilters(prev => ({ ...prev, tanggal_sampai: e.target.value }))}
          />
        </div>
      </div>
      <Button onClick={generateNetWorthReport} disabled={isLoading} className="w-full">
        {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
        Generate Laporan Net Worth
      </Button>
    </div>
  );

  const renderCashflowReport = () => {
    if (!reportData?.data) return null;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Pemasukan</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(reportData.summary?.total_pemasukan || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Pengeluaran</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(reportData.summary?.total_pengeluaran || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Net Cashflow</p>
                <p className={`text-lg font-semibold ${
                  (reportData.summary?.net_cashflow || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(reportData.summary?.net_cashflow || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Detail Cashflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reportData.data.map((item: CashflowData, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded">
                  <span>{new Date(item.tanggal).toLocaleDateString('id-ID')}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">+{formatCurrency(item.pemasukan)}</span>
                    <span className="text-red-600">-{formatCurrency(item.pengeluaran)}</span>
                    <span className="font-medium">{formatCurrency(item.saldo_akhir)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderBudgetReport = () => {
    if (!reportData?.data) return null;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual - {budgetFilters.bulan}/{budgetFilters.tahun}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.data.map((item: BudgetVsActualData, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">{item.kategori}</h3>
                  <span className={`text-sm px-2 py-1 rounded ${
                    item.variance >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {item.variance >= 0 ? '+' : ''}{item.variance_percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Budget</p>
                    <p className="font-medium">{formatCurrency(item.budget)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Actual</p>
                    <p className="font-medium">{formatCurrency(item.actual)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Variance</p>
                    <p className={`font-medium ${
                      item.variance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Math.abs(item.variance))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderNetWorthReport = () => {
    if (!reportData?.data) return null;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Aset</p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatCurrency(reportData.summary?.total_aset || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Liabilitas</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(reportData.summary?.total_liabilitas || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Net Worth</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(reportData.summary?.net_worth || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Tren Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reportData.data.map((item: NetWorthData, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded">
                  <span>{new Date(item.tanggal).toLocaleDateString('id-ID')}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-blue-600">Aset: {formatCurrency(item.total_aset)}</span>
                    <span className="text-red-600">Liabilitas: {formatCurrency(item.total_liabilitas)}</span>
                    <span className="font-medium text-green-600">Net: {formatCurrency(item.net_worth)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (activeReport) {
    const report = reports.find(r => r.id === activeReport);
    if (!report) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={resetReport}>
            ← Kembali
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{report.title}</h1>
            <p className="text-gray-600">{report.description}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Filter & Generate</CardTitle>
              <CardDescription>Atur parameter laporan</CardDescription>
            </CardHeader>
            <CardContent>
              {activeReport === 'cashflow' && renderCashflowFilters()}
              {activeReport === 'budget' && renderBudgetFilters()}
              {activeReport === 'networth' && renderNetWorthFilters()}
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            {reportData ? (
              <div>
                {activeReport === 'cashflow' && renderCashflowReport()}
                {activeReport === 'budget' && renderBudgetReport()}
                {activeReport === 'networth' && renderNetWorthReport()}
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Generate laporan untuk melihat data</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Laporan</h1>
        <p className="text-gray-600">Analisis mendalam kondisi keuangan Anda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card 
            key={report.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setActiveReport(report.id)}
          >
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${report.color}`}>
                  <report.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Klik untuk melihat laporan</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
