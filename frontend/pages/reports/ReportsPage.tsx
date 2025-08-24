import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { BarChart3, TrendingUp, PieChart, FileText, ArrowRight } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import apiClient from '@/lib/api-client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { CashflowReport } from '@/components/reports/CashflowReport';
import { BudgetReport } from '@/components/reports/BudgetReport';
import { NetWorthReport } from '@/components/reports/NetWorthReport';

interface Account {
  id: string;
  nama_akun: string;
}

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

const REPORTS: ReportConfig[] = [
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

const getDefaultDateRange = () => {
  const now = new Date();
  return {
    startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    today: now.toISOString().split('T')[0],
    startOfYear: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  };
};

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const dateRange = getDefaultDateRange();

  // Filter states
  const [cashflowFilters, setCashflowFilters] = useState({
    akun_id: 'all',
    tanggal_dari: dateRange.startOfMonth,
    tanggal_sampai: dateRange.today
  });
  
  const [budgetFilters, setBudgetFilters] = useState({
    bulan: new Date().getMonth() + 1,
    tahun: new Date().getFullYear()
  });
  
  const [netWorthFilters, setNetWorthFilters] = useState({
    tanggal_dari: dateRange.startOfYear,
    tanggal_sampai: dateRange.today
  });

  useEffect(() => {
    if (currentTenant) {
      loadAccounts();
    }
  }, [currentTenant]);

  const loadAccounts = async () => {
    if (!currentTenant) return;
    
    try {
      const response = await apiClient.akun.list({ tenant_id: currentTenant });
      setAccounts(Array.isArray(response.akun) ? response.akun : Array.isArray(response) ? response : []);
    } catch (error: any) {
      console.error('Failed to load accounts:', error);
      setAccounts([]);
    }
  };

  const generateReport = async (reportType: string) => {
    if (!currentTenant) return;
    
    setIsLoading(true);
    try {
      let response;
      let successMessage = '';
      
      switch (reportType) {
        case 'cashflow':
          response = await apiClient.laporan.laporanCashflow({
            tenant_id: currentTenant,
            akun_id: cashflowFilters.akun_id === 'all' ? '' : cashflowFilters.akun_id,
            tanggal_dari: cashflowFilters.tanggal_dari,
            tanggal_sampai: cashflowFilters.tanggal_sampai
          });
          successMessage = 'Laporan cashflow berhasil dibuat';
          break;
        case 'budget':
          response = await apiClient.laporan.laporanBudgetVsActual({
            tenant_id: currentTenant,
            tahun: budgetFilters.tahun,
            bulan: budgetFilters.bulan
          });
          successMessage = 'Laporan budget vs actual berhasil dibuat';
          break;
        case 'networth':
          response = await apiClient.laporan.laporanNetWorth({
            tenant_id: currentTenant,
            ...netWorthFilters
          });
          successMessage = 'Laporan net worth berhasil dibuat';
          break;
        default:
          throw new Error('Invalid report type');
      }
      
      setReportData(response);
      toast({
        title: successMessage,
        description: 'Data telah dianalisis',
      });
    } catch (error: any) {
      console.error(`Failed to generate ${reportType} report:`, error);
      toast({
        title: `Gagal membuat laporan ${reportType}`,
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat membuat laporan',
        variant: 'destructive',
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

  const renderFilters = () => {
    switch (activeReport) {
      case 'cashflow':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="akun_id" className="text-sm font-medium">Akun (Opsional)</Label>
              <Select value={cashflowFilters.akun_id} onValueChange={(value) => setCashflowFilters(prev => ({ ...prev, akun_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua akun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua akun</SelectItem>
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
                <Label htmlFor="tanggal_dari" className="text-sm font-medium">Dari</Label>
                <Input
                  id="tanggal_dari"
                  type="date"
                  value={cashflowFilters.tanggal_dari}
                  onChange={(e) => setCashflowFilters(prev => ({ ...prev, tanggal_dari: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggal_sampai" className="text-sm font-medium">Sampai</Label>
                <Input
                  id="tanggal_sampai"
                  type="date"
                  value={cashflowFilters.tanggal_sampai}
                  onChange={(e) => setCashflowFilters(prev => ({ ...prev, tanggal_sampai: e.target.value }))}
                />
              </div>
            </div>
            <Button onClick={() => generateReport('cashflow')} disabled={isLoading} className="w-full">
              {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Generate Cashflow
            </Button>
          </div>
        );
      case 'budget':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulan" className="text-sm font-medium">Bulan</Label>
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
                <Label htmlFor="tahun" className="text-sm font-medium">Tahun</Label>
                <Input
                  id="tahun"
                  type="number"
                  value={budgetFilters.tahun}
                  onChange={(e) => setBudgetFilters(prev => ({ ...prev, tahun: parseInt(e.target.value) || new Date().getFullYear() }))}
                />
              </div>
            </div>
            <Button onClick={() => generateReport('budget')} disabled={isLoading} className="w-full">
              {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Generate Budget
            </Button>
          </div>
        );
      case 'networth':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="networth_tanggal_dari" className="text-sm font-medium">Dari</Label>
                <Input
                  id="networth_tanggal_dari"
                  type="date"
                  value={netWorthFilters.tanggal_dari}
                  onChange={(e) => setNetWorthFilters(prev => ({ ...prev, tanggal_dari: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="networth_tanggal_sampai" className="text-sm font-medium">Sampai</Label>
                <Input
                  id="networth_tanggal_sampai"
                  type="date"
                  value={netWorthFilters.tanggal_sampai}
                  onChange={(e) => setNetWorthFilters(prev => ({ ...prev, tanggal_sampai: e.target.value }))}
                />
              </div>
            </div>
            <Button onClick={() => generateReport('networth')} disabled={isLoading} className="w-full">
              {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Generate Net Worth
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  const renderReport = () => {
    if (!reportData) return null;
    
    switch (activeReport) {
      case 'cashflow':
        return <CashflowReport reportData={reportData} formatCurrency={formatCurrency} />;
      case 'budget':
        return <BudgetReport reportData={reportData} formatCurrency={formatCurrency} budgetFilters={budgetFilters} />;
      case 'networth':
        return <NetWorthReport reportData={reportData} formatCurrency={formatCurrency} />;
      default:
        return null;
    }
  };

  if (activeReport) {
    const report = REPORTS.find(r => r.id === activeReport);
    if (!report) return null;

    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">{report.title}</h1>
              <p className="text-gray-600 text-sm sm:text-base truncate">{report.description}</p>
            </div>
            <Button variant="outline" onClick={resetReport} className="w-full sm:w-auto flex-shrink-0">
              ← Kembali
            </Button>
          </div>

          <div className="grid lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="lg:col-span-1 overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base sm:text-lg truncate">Filter & Generate</CardTitle>
                  <CardDescription className="text-sm truncate">Atur parameter laporan</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {renderFilters()}
              </CardContent>
            </Card>

            <div className="lg:col-span-3">
              {reportData ? (
                renderReport()
              ) : (
                <Card className="overflow-hidden">
                  <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500 text-sm sm:text-base">Generate laporan untuk melihat data</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Laporan</h1>
          <p className="text-gray-600 text-sm sm:text-base truncate">Analisis mendalam kondisi keuangan Anda</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {REPORTS.map((report) => (
            <Card 
              key={report.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
              onClick={() => setActiveReport(report.id)}
            >
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-xl ${report.color} shadow-lg flex-shrink-0`}>
                    <report.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg truncate">{report.title}</CardTitle>
                    <CardDescription className="text-sm truncate">{report.description}</CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <p className="text-sm text-gray-500 truncate">Klik untuk melihat laporan</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center">
              <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">💡 Tips Laporan</h3>
              <p className="text-blue-700 text-sm">
                Gunakan laporan ini untuk memahami pola keuangan Anda dan membuat keputusan yang lebih baik.
                Analisis rutin akan membantu mencapai tujuan finansial Anda.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}