import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  FileText,
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

  useEffect(() => {
    if (currentTenant && accountId) {
      loadHistory();
    }
  }, [currentTenant, accountId]);

  const loadHistory = async () => {
    if (!currentTenant || !accountId) return;

    try {
      setIsLoading(true);
      const response = await apiClient.transaksi.getAccountHistory({
        tenant_id: currentTenant,
        akun_id: accountId,
        limit: 50,
      });
      setHistory(response);
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
        <div className="max-w-4xl mx-auto space-y-6">
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
        <div className="max-w-4xl mx-auto text-center py-12">
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
      <div className="max-w-4xl mx-auto space-y-6">
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

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {history.akun.nama_akun}
                  </h2>
                  <p className="text-sm text-gray-600 capitalize">
                    {history.akun.jenis}
                  </p>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-2">
              <p className="text-sm text-gray-600 mb-1">Saldo Saat Ini</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(history.akun.saldo_terkini)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
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
              <div className="text-center py-8">
                <p className="text-gray-500">Belum ada transaksi</p>
              </div>
            ) : (
              <div className="space-y-1">
                {history.transaksi.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-100 mb-2 last:mb-0 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2.5 rounded-lg bg-white border border-gray-200 shadow-sm">
                        {getTransactionIcon(transaction)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div>
                          <p className="font-medium text-gray-900 truncate">
                            {getTransactionDescription(transaction)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-gray-600">
                              {new Date(
                                transaction.tanggal_transaksi
                              ).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                            {transaction.catatan && (
                              <>
                                <span className="text-gray-400">•</span>
                                <p className="text-sm text-gray-500 truncate">
                                  {transaction.catatan}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div>
                        <p
                          className={`font-semibold text-right ${getTransactionColor(
                            transaction
                          )}`}
                        >
                          {transaction.jenis === "pemasukan" ||
                          transaction.transfer_info?.type === "masuk"
                            ? "+"
                            : "-"}
                          {formatCurrency(transaction.nominal)}
                        </p>
                        <p className="text-xs text-gray-500 text-right mt-1">
                          Saldo: {formatCurrency(transaction.saldo_setelah)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
