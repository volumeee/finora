import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, PieChart, Calendar, Wallet, Target } from 'lucide-react';

interface NetWorthReportProps {
  reportData: any;
  formatCurrency: (amount: number) => string;
}

export const NetWorthReport: React.FC<NetWorthReportProps> = ({ reportData, formatCurrency }) => {
  if (!reportData?.net_worth_terkini) return null;

  const totalAssets = reportData.breakdown_akun?.reduce((sum: number, akun: any) => 
    ['kas', 'bank', 'e_wallet', 'aset', 'tujuan_tabungan'].includes(akun.jenis) ? sum + akun.saldo_terkini : sum, 0) || 0;

  const totalLiabilities = reportData.breakdown_akun?.reduce((sum: number, akun: any) => 
    ['kartu_kredit', 'pinjaman'].includes(akun.jenis) ? sum + Math.abs(akun.saldo_terkini) : sum, 0) || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Net Worth Terkini</CardTitle>
            <Wallet className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 truncate" title={formatCurrency(reportData.net_worth_terkini || 0)}>
              {formatCurrency(reportData.net_worth_terkini || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Total Aset</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 truncate" title={formatCurrency(totalAssets)}>
              {formatCurrency(totalAssets)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Total Liabilitas</CardTitle>
            <Target className="h-4 w-4 text-red-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 truncate" title={formatCurrency(totalLiabilities)}>
              {formatCurrency(totalLiabilities)}
            </div>
            {totalLiabilities === 0 && (
              <p className="text-xs text-muted-foreground truncate">Bebas hutang</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Perubahan Periode</CardTitle>
            <BarChart3 className={`h-4 w-4 flex-shrink-0 ${
              (reportData.perubahan_periode || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`} />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={`text-lg sm:text-xl lg:text-2xl font-bold truncate ${
              (reportData.perubahan_periode || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`} title={formatCurrency(reportData.perubahan_periode || 0)}>
              {(reportData.perubahan_periode || 0) >= 0 ? '+' : ''}{formatCurrency(reportData.perubahan_periode || 0)}
            </div>
            <p className={`text-xs truncate ${
              (reportData.perubahan_persen || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(reportData.perubahan_persen || 0) >= 0 ? '+' : ''}{(reportData.perubahan_persen || 0).toFixed(2)}%
            </p>
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
            {String(reportData.periode?.dari || '')} - {String(reportData.periode?.sampai || '')}
          </div>
        </CardContent>
      </Card>
      
      {/* Account Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Assets */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg truncate flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Aset
              </CardTitle>
              <CardDescription className="text-sm truncate">
                Total: {formatCurrency(totalAssets)}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-3 sm:space-y-4 max-h-80 overflow-y-auto">
              {reportData.breakdown_akun?.filter((akun: any) => 
                ['kas', 'bank', 'e_wallet', 'aset', 'tujuan_tabungan'].includes(akun.jenis)
              ).map((akun: any, index: number) => {
                const percentage = totalAssets > 0 ? (akun.saldo_terkini / totalAssets * 100) : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-medium text-sm sm:text-base truncate flex-1" title={akun.nama_akun}>
                        {akun.nama_akun}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-blue-600">
                      {formatCurrency(akun.saldo_terkini)}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 capitalize">
                      {akun.jenis.replace('_', ' ')}
                    </p>
                  </div>
                );
              })}
              {reportData.breakdown_akun?.filter((akun: any) => 
                ['kas', 'bank', 'e_wallet', 'aset', 'tujuan_tabungan'].includes(akun.jenis)
              ).length === 0 && (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-gray-500 text-sm sm:text-base">Tidak ada aset ditemukan</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Liabilities */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg truncate flex items-center gap-2">
                <PieChart className="h-5 w-5 text-red-600" />
                Liabilitas
              </CardTitle>
              <CardDescription className="text-sm truncate">
                Total: {formatCurrency(totalLiabilities)}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-3 sm:space-y-4 max-h-80 overflow-y-auto">
              {reportData.breakdown_akun?.filter((akun: any) => 
                ['kartu_kredit', 'pinjaman'].includes(akun.jenis)
              ).map((akun: any, index: number) => {
                const absAmount = Math.abs(akun.saldo_terkini);
                const percentage = totalLiabilities > 0 ? (absAmount / totalLiabilities * 100) : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-medium text-sm sm:text-base truncate flex-1" title={akun.nama_akun}>
                        {akun.nama_akun}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-red-600">
                      {formatCurrency(absAmount)}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 capitalize">
                      {akun.jenis.replace('_', ' ')}
                    </p>
                  </div>
                );
              })}
              {totalLiabilities === 0 && (
                <div className="text-center py-6 sm:py-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-xl">✓</span>
                    </div>
                    <p className="font-medium text-green-700 text-sm sm:text-base">Bebas Hutang!</p>
                    <p className="text-xs sm:text-sm text-gray-500">Tidak ada liabilitas saat ini</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Monthly Trend */}
      {reportData.trend_bulanan && reportData.trend_bulanan.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg truncate flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Tren Bulanan Net Worth
              </CardTitle>
              <CardDescription className="text-sm truncate">
                Perkembangan kekayaan bersih selama periode analisis
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-2 sm:space-y-3 max-h-80 overflow-y-auto">
              {reportData.trend_bulanan.map((item: any, index: number) => {
                const isLatest = index === 0;
                const prevItem = index < reportData.trend_bulanan.length - 1 ? reportData.trend_bulanan[index + 1] : null;
                const growth = prevItem ? ((item.net_worth - prevItem.net_worth) / prevItem.net_worth * 100) : 0;
                
                return (
                  <div key={index} className={`border rounded-lg p-3 sm:p-4 transition-colors ${
                    isLatest ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          isLatest ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                        <span className="font-medium text-sm sm:text-base truncate">
                          {new Date(item.tanggal).toLocaleDateString('id-ID', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </span>
                        {isLatest && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                            Terkini
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">Aset</p>
                        <p className="font-semibold text-blue-600 truncate" title={formatCurrency(item.total_aset)}>
                          {formatCurrency(item.total_aset)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Liabilitas</p>
                        <p className="font-semibold text-red-600 truncate" title={formatCurrency(item.total_liabilitas)}>
                          {formatCurrency(item.total_liabilitas)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Net Worth</p>
                        <p className="font-bold text-green-600 truncate" title={formatCurrency(item.net_worth)}>
                          {formatCurrency(item.net_worth)}
                        </p>
                        {prevItem && (
                          <p className={`text-xs ${
                            growth >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};