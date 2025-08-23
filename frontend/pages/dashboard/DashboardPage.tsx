import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Wallet,
  TrendingUp,
  Target,
  CreditCard,
  Plus,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/lib/api-client";
import { useNavigate } from "react-router-dom";
import { formatCurrency, getTransactionColor } from "@/lib/format";
import { TransactionListItem } from "@/components/ui/TransactionListItem";
import {
  StatsCardSkeleton,
  TransactionSkeleton,
  GoalCardSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/skeletons";

interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  accountsCount: number;
  goalsCount: number;
  completedGoals: number;
}

interface Transaction {
  id: string;
  jenis: "pemasukan" | "pengeluaran" | "transfer" | "income" | "expense";
  nominal: number;
  tanggal_transaksi: string;
  catatan?: string;
  kategori_nama?: string;
  nama_kategori?: string;
  nama_akun?: string;
  akun_id: string;
  transfer_info?: {
    type: "masuk" | "keluar";
    paired_account_id: string;
    paired_transaction_id: string;
    transfer_id: string;
    paired_account_name?: string;
  };
}

interface Goal {
  id: string;
  nama_tujuan: string;
  target_nominal: number;
  nominal_terkumpul: number;
  progress: number;
}

type TransactionType = Transaction["jenis"];

const INITIAL_STATS: DashboardStats = {
  totalBalance: 0,
  monthlyIncome: 0,
  monthlyExpense: 0,
  accountsCount: 0,
  goalsCount: 0,
  completedGoals: 0,
};

const safeFormatCurrency = (value: number | undefined | null): string => {
  const numValue = Number(value);
  return Number.isFinite(numValue)
    ? formatCurrency(numValue)
    : formatCurrency(0);
};

const calculateProgress = (current: number, target: number): number => {
  const validCurrent = Number.isFinite(current) && current >= 0 ? current : 0;
  const validTarget = Number.isFinite(target) && target > 0 ? target : 1;
  return Math.min((validCurrent / validTarget) * 100, 100);
};

export default function DashboardPage(): JSX.Element {
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [goalProgress, setGoalProgress] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadDashboardData = useCallback(async (): Promise<void> => {
    if (!currentTenant) return;

    try {
      setIsLoading(true);

      const dashboardRes = await apiClient.dashboard.getStats({
        tenant_id: currentTenant,
      });

      setStats({
        totalBalance: dashboardRes.total_balance || 0,
        monthlyIncome: dashboardRes.monthly_income || 0,
        monthlyExpense: dashboardRes.monthly_expense || 0,
        accountsCount: dashboardRes.accounts_count || 0,
        goalsCount: dashboardRes.goals_count || 0,
        completedGoals: dashboardRes.completed_goals || 0,
      });

      setRecentTransactions(dashboardRes.recent_transactions || []);

      try {
        const goalsRes = await apiClient.tujuan.list({
          tenant_id: currentTenant,
          limit: 3,
        });
        const goals = goalsRes.tujuan || goalsRes || [];
        const goalsWithProgress = goals.map(
          (goal: any): Goal => ({
            ...goal,
            progress: calculateProgress(
              goal.nominal_terkumpul,
              goal.target_nominal
            ),
          })
        );
        setGoalProgress(goalsWithProgress);
      } catch (error) {
        console.error("Failed to load goals:", error);
        setGoalProgress([]);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant]);

  useEffect(() => {
    if (currentTenant) {
      loadDashboardData();
    }
  }, [loadDashboardData]);



  const handleNavigateToTransactions = (): void =>
    navigate("/dashboard/transactions");
  const handleNavigateToGoals = (): void => navigate("/dashboard/goals");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <PageHeaderSkeleton />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            <div className="overflow-hidden border rounded-lg bg-white">
              <div className="p-4 sm:p-6 border-b">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <TransactionSkeleton key={i} />
                ))}
              </div>
            </div>
            <div className="overflow-hidden border rounded-lg bg-white">
              <div className="p-4 sm:p-6 border-b">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <GoalCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
              Dashboard
            </h1>
            <p
              className="text-gray-600 text-sm sm:text-base truncate"
              title={`Selamat datang kembali, ${user?.nama_lengkap}`}
            >
              Selamat datang kembali, {user?.nama_lengkap}
            </p>
          </div>
          <Button
            onClick={handleNavigateToTransactions}
            className="w-full sm:w-auto flex-shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Transaksi Baru</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">
                Total Saldo
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div
                className="text-lg sm:text-xl lg:text-2xl font-bold truncate"
                title={safeFormatCurrency(stats.totalBalance)}
              >
                {safeFormatCurrency(stats.totalBalance)}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {stats.accountsCount} akun aktif
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">
                Pemasukan Bulan Ini
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div
                className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 truncate"
                title={safeFormatCurrency(stats.monthlyIncome)}
              >
                {safeFormatCurrency(stats.monthlyIncome)}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Bulan{" "}
                {new Date().toLocaleDateString("id-ID", { month: "long" })}
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">
                Pengeluaran Bulan Ini
              </CardTitle>
              <CreditCard className="h-4 w-4 text-red-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div
                className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 truncate"
                title={safeFormatCurrency(stats.monthlyExpense)}
              >
                {safeFormatCurrency(stats.monthlyExpense)}
              </div>
              <p
                className="text-xs text-muted-foreground truncate"
                title={`Net: ${safeFormatCurrency(
                  stats.monthlyIncome - stats.monthlyExpense
                )}`}
              >
                Net:{" "}
                {safeFormatCurrency(stats.monthlyIncome - stats.monthlyExpense)}
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">
                Tujuan Tercapai
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
                {stats.completedGoals} dari {stats.goalsCount}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {stats.goalsCount > 0
                  ? Math.round((stats.completedGoals / stats.goalsCount) * 100)
                  : 0}
                % tujuan tercapai
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base sm:text-lg truncate">
                  Transaksi Terbaru
                </CardTitle>
                <CardDescription className="text-sm truncate">
                  Transaksi bulan ini
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNavigateToTransactions}
                className="flex-shrink-0 text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Lihat Semua</span>
                <span className="sm:hidden">Semua</span>
              </Button>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-gray-500 text-sm sm:text-base">
                    Belum ada transaksi bulan ini
                  </p>
                  <Button
                    className="mt-2 text-sm"
                    size="sm"
                    onClick={handleNavigateToTransactions}
                  >
                    Tambah Transaksi
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3 max-h-80 overflow-y-auto">
                  {recentTransactions
                    .filter((transaction, index, arr) => {
                      if (transaction.jenis === 'transfer') {
                        const transferId = transaction.transfer_info?.transfer_id;
                        if (transferId) {
                          // For regular transfers, show only one per transfer_id
                          return arr.findIndex(t => 
                            t.jenis === 'transfer' && 
                            t.transfer_info?.transfer_id === transferId
                          ) === index;
                        }
                        // For goal transfers (no transfer_id), show all
                        return true;
                      }
                      return true;
                    })
                    .map((transaction) => (
                      <TransactionListItem
                        key={transaction.id}
                        transaction={transaction}
                        getAccountName={(accountId) => transaction.nama_akun || "Akun"}
                        getCategoryName={(categoryId) => transaction.nama_kategori || transaction.catatan || "Transaksi"}
                        showActions={false}
                        compact={true}
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base sm:text-lg truncate">
                  Tujuan Tabungan
                </CardTitle>
                <CardDescription className="text-sm truncate">
                  Progress tujuan Anda
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNavigateToGoals}
                className="flex-shrink-0 text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Lihat Semua</span>
                <span className="sm:hidden">Semua</span>
              </Button>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {goalProgress.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-gray-500 text-sm sm:text-base">
                    Belum ada tujuan tabungan
                  </p>
                  <Button
                    className="mt-2 text-sm"
                    size="sm"
                    onClick={handleNavigateToGoals}
                  >
                    Buat Tujuan
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4 max-h-80 overflow-y-auto">
                  {goalProgress.map((goal) => (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex justify-between items-center gap-2">
                        <span
                          className="font-medium text-sm sm:text-base truncate flex-1"
                          title={goal.nama_tujuan}
                        >
                          {goal.nama_tujuan}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">
                          {goal.progress.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                      <div className="flex justify-between text-xs sm:text-sm text-gray-500 gap-2">
                        <span
                          className="truncate"
                          title={safeFormatCurrency(goal.nominal_terkumpul)}
                        >
                          {safeFormatCurrency(goal.nominal_terkumpul)}
                        </span>
                        <span
                          className="truncate"
                          title={safeFormatCurrency(goal.target_nominal)}
                        >
                          {safeFormatCurrency(goal.target_nominal)}
                        </span>
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