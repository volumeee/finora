import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, Calendar, TrendingUp, CreditCard, Wallet } from 'lucide-react';

interface CashflowReportProps {
  reportData: any;
  formatCurrency: (amount: number) => string;
}

export const CashflowReport: React.FC<CashflowReportProps> = ({ reportData, formatCurrency }) => {
  if (!reportData?.data_harian) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Total Pemasukan</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 truncate" title={formatCurrency(reportData.ringkasan?.total_pemasukan || 0)}>
              {formatCurrency(reportData.ringkasan?.total_pemasukan || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Total Pengeluaran</CardTitle>
            <CreditCard className="h-4 w-4 text-red-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 truncate" title={formatCurrency(reportData.ringkasan?.total_pengeluaran || 0)}>
              {formatCurrency(reportData.ringkasan?.total_pengeluaran || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Net Cashflow</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={`text-lg sm:text-xl lg:text-2xl font-bold truncate ${
              (reportData.ringkasan?.net_cashflow || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`} title={formatCurrency(reportData.ringkasan?.net_cashflow || 0)}>
              {(reportData.ringkasan?.net_cashflow || 0) >= 0 ? '+' : ''}{formatCurrency(reportData.ringkasan?.net_cashflow || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Rata-rata Harian</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold truncate" title={formatCurrency(reportData.ringkasan?.rata_rata_harian || 0)}>
              {formatCurrency(reportData.ringkasan?.rata_rata_harian || 0)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Period Info */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6 pt-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Periode Analisis</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4">
          <div className="text-sm text-muted-foreground">
            {typeof reportData.periode?.dari === 'string' ? reportData.periode.dari : new Date(reportData.periode?.dari || '').toLocaleDateString('id-ID')} - {typeof reportData.periode?.sampai === 'string' ? reportData.periode.sampai : new Date(reportData.periode?.sampai || '').toLocaleDateString('id-ID')}
          </div>
        </CardContent>
      </Card>
      
      {/* Top Categories */}
      {reportData.kategori_teratas && reportData.kategori_teratas.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg truncate flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Kategori Pengeluaran Teratas
              </CardTitle>
              <CardDescription className="text-sm truncate">
                Kategori dengan pengeluaran terbesar
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {reportData.kategori_teratas.map((kategori: any, index: number) => {
                const totalPengeluaran = reportData.ringkasan?.total_pengeluaran || 1;
                const percentage = (kategori.total_nominal / totalPengeluaran) * 100;
                return (
                  <div key={index} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <span className="font-medium text-sm sm:text-base truncate flex-1" title={kategori.nama_kategori}>
                        {kategori.nama_kategori}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-red-600 mb-2">
                      {formatCurrency(kategori.total_nominal)}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Daily Cashflow */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base sm:text-lg truncate flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Detail Cashflow Harian
            </CardTitle>
            <CardDescription className="text-sm truncate">
              Rincian arus kas harian selama periode analisis
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-2 sm:space-y-3 max-h-80 overflow-y-auto">
            {reportData.data_harian.map((item: any, index: number) => {
              const netDaily = item.pemasukan - item.pengeluaran;
              const isPositive = netDaily >= 0;
              
              return (
                <div key={index} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center gap-2 mb-2">
                    <span className="font-medium text-sm sm:text-base truncate flex-1">
                      {new Date(item.tanggal).toLocaleDateString('id-ID', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </span>
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      isPositive ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs sm:text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Masuk</p>
                      <p className="font-semibold text-green-600 truncate" title={formatCurrency(item.pemasukan)}>
                        +{formatCurrency(item.pemasukan)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Keluar</p>
                      <p className="font-semibold text-red-600 truncate" title={formatCurrency(item.pengeluaran)}>
                        -{formatCurrency(item.pengeluaran)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Net</p>
                      <p className={`font-semibold truncate ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`} title={formatCurrency(netDaily)}>
                        {isPositive ? '+' : ''}{formatCurrency(netDaily)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Saldo</p>
                      <p className="font-bold text-blue-600 truncate" title={formatCurrency(item.saldo_berjalan)}>
                        {formatCurrency(item.saldo_berjalan)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};