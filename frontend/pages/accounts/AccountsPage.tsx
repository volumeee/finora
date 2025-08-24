import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogTrigger } from '@/components/ui/dialog';
import {
  ResponsiveDialog,
  ResponsiveDialogForm,
  ResponsiveDialogActions,
  ResponsiveDialogButton,
} from '@/components/ui/ResponsiveDialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Wallet, CreditCard, PiggyBank, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import apiClient from '@/lib/api-client';
import { CardSkeleton } from '@/components/ui/skeletons';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency } from '@/lib/format';

type AccountType = 'kas' | 'bank' | 'e_wallet' | 'kartu_kredit' | 'pinjaman' | 'aset';
type Currency = 'IDR' | 'USD' | 'EUR';

interface Account {
  id: string;
  tenant_id: string;
  nama_akun: string;
  jenis: AccountType;
  saldo_awal: number;
  saldo_terkini: number;
  mata_uang: string;
  keterangan?: string;
  dibuat_pada: string;
  diubah_pada: string;
}

interface AccountFormData {
  nama_akun: string;
  jenis: AccountType;
  saldo_awal: number;
  mata_uang: Currency;
  keterangan: string;
}

interface AccountTypeOption {
  value: AccountType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const accountTypes: AccountTypeOption[] = [
  { value: 'kas', label: 'Kas/Tunai', icon: PiggyBank },
  { value: 'bank', label: 'Bank', icon: CreditCard },
  { value: 'e_wallet', label: 'E-Wallet', icon: Wallet },
  { value: 'kartu_kredit', label: 'Kartu Kredit', icon: CreditCard },
  { value: 'pinjaman', label: 'Pinjaman', icon: CreditCard },
  { value: 'aset', label: 'Aset/Investasi', icon: PiggyBank }
] as const;

const INITIAL_FORM_DATA: AccountFormData = {
  nama_akun: '',
  jenis: 'bank',
  saldo_awal: 0,
  mata_uang: 'IDR',
  keterangan: ''
};

const safeFormatCurrency = (value: number | undefined | null): string => {
  const numValue = Number(value);
  return Number.isFinite(numValue) ? formatCurrency(numValue) : formatCurrency(0);
};

export default function AccountsPage(): JSX.Element {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; account: Account | null }>({ 
    open: false, 
    account: null 
  });
  const [formData, setFormData] = useState<AccountFormData>(INITIAL_FORM_DATA);

  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadAccounts = useCallback(async (): Promise<void> => {
    if (!currentTenant) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.akun.list({ tenant_id: currentTenant });
      const accountsData = response?.akun || [];
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data akun";
      setError(errorMessage);
      setAccounts([]);
      toast({
        title: "Gagal memuat akun",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, toast]);

  useEffect(() => {
    if (currentTenant) {
      loadAccounts();
    }
  }, [loadAccounts]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!currentTenant) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        keterangan: formData.keterangan || undefined,
      };

      if (editingAccount) {
        await apiClient.akun.update({
          id: editingAccount.id,
          ...submitData
        });
        toast({
          title: "Akun berhasil diperbarui",
          description: "Data akun telah disimpan",
        });
      } else {
        await apiClient.akun.create({
          tenant_id: currentTenant,
          ...submitData
        });
        toast({
          title: "Akun berhasil ditambahkan",
          description: "Akun baru telah dibuat",
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
      await loadAccounts();
    } catch (error) {
      console.error('Failed to save account:', error);
      toast({
        title: editingAccount ? "Gagal memperbarui akun" : "Gagal menambah akun",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (account: Account): void => {
    setEditingAccount(account);
    setFormData({
      nama_akun: account.nama_akun,
      jenis: account.jenis,
      saldo_awal: account.saldo_awal,
      mata_uang: account.mata_uang as Currency,
      keterangan: account.keterangan || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteDialog.account) return;

    try {
      await apiClient.akun.deleteAkun({ id: deleteDialog.account.id });
      toast({
        title: "Akun berhasil dihapus",
        description: "Akun telah dihapus dari sistem",
      });
      setDeleteDialog({ open: false, account: null });
      await loadAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast({
        title: "Gagal menghapus akun",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus akun",
        variant: "destructive",
      });
    }
  };

  const resetForm = (): void => {
    setFormData(INITIAL_FORM_DATA);
    setEditingAccount(null);
  };

  const getAccountIcon = (type: AccountType): JSX.Element => {
    const accountType = accountTypes.find(t => t.value === type);
    const Icon = accountType?.icon || Wallet;
    return <Icon className="h-5 w-5" />;
  };

  const getAccountTypeLabel = (type: AccountType): string => {
    return accountTypes.find(t => t.value === type)?.label || 'Unknown';
  };

  const handleDialogClose = (open: boolean): void => {
    setIsDialogOpen(open);
    if (!open) resetForm();
  };

  const handleDeleteDialogChange = (open: boolean): void => {
    setDeleteDialog({ open, account: null });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={loadAccounts} className="mt-4">Coba Lagi</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Akun</h1>
            <p className="text-gray-600 text-sm sm:text-base truncate">Kelola akun bank, e-wallet, dan aset Anda</p>
          </div>
        <ResponsiveDialog
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          title={editingAccount ? 'Edit Akun' : 'Tambah Akun Baru'}
          description={editingAccount ? 'Perbarui informasi akun' : 'Buat akun keuangan baru'}
          size="md"
        >
          <ResponsiveDialogForm onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="nama_akun">Nama Akun</Label>
              <Input
                id="nama_akun"
                placeholder="Contoh: BCA Tabungan"
                value={formData.nama_akun}
                onChange={(e) => setFormData(prev => ({ ...prev, nama_akun: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="jenis">Jenis Akun</Label>
              <Select value={formData.jenis} onValueChange={(value: AccountType) => setFormData(prev => ({ ...prev, jenis: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis akun" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="saldo_awal">Saldo Awal</Label>
              <CurrencyInput
                value={formData.saldo_awal}
                onChange={(value) => setFormData(prev => ({ ...prev, saldo_awal: value }))}
                placeholder="Masukkan saldo awal"
                required
                maxLength={12}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mata_uang">Mata Uang</Label>
              <Select value={formData.mata_uang} onValueChange={(value: Currency) => setFormData(prev => ({ ...prev, mata_uang: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mata uang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR - Rupiah</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keterangan">Keterangan (Opsional)</Label>
              <Input
                id="keterangan"
                placeholder="Deskripsi tambahan"
                value={formData.keterangan}
                onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value.slice(0, 100) }))}
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
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Menyimpan...
                  </>
                ) : (
                  editingAccount ? 'Perbarui' : 'Tambah'
                )}
              </ResponsiveDialogButton>
            </ResponsiveDialogActions>
          </ResponsiveDialogForm>
        </ResponsiveDialog>
        
        <Button className="w-full sm:w-auto" onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Akun
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Akun</CardTitle>
          <CardDescription>Semua akun keuangan Anda</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 sm:space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Belum ada akun. Tambahkan akun pertama Anda!</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="flex flex-col sm:flex-row sm:items-center p-3 sm:p-4 border rounded-lg bg-white shadow-sm gap-3 sm:gap-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      {getAccountIcon(account.jenis)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm sm:text-base truncate" title={account.nama_akun}>
                        {account.nama_akun}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        {getAccountTypeLabel(account.jenis)} • {account.mata_uang}
                      </p>
                      {account.keterangan && (
                        <p className="text-xs sm:text-sm text-gray-400 truncate" title={account.keterangan}>
                          {account.keterangan}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                    <div className="text-left sm:text-right min-w-0 flex-1 sm:flex-initial">
                      <p className="font-medium text-sm sm:text-base truncate" title={safeFormatCurrency(account.saldo_terkini)}>
                        {safeFormatCurrency(account.saldo_terkini)}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">Saldo Terkini</p>
                      <p className="text-xs text-gray-400 truncate" title={`Awal: ${safeFormatCurrency(account.saldo_awal)}`}>
                        Awal: {safeFormatCurrency(account.saldo_awal)}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/dashboard/accounts/${account.id}/history`)}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                        title="Lihat Riwayat"
                      >
                        <History className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(account)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, account })}
                        className="text-red-600 hover:text-red-700 hover:bg-red-100 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        </Card>
        
        <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={handleDeleteDialogChange}
        title="Hapus Akun"
        description={`Apakah Anda yakin ingin menghapus akun "${deleteDialog.account?.nama_akun}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}