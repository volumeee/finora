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
  const [filters] = useState<Filters>({
    jenis: "",
    akun_id: "",
    kategori_id: "",
    tanggal_dari: "",
    tanggal_sampai: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    transaction: Transaction | null;
  }>({ open: false, transaction: null });

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
          .list({ tenant_id: currentTenant, ...filters })
          .catch(() => ({ transactions: [] })),
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
  }, [currentTenant, filters, toast]);

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
                          <SelectItem value="pemasukan">Pemasukan</SelectItem>
                          <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                        </SelectContent>
                      </Select>
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
                              {account.nama_akun}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <ResponsiveDialogButton type="submit" disabled={isSubmitting}>
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
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.nama_akun}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                            .map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.nama_akun}
                              </SelectItem>
                            ))}
                          {goals.map((goal) => (
                            <SelectItem key={goal.id} value={goal.id}>
                              🎯 {goal.nama_tujuan}
                            </SelectItem>
                          ))}
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
                      <ResponsiveDialogButton type="submit" disabled={isSubmitting}>
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

        <Card>
          <CardHeader>
            <CardTitle>Daftar Transaksi</CardTitle>
            <CardDescription>Semua transaksi dalam 30 hari terakhir</CardDescription>
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
                {transactions
                  .filter((transaction, index, arr) => {
                    if (transaction.jenis === 'transfer' && transaction.transfer_info?.transfer_id) {
                      const transferId = transaction.transfer_info.transfer_id;
                      return arr.findIndex(t => 
                        t.jenis === 'transfer' && 
                        t.transfer_info?.transfer_id === transferId
                      ) === index;
                    }
                    return true;
                  })
                  .map((transaction) => (
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