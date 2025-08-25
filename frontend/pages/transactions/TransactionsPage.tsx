import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogTrigger } from "@/components/ui/dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogForm,
  ResponsiveDialogActions,
  ResponsiveDialogButton,
} from "@/components/ui/ResponsiveDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/lib/api-client";
import { TransactionSkeleton } from "@/components/ui/skeletons";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatCurrency, getTransactionColor } from "@/lib/format";
import { TransactionListItem } from "@/components/ui/TransactionListItem";

type TransactionType = "pemasukan" | "pengeluaran" | "transfer";
type CategoryType = "pemasukan" | "pengeluaran";

interface Transaction {
  id: string;
  akun_id: string;
  kategori_id?: string;
  jenis: TransactionType;
  nominal: number;
  mata_uang: string;
  tanggal_transaksi: string;
  catatan?: string;
  pengguna_id: string;
  dibuat_pada: Date;
  diubah_pada: Date;
  nama_akun?: string;
  nama_kategori?: string;
  transfer_info?: {
    type: "masuk" | "keluar";
    paired_account_id: string;
    paired_transaction_id: string;
    transfer_id: string;
    paired_account_name?: string;
  };
}

interface Account {
  id: string;
  nama_akun: string;
  jenis: string;
  saldo_terkini?: number;
  saldo_tersedia?: number;
  status_saldo?: 'cukup' | 'rendah' | 'kosong';
}

interface Category {
  id: string;
  nama_kategori: string;
  jenis: CategoryType;
}

interface TransactionFormData {
  akun_id: string;
  kategori_id: string;
  jenis: Exclude<TransactionType, "transfer">;
  nominal: number;
  mata_uang: string;
  tanggal_transaksi: string;
  catatan: string;
}

interface TransferFormData {
  akun_asal_id: string;
  akun_tujuan_id: string;
  nominal: number;
  mata_uang: string;
  tanggal_transaksi: string;
  catatan: string;
}

interface Filters {
  jenis: string;
  akun_id: string;
  kategori_id: string;
  tanggal_dari: string;
  tanggal_sampai: string;
}

const INITIAL_TRANSACTION_FORM: TransactionFormData = {
  akun_id: "",
  kategori_id: "",
  jenis: "pengeluaran",
  nominal: 0,
  mata_uang: "IDR",
  tanggal_transaksi: new Date().toISOString().split("T")[0],
  catatan: "",
};

const getInitialTransferForm = (): TransferFormData => ({
  akun_asal_id: "",
  akun_tujuan_id: "",
  nominal: 0,
  mata_uang: "IDR",
  tanggal_transaksi: new Date().toISOString().split("T")[0],
  catatan: "",
});

const safeFormatCurrency = (value: number | undefined | null): string => {
  const numValue = Number(value);
  return Number.isFinite(numValue) ? formatCurrency(numValue) : formatCurrency(0);
};

export default function TransactionsPage(): JSX.Element {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"transaction" | "transfer">("transaction");
  const [filters, setFilters] = useState<Filters>({
    jenis: "all",
    akun_id: "all",
    kategori_id: "all",
    tanggal_dari: "",
    tanggal_sampai: "",
  });
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const itemsPerPage = 20;
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    transaction: Transaction | null;
  }>({ open: false, transaction: null });
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const [formData, setFormData] = useState<TransactionFormData>(INITIAL_TRANSACTION_FORM);
  const [transferData, setTransferData] = useState<TransferFormData>(getInitialTransferForm());

  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  const loadData = useCallback(async (): Promise<void> => {
    if (!currentTenant) return;

    try {
      setIsLoading(true);
      setError(null);

      const [transactionsRes, accountsRes, categoriesRes, goalsRes] = await Promise.all([
        apiClient.transaksi
          .list({ 
            tenant_id: currentTenant, 
            ...Object.fromEntries(
              Object.entries(filters).map(([k, v]) => [k, v === "all" ? "" : v])
            ),
            search: search || undefined,
            limit: itemsPerPage,
            offset: (currentPage - 1) * itemsPerPage
          })
          .catch(() => ({ transaksi: [], total: 0 })),
        apiClient.akun
          .list({ tenant_id: currentTenant })
          .catch(() => ({ akun: [] })),
        apiClient.kategori
          .list({ tenant_id: currentTenant, include_system: true })
          .catch(() => ({ kategori: [] })),
        apiClient.tujuan
          .list({ tenant_id: currentTenant })
          .catch(() => ({ tujuan: [] })),
      ]);

      setTransactions(transactionsRes.transaksi || []);
      setTotalTransactions(transactionsRes.total || 0);
      setTotalPages(Math.ceil((transactionsRes.total || 0) / itemsPerPage));
      const accountsData = accountsRes.akun || accountsRes.accounts || [];
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setCategories(categoriesRes.kategori || []);
      const goalsData = goalsRes.tujuan || [];
      setGoals(Array.isArray(goalsData) ? goalsData : []);
    } catch (error) {
      console.error("Failed to load data:", error);
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data";
      setError(errorMessage);
      toast({
        title: "Gagal memuat data",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, filters, search, currentPage, toast]);

  useEffect(() => {
    if (currentTenant) {
      loadData();
    }
  }, [loadData]);

  const handleSubmitTransaction = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!currentTenant || !user) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        catatan: formData.catatan || undefined,
      };

      if (editingTransaction) {
        await apiClient.transaksi.update({
          id: editingTransaction.id,
          ...submitData,
        });
        toast({
          title: "Transaksi berhasil diperbarui",
          description: "Data transaksi telah disimpan",
        });
      } else {
        await apiClient.transaksi.create({
          tenant_id: currentTenant,
          pengguna_id: user.id,
          ...submitData,
        });
        toast({
          title: "Transaksi berhasil ditambahkan",
          description: "Transaksi baru telah dibuat",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Failed to save transaction:", error);
      toast({
        title: editingTransaction ? "Gagal memperbarui transaksi" : "Gagal menambah transaksi",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTransfer = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!currentTenant || !user) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        ...transferData,
        catatan: transferData.catatan || undefined,
      };

      await apiClient.transaksi.createTransfer({
        tenant_id: currentTenant,
        pengguna_id: user.id,
        ...submitData,
      });

      // Check if destination is a goal
      const isGoalTransfer = goals.some(goal => goal.id === transferData.akun_tujuan_id);
      
      toast({
        title: "Transfer berhasil",
        description: isGoalTransfer 
          ? "Transfer ke tujuan tabungan berhasil, kontribusi telah ditambahkan"
          : "Transfer antar akun telah dibuat",
      });

      setIsDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Failed to create transfer:", error);
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan saat membuat transfer";
      
      toast({
        title: "Gagal membuat transfer",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (transaction: Transaction): void => {
    setEditingTransaction(transaction);
    
    let dateValue = "";
    if (transaction.tanggal_transaksi) {
      dateValue = typeof transaction.tanggal_transaksi === 'string' 
        ? transaction.tanggal_transaksi.split("T")[0] 
        : new Date(transaction.tanggal_transaksi).toISOString().split("T")[0];
    }
    
    setFormData({
      akun_id: transaction.akun_id,
      kategori_id: transaction.kategori_id || "",
      jenis: transaction.jenis === "transfer" ? "pengeluaran" : transaction.jenis,
      nominal: transaction.nominal,
      mata_uang: transaction.mata_uang,
      tanggal_transaksi: dateValue,
      catatan: transaction.catatan || "",
    });
    setActiveTab("transaction");
    setIsDialogOpen(true);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteDialog.transaction) return;

    try {
      await apiClient.transaksi.deleteTransaksi({
        id: deleteDialog.transaction.id,
      });
      toast({
        title: "Transaksi berhasil dihapus",
        description: "Transaksi telah dihapus dari sistem",
      });
      setDeleteDialog({ open: false, transaction: null });
      await loadData();
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      toast({
        title: "Gagal menghapus transaksi",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus transaksi",
        variant: "destructive",
      });
    }
  };

  const resetForm = (): void => {
    setFormData(INITIAL_TRANSACTION_FORM);
    setTransferData(getInitialTransferForm());
    setEditingTransaction(null);
  };



  const getAccountName = (accountId: string): string => {
    const account = accounts.find((a) => a.id === accountId);
    if (account) return account.nama_akun;
    
    const goal = goals.find((g) => g.id === accountId);
    if (goal) return `🎯 ${goal.nama_tujuan}`;
    
    return "Unknown Account";
  };



  const getCategoryName = (categoryId?: string): string => {
    if (!categoryId) return "-";
    const category = categories.find((c) => c.id === categoryId);
    return category?.nama_kategori || "Unknown Category";
  };

  const filteredCategories = categories.filter((c) => {
    return !c.jenis || c.jenis === formData.jenis;
  });
  
  // Check if selected account is a debt account
  const selectedAccount = accounts.find(a => a.id === formData.akun_id);
  const isDebtAccount = selectedAccount && ['pinjaman', 'kartu_kredit'].includes(selectedAccount.jenis);
  
  // Filter transaction types based on account type
  const allowedTransactionTypes = isDebtAccount 
    ? ['pengeluaran'] // Debt accounts can only have expenses (increase debt)
    : ['pemasukan', 'pengeluaran']; // Normal accounts can have both

  const handleDialogClose = (open: boolean): void => {
    setIsDialogOpen(open);
    if (!open) resetForm();
  };

  const handleDeleteDialogChange = (open: boolean): void => {
    setDeleteDialog({ open, transaction: null });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={loadData} className="mt-4">
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Transaksi
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Kelola semua transaksi keuangan Anda
            </p>
          </div>
          <ResponsiveDialog
            open={isDialogOpen}
            onOpenChange={handleDialogClose}
            title={editingTransaction ? "Edit Transaksi" : "Tambah Transaksi Baru"}
            description={editingTransaction ? "Perbarui informasi transaksi" : "Buat transaksi atau transfer baru"}
            size="md"
          >

              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "transaction" | "transfer")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="transaction">Transaksi</TabsTrigger>
                  <TabsTrigger value="transfer" disabled={!!editingTransaction}>
                    Transfer
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="transaction">
                  <ResponsiveDialogForm onSubmit={handleSubmitTransaction}>
                    <div className="space-y-2">
                      <Label htmlFor="jenis">Jenis Transaksi</Label>
                      <Select
                        value={formData.jenis}
                        onValueChange={(value: Exclude<TransactionType, "transfer">) =>
                          setFormData((prev) => ({
                            ...prev,
                            jenis: value,
                            kategori_id: "",
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis" />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedTransactionTypes.includes('pemasukan') && (
                            <SelectItem value="pemasukan">Pemasukan</SelectItem>
                          )}
                          <SelectItem value="pengeluaran">
                            {isDebtAccount ? 'Pengeluaran (Menambah Utang)' : 'Pengeluaran'}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {isDebtAccount && (
                        <div className="text-sm p-2 bg-amber-50 rounded border border-amber-200">
                          <p className="text-amber-700">
                            💡 <strong>Akun Utang:</strong> Hanya bisa pengeluaran (menambah utang). 
                            Untuk pembayaran utang, gunakan <strong>Transfer</strong> dari akun lain.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="akun_id">Akun</Label>
                      <Select
                        value={formData.akun_id}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, akun_id: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih akun" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.nama_akun} - {safeFormatCurrency(account.saldo_terkini || 0)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.akun_id && (() => {
                        const selectedAccount = accounts.find(a => a.id === formData.akun_id);
                        if (selectedAccount) {
                          const isDebt = ['pinjaman', 'kartu_kredit'].includes(selectedAccount.jenis);
                          const balance = selectedAccount.saldo_terkini || 0;
                          
                          return (
                            <div className={`text-sm p-2 rounded border ${
                              isDebt 
                                ? balance < 0 
                                  ? 'bg-red-50 border-red-200' 
                                  : 'bg-green-50 border-green-200'
                                : 'bg-blue-50 border-blue-200'
                            }`}>
                              <span className={isDebt 
                                ? balance < 0 
                                  ? 'text-red-700' 
                                  : 'text-green-700'
                                : 'text-blue-700'
                              }>
                                {isDebt 
                                  ? balance < 0 
                                    ? 'Sisa utang: ' 
                                    : 'Utang lunas: '
                                  : 'Saldo tersedia: '
                                }
                              </span>
                              <span className={`font-medium ${
                                isDebt 
                                  ? balance < 0 
                                    ? 'text-red-800' 
                                    : 'text-green-800'
                                  : 'text-blue-800'
                              }`}>
                                {isDebt && balance < 0 
                                  ? safeFormatCurrency(Math.abs(balance))
                                  : safeFormatCurrency(balance)
                                }
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="kategori_id">Kategori</Label>
                      <Select
                        value={formData.kategori_id}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, kategori_id: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.nama_kategori}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nominal">Nominal</Label>
                      <CurrencyInput
                        value={formData.nominal}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, nominal: value }))
                        }
                        placeholder="Masukkan nominal"
                        required
                        maxLength={12}
                      />
                      {formData.jenis === "pengeluaran" &&
                        formData.akun_id &&
                        formData.nominal > 0 &&
                        (() => {
                          const selectedAccount = accounts.find(
                            (a) => a.id === formData.akun_id
                          );
                          if (selectedAccount) {
                            const isDebt = ['pinjaman', 'kartu_kredit'].includes(selectedAccount.jenis);
                            
                            if (!isDebt && (selectedAccount.saldo_terkini || 0) < formData.nominal) {
                              return (
                                <p className="text-xs text-red-500">
                                  Saldo tidak mencukupi. Saldo tersedia:{" "}
                                  {safeFormatCurrency(selectedAccount.saldo_terkini || 0)}
                                </p>
                              );
                            }
                            
                            if (isDebt) {
                              const currentDebt = Math.abs(selectedAccount.saldo_terkini || 0);
                              const newDebt = currentDebt + formData.nominal;
                              return (
                                <p className="text-xs text-amber-600">
                                  Utang akan bertambah menjadi: {safeFormatCurrency(newDebt)}
                                </p>
                              );
                            }
                          }
                          return null;
                        })()}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tanggal_transaksi">Tanggal</Label>
                      <Input
                        id="tanggal_transaksi"
                        type="date"
                        value={formData.tanggal_transaksi}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            tanggal_transaksi: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="catatan">Catatan (Opsional)</Label>
                      <Input
                        id="catatan"
                        placeholder="Deskripsi transaksi"
                        value={formData.catatan}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            catatan: e.target.value.slice(0, 100),
                          }))
                        }
                        maxLength={100}
                      />
                    </div>

                    <ResponsiveDialogActions>
                      <ResponsiveDialogButton
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Batal
                      </ResponsiveDialogButton>
                      <ResponsiveDialogButton 
                        type="submit" 
                        disabled={
                          isSubmitting ||
                          !formData.akun_id ||
                          !formData.kategori_id ||
                          formData.nominal <= 0 ||
                          (formData.jenis === "pengeluaran" && (() => {
                            const selectedAccount = accounts.find(
                              (a) => a.id === formData.akun_id
                            );
                            if (selectedAccount) {
                              const isDebt = ['pinjaman', 'kartu_kredit'].includes(selectedAccount.jenis);
                              // For debt accounts, always allow expenses (they increase debt)
                              // For normal accounts, check balance
                              return !isDebt && (selectedAccount.saldo_terkini || 0) < formData.nominal;
                            }
                            return false;
                          })())
                        }
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Menyimpan...
                          </>
                        ) : editingTransaction ? (
                          "Perbarui"
                        ) : (
                          "Tambah"
                        )}
                      </ResponsiveDialogButton>
                    </ResponsiveDialogActions>
                  </ResponsiveDialogForm>
                </TabsContent>

                <TabsContent value="transfer">
                  <ResponsiveDialogForm onSubmit={handleSubmitTransfer}>
                    <div className="space-y-2">
                      <Label htmlFor="akun_asal_id">Akun Asal</Label>
                      <Select
                        value={transferData.akun_asal_id}
                        onValueChange={(value) =>
                          setTransferData((prev) => ({ ...prev, akun_asal_id: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih akun asal" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts
                            .filter((account) => {
                              // Exclude debt accounts as source (can't transfer FROM debt)
                              return !['pinjaman', 'kartu_kredit'].includes(account.jenis);
                            })
                            .map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex justify-between items-center w-full">
                                <span>{account.nama_akun}</span>
                                <span className="text-sm text-gray-600 ml-2">
                                  {safeFormatCurrency(account.saldo_terkini || 0)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {accounts.filter(a => ['pinjaman', 'kartu_kredit'].includes(a.jenis)).length > 0 && (
                        <div className="text-sm p-2 bg-amber-50 rounded border border-amber-200">
                          <p className="text-amber-700">
                            💡 <strong>Catatan:</strong> Akun utang (Pinjaman/Kartu Kredit) tidak bisa menjadi sumber transfer.
                          </p>
                        </div>
                      )}
                      {transferData.akun_asal_id && (() => {
                        const selectedAccount = accounts.find(a => a.id === transferData.akun_asal_id);
                        if (selectedAccount) {
                          return (
                            <div className="text-sm p-2 bg-blue-50 rounded border">
                              <span className="text-blue-700">Saldo tersedia: </span>
                              <span className="font-medium text-blue-800">
                                {safeFormatCurrency(selectedAccount.saldo_terkini || 0)}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="akun_tujuan_id">Akun Tujuan</Label>
                      <Select
                        value={transferData.akun_tujuan_id}
                        onValueChange={(value) =>
                          setTransferData((prev) => ({ ...prev, akun_tujuan_id: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih akun tujuan" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts
                            .filter((a) => a.id !== transferData.akun_asal_id)
                            .map((account) => {
                              const isDebt = ['pinjaman', 'kartu_kredit'].includes(account.jenis);
                              const balance = account.saldo_terkini || 0;
                              
                              return (
                                <SelectItem key={account.id} value={account.id}>
                                  <div className="flex justify-between items-center w-full">
                                    <span>{account.nama_akun}</span>
                                    {isDebt && balance < 0 && (
                                      <span className="text-xs text-red-600 ml-2">
                                        (Utang: {safeFormatCurrency(Math.abs(balance))})
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          {(() => {
                            // Only show goals if source is not a debt account
                            const sourceAccount = accounts.find(a => a.id === transferData.akun_asal_id);
                            const isSourceDebt = sourceAccount && ['pinjaman', 'kartu_kredit'].includes(sourceAccount.jenis);
                            
                            if (isSourceDebt) {
                              return null; // Don't show goals for debt account sources
                            }
                            
                            return goals.map((goal) => (
                              <SelectItem key={goal.id} value={goal.id}>
                                🎯 {goal.nama_tujuan}
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transfer_nominal">Nominal</Label>
                      <CurrencyInput
                        value={transferData.nominal}
                        onChange={(value) =>
                          setTransferData((prev) => ({ ...prev, nominal: value }))
                        }
                        placeholder="Masukkan nominal"
                        required
                        maxLength={12}
                      />
                      {transferData.akun_asal_id &&
                        transferData.nominal > 0 &&
                        (() => {
                          const selectedAccount = accounts.find(
                            (a) => a.id === transferData.akun_asal_id
                          );
                          if (
                            selectedAccount &&
                            (selectedAccount.saldo_terkini || 0) < transferData.nominal
                          ) {
                            return (
                              <p className="text-xs text-red-500">
                                Saldo tidak mencukupi. Saldo tersedia:{" "}
                                {safeFormatCurrency(selectedAccount.saldo_terkini || 0)}
                              </p>
                            );
                          }
                          return null;
                        })()}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transfer_tanggal">Tanggal</Label>
                      <Input
                        id="transfer_tanggal"
                        type="date"
                        value={transferData.tanggal_transaksi}
                        onChange={(e) =>
                          setTransferData((prev) => ({
                            ...prev,
                            tanggal_transaksi: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transfer_catatan">Catatan (Opsional)</Label>
                      <Input
                        id="transfer_catatan"
                        placeholder="Deskripsi transfer"
                        value={transferData.catatan}
                        onChange={(e) =>
                          setTransferData((prev) => ({
                            ...prev,
                            catatan: e.target.value.slice(0, 100),
                          }))
                        }
                        maxLength={100}
                      />
                    </div>

                    <ResponsiveDialogActions>
                      <ResponsiveDialogButton
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Batal
                      </ResponsiveDialogButton>
                      <ResponsiveDialogButton 
                        type="submit" 
                        disabled={
                          isSubmitting ||
                          !transferData.akun_asal_id ||
                          !transferData.akun_tujuan_id ||
                          transferData.nominal <= 0 ||
                          (() => {
                            const selectedAccount = accounts.find(
                              (a) => a.id === transferData.akun_asal_id
                            );
                            // Source account must have sufficient balance (debt accounts can't be source)
                            return selectedAccount && (selectedAccount.saldo_terkini || 0) < transferData.nominal;
                          })()
                        }
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Memproses...
                          </>
                        ) : (
                          "Transfer"
                        )}
                      </ResponsiveDialogButton>
                    </ResponsiveDialogActions>
                  </ResponsiveDialogForm>
                </TabsContent>
              </Tabs>
          </ResponsiveDialog>
          
          <Button className="w-full sm:w-auto" onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Transaksi
          </Button>
        </div>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter & Pencarian
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="h-8 w-8 p-0"
              >
                {isFilterExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          {isFilterExpanded && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Pencarian</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cari catatan atau nominal..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
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
                <Label>Akun</Label>
                <Select value={filters.akun_id} onValueChange={(value) => setFilters(prev => ({ ...prev, akun_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua akun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua akun</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.nama_akun}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={filters.kategori_id} onValueChange={(value) => setFilters(prev => ({ ...prev, kategori_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua kategori</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.nama_kategori}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="space-y-2">
                <Label>Export</Label>
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
                    // TODO: Implement export functionality
                  console.log('Export not implemented yet');
                  }}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Daftar Transaksi</CardTitle>
                <CardDescription>
                  {totalTransactions} transaksi ditemukan
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <TransactionSkeleton key={i} />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Belum ada transaksi. Tambahkan transaksi pertama Anda!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                    <TransactionListItem
                      key={transaction.id}
                      transaction={transaction}
                      getAccountName={getAccountName}
                      getCategoryName={getCategoryName}
                      onEdit={handleEdit}
                      onDelete={(transaction) => setDeleteDialog({ open: true, transaction })}
                      showActions={true}
                      compact={false}
                    />
                  ))}
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Halaman {currentPage} dari {totalPages} ({totalTransactions} total transaksi)
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

        <ConfirmDialog
          open={deleteDialog.open}
          onOpenChange={handleDeleteDialogChange}
          title="Hapus Transaksi"
          description="Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan."
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}