import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Calendar, Target, TrendingUp, CreditCard, Wallet } from 'lucide-react';

interface BudgetReportProps {
  reportData: any;
  formatCurrency: (amount: number) => string;
  budgetFilters: {
    bulan: number;
    tahun: number;
  };
}

export const BudgetReport: React.FC<BudgetReportProps> = ({ reportData, formatCurrency, budgetFilters }) => {
  if (!reportData?.detail_kategori) return null;

  const budgetUtilization = reportData.ringkasan?.total_budget > 0 
    ? (reportData.ringkasan.total_actual / reportData.ringkasan.total_budget * 100) 
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Key Metrics */}
      {reportData.ringkasan && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Total Budget</CardTitle>
              <Target className="h-4 w-4 text-blue-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 truncate" title={formatCurrency(reportData.ringkasan.total_budget)}>
                {formatCurrency(reportData.ringkasan.total_budget)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Total Actual</CardTitle>
              <CreditCard className="h-4 w-4 text-orange-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600 truncate" title={formatCurrency(reportData.ringkasan.total_actual)}>
                {formatCurrency(reportData.ringkasan.total_actual)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Variance</CardTitle>
              <TrendingUp className={`h-4 w-4 flex-shrink-0 ${
                reportData.ringkasan.total_variance >= 0 ? 'text-red-600' : 'text-green-600'
              }`} />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={`text-lg sm:text-xl lg:text-2xl font-bold truncate ${
                reportData.ringkasan.total_variance >= 0 ? 'text-red-600' : 'text-green-600'
              }`} title={formatCurrency(reportData.ringkasan.total_variance)}>
                {reportData.ringkasan.total_variance >= 0 ? '+' : ''}{formatCurrency(reportData.ringkasan.total_variance)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">Utilisasi Budget</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600 truncate">
                {budgetUtilization.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
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
            {budgetFilters.bulan}/{budgetFilters.tahun}
          </div>
        </CardContent>
      </Card>
      
      {/* Budget vs Actual Details */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base sm:text-lg truncate flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Budget vs Actual - {budgetFilters.bulan}/{budgetFilters.tahun}
            </CardTitle>
            <CardDescription className="text-sm truncate">
              Perbandingan anggaran dengan realisasi per kategori
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-3 sm:space-y-4">
            {reportData.detail_kategori.map((item: any, index: number) => {
              const utilizationPercent = item.budget > 0 ? (item.actual / item.budget * 100) : 0;
              const isOverBudget = item.variance > 0;
              
              return (
                <div key={index} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base truncate" title={item.nama_kategori}>
                        {item.nama_kategori}
                      </h3>
                      <p className="text-xs text-gray-500">Utilisasi: {utilizationPercent.toFixed(1)}%</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                      isOverBudget 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {isOverBudget ? 'Over' : 'Under'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm mb-3">
                    <div>
                      <p className="text-gray-500 mb-1">Budget</p>
                      <p className="font-semibold text-blue-600 truncate" title={formatCurrency(item.budget)}>
                        {formatCurrency(item.budget)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Actual</p>
                      <p className="font-semibold text-orange-600 truncate" title={formatCurrency(item.actual)}>
                        {formatCurrency(item.actual)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Variance</p>
                      <p className={`font-semibold truncate ${
                        isOverBudget ? 'text-red-600' : 'text-green-600'
                      }`} title={formatCurrency(item.variance)}>
                        {item.variance >= 0 ? '+' : ''}{formatCurrency(item.variance)}
                      </p>
                      <p className={`text-xs ${
                        isOverBudget ? 'text-red-500' : 'text-green-500'
                      }`}>
                        {item.variance >= 0 ? '+' : ''}{item.variance_persen.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isOverBudget ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                    ></div>
                  </div>
                  {utilizationPercent > 100 && (
                    <div className="text-xs text-red-600 mt-1 text-center">
                      Melebihi budget sebesar {(utilizationPercent - 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};