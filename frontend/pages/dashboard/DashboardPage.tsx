import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Wallet, TrendingUp, Target, CreditCard, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    accountsCount: 0,
    goalsCount: 0,
    completedGoals: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [goalProgress, setGoalProgress] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentTenant) {
      loadDashboardData();
    }
  }, [currentTenant]);

  const loadDashboardData = async () => {
    if (!currentTenant) return;
    
    try {
      setIsLoading(true);
      
      // Use dashboard API for stats
      const dashboardRes = await apiClient.dashboard.getStats({ tenant_id: currentTenant });
      
      // Set stats from dashboard API
      setStats({
        totalBalance: dashboardRes.total_balance || 0,
        monthlyIncome: dashboardRes.monthly_income || 0,
        monthlyExpense: dashboardRes.monthly_expense || 0,
        accountsCount: dashboardRes.accounts_count || 0,
        goalsCount: dashboardRes.goals_count || 0,
        completedGoals: dashboardRes.completed_goals || 0
      });
      
      // Set recent transactions
      setRecentTransactions(dashboardRes.recent_transactions || []);
      
      // Load goals for progress display
      try {
        const goalsRes = await apiClient.tujuan.list({ tenant_id: currentTenant, limit: 3 });
        const goals = goalsRes.goals || goalsRes || [];
        const goalsWithProgress = goals.map((goal) => ({
          ...goal,
          progress: goal.target_nominal > 0 ? (goal.terkumpul_nominal / goal.target_nominal) * 100 : 0
        }));
        setGoalProgress(goalsWithProgress);
      } catch (error) {
        console.error('Failed to load goals:', error);
        setGoalProgress([]);
      }
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'income':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'expense':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      default:
        return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 text-sm sm:text-base">Selamat datang kembali, {user?.nama_lengkap}</p>
          </div>
          <Button onClick={() => navigate('/transactions')} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Transaksi Baru
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalBalance)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.accountsCount} akun aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pemasukan Bulan Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.monthlyIncome)}</div>
            <p className="text-xs text-muted-foreground">
              Bulan {new Date().toLocaleDateString('id-ID', { month: 'long' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengeluaran Bulan Ini</CardTitle>
            <CreditCard className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.monthlyExpense)}</div>
            <p className="text-xs text-muted-foreground">
              Net: {formatCurrency(stats.monthlyIncome - stats.monthlyExpense)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tujuan Tercapai</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedGoals} dari {stats.goalsCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.goalsCount > 0 ? Math.round((stats.completedGoals / stats.goalsCount) * 100) : 0}% tujuan tercapai
            </p>
          </CardContent>
        </Card>
      </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transaksi Terbaru</CardTitle>
              <CardDescription>Transaksi bulan ini</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/transactions')}>
              Lihat Semua
            </Button>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Belum ada transaksi bulan ini</p>
                <Button className="mt-2" onClick={() => navigate('/transactions')}>
                  Tambah Transaksi
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.jenis)}
                      <div>
                        <p className="font-medium">
                          {transaction.catatan || transaction.kategori_nama || 'Transaksi'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(transaction.tanggal_transaksi).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.jenis === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.jenis === 'income' ? '+' : '-'}{formatCurrency(transaction.nominal)}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">{transaction.jenis}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Tujuan Tabungan</CardTitle>
              <CardDescription>Progress tujuan Anda</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/goals')}>
              Lihat Semua
            </Button>
          </CardHeader>
          <CardContent>
            {goalProgress.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Belum ada tujuan tabungan</p>
                <Button className="mt-2" onClick={() => navigate('/goals')}>
                  Buat Tujuan
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {goalProgress.map((goal) => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{goal.nama_tujuan}</span>
                      <span className="text-sm text-gray-500">{goal.progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{formatCurrency(goal.terkumpul_nominal)}</span>
                      <span>{formatCurrency(goal.target_nominal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
