import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  FileText,
  Filter,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import apiClient from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/ui/use-toast";

interface AccountHistory {
  akun: {
    id: string;
    nama_akun: string;
    jenis: string;
    saldo_terkini: number;
  };
  transaksi: Array<{
    id: string;
    jenis: string;
    nominal: number;
    saldo_setelah: number;
    tanggal_transaksi: string;
    catatan?: string;
    nama_kategori?: string;
    transfer_info?: {
      type: "masuk" | "keluar";
      paired_account_name?: string;
    };
  }>;
  total: number;
}

export default function AccountHistoryPage(): JSX.Element {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { toast } = useToast();

  const [history, setHistory] = useState<AccountHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    jenis: "all",
    tanggal_dari: "",
    tanggal_sampai: "",
    search: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (currentTenant && accountId) {
      loadHistory();
    }
  }, [currentTenant, accountId, filters, currentPage]);

  const loadHistory = async () => {
    if (!currentTenant || !accountId) return;

    try {
      setIsLoading(true);
      const response = await apiClient.transaksi.getAccountHistory({
        tenant_id: currentTenant,
        akun_id: accountId,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        ...Object.fromEntries(
          Object.entries(filters).map(([k, v]) => [k, v === "all" ? "" : v]).filter(([_, v]) => v)
        )
      });
      setHistory(response);
      setTotalPages(Math.ceil((response.total || 0) / itemsPerPage));
    } catch (error) {
      console.error("Failed to load account history:", error);
      toast({
        title: "Gagal memuat riwayat",
        description: "Terjadi kesalahan saat memuat riwayat transaksi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionIcon = (transaction: AccountHistory["transaksi"][0]) => {
    if (transaction.jenis === "transfer") {
      return transaction.transfer_info?.type === "masuk" ? (
        <ArrowDownLeft className="h-4 w-4 text-blue-600" />
      ) : (
        <ArrowUpRight className="h-4 w-4 text-orange-600" />
      );
    }
    return transaction.jenis === "pemasukan" ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getTransactionColor = (transaction: AccountHistory["transaksi"][0]) => {
    if (transaction.jenis === "transfer") {
      return transaction.transfer_info?.type === "masuk"
        ? "text-blue-700"
        : "text-orange-700";
    }
    return transaction.jenis === "pemasukan"
      ? "text-green-700"
      : "text-red-700";
  };

  const getTransactionDescription = (
    transaction: AccountHistory["transaksi"][0]
  ) => {
    if (transaction.jenis === "transfer") {
      const type = transaction.transfer_info?.type;
      const accountName = transaction.transfer_info?.paired_account_name;

      if (type === "masuk") {
        return accountName ? `Transfer dari ${accountName}` : "Transfer Masuk";
      } else {
        if (accountName) {
          return `Transfer ke ${accountName}`;
        } else {
          // Likely transfer to savings goal
          return "Transfer ke Tujuan Tabungan";
        }
      }
    }
    return transaction.nama_kategori || (transaction.jenis === "pemasukan" ? "Pemasukan" : "Pengeluaran");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!history) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-gray-500">Akun tidak ditemukan</p>
          <Button
            onClick={() => navigate("/dashboard/accounts")}
            className="mt-4"
          >
            Kembali ke Akun
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard/accounts")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Riwayat Transaksi
              </h1>
              <p className="text-sm text-gray-600">{history.akun.nama_akun}</p>
            </div>
          </div>
          {/* <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Coming Soon
            </span>
            <Button variant="outline" size="sm" disabled>
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div> */}
        </div>

        <Card className={`${history.akun.saldo_terkini > 0 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${history.akun.saldo_terkini > 0 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <TrendingUp className={`h-5 w-5 ${history.akun.saldo_terkini > 0 ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {history.akun.nama_akun}
                  </h2>
                  <p className="text-sm text-gray-600 capitalize">
                    {history.akun.jenis.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-gray-600 mb-1">Saldo Saat Ini</p>
                <p className={`text-xl sm:text-2xl font-bold ${history.akun.saldo_terkini > 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                  {formatCurrency(history.akun.saldo_terkini)}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter & Pencarian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Pencarian</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cari catatan..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select value={filters.jenis} onValueChange={(value) => setFilters(prev => ({ ...prev, jenis: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua jenis</SelectItem>
                    <SelectItem value="pemasukan">Pemasukan</SelectItem>
                    <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal Dari</Label>
                <Input
                  type="date"
                  value={filters.tanggal_dari}
                  onChange={(e) => setFilters(prev => ({ ...prev, tanggal_dari: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Sampai</Label>
                <Input
                  type="date"
                  value={filters.tanggal_sampai}
                  onChange={(e) => setFilters(prev => ({ ...prev, tanggal_sampai: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  const params = new URLSearchParams({
                    tenant_id: currentTenant!,
                    ...Object.fromEntries(
                      Object.entries(filters).map(([k, v]) => [k, v === "all" ? "" : v]).filter(([_, v]) => v)
                    ),
                    format: 'csv'
                  });
                  const exportParams = new URLSearchParams({
                    tenant_id: currentTenant!,
                    akun_id: accountId!,
                    ...Object.fromEntries(
                      Object.entries(filters).map(([k, v]) => [k, v === "all" ? "" : v]).filter(([_, v]) => v)
                    ),
                    format: 'csv'
                  });
                  // TODO: Implement export functionality
                  console.log('Export not implemented yet');
                }}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Mutasi
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Mutasi Rekening</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {history.total} transaksi ditemukan
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {history.transaksi.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-50 rounded-lg inline-block mb-4">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto" />
                </div>
                <p className="text-gray-500 text-lg font-medium mb-2">Belum ada transaksi</p>
                <p className="text-gray-400 text-sm mb-4">Transaksi akan muncul di sini setelah Anda melakukan aktivitas keuangan</p>
                <Button 
                  onClick={() => navigate('/dashboard/transactions')} 
                  className="mt-2"
                >
                  Buat Transaksi Pertama
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {history.transaksi.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-col sm:flex-row sm:items-center p-3 sm:p-4 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors gap-3 sm:gap-0"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-white border border-gray-200 shadow-sm flex-shrink-0">
                        {getTransactionIcon(transaction)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {getTransactionDescription(transaction)}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                          <p className="text-sm text-gray-600">
                            {new Date(transaction.tanggal_transaksi).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          {transaction.catatan && (
                            <>
                              <span className="text-gray-400 hidden sm:inline">•</span>
                              <p className="text-sm text-gray-500 truncate">
                                {transaction.catatan}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className={`font-semibold ${getTransactionColor(transaction)}`}>
                        {transaction.jenis === "pemasukan" || transaction.transfer_info?.type === "masuk" ? "+" : "-"}
                        {formatCurrency(transaction.nominal)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Saldo: {formatCurrency(transaction.saldo_setelah)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Halaman {currentPage} dari {totalPages} ({history?.total || 0} total transaksi)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Sebelumnya
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                      if (page > totalPages) return null;
                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Selanjutnya
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
