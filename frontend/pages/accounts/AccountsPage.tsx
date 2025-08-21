import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Wallet, CreditCard, PiggyBank } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import apiClient from '@/lib/api-client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface Account {
  id: string;
  tenant_id: string;
  nama_akun: string;
  jenis: 'kas' | 'bank' | 'e_wallet' | 'kartu_kredit' | 'pinjaman' | 'aset';
  saldo_awal: number;
  saldo_terkini: number;
  mata_uang: string;
  keterangan?: string;
  dibuat_pada: string;
  diubah_pada: string;
}

interface AccountFormData {
  nama_akun: string;
  jenis: 'kas' | 'bank' | 'e_wallet' | 'kartu_kredit' | 'pinjaman' | 'aset';
  saldo_awal: number;
  mata_uang: string;
  keterangan: string;
}

const accountTypes = [
  { value: 'kas', label: 'Kas/Tunai', icon: PiggyBank },
  { value: 'bank', label: 'Bank', icon: CreditCard },
  { value: 'e_wallet', label: 'E-Wallet', icon: Wallet },
  { value: 'kartu_kredit', label: 'Kartu Kredit', icon: CreditCard },
  { value: 'pinjaman', label: 'Pinjaman', icon: CreditCard },
  { value: 'aset', label: 'Aset/Investasi', icon: PiggyBank }
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; account: Account | null }>({ open: false, account: null });
  const [formData, setFormData] = useState<AccountFormData>({
    nama_akun: '',
    jenis: 'bank',
    saldo_awal: 0,
    mata_uang: 'IDR',
    keterangan: ''
  });

  const { currentTenant } = useTenant();
  const { toast } = useToast();

  useEffect(() => {
    if (currentTenant) {
      loadAccounts();
    }
  }, [currentTenant]);

  const loadAccounts = async () => {
    if (!currentTenant) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.akun.list({ tenant_id: currentTenant });
      const accountsData = response?.akun || [];
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (error: any) {
      console.error('Failed to load accounts:', error);
      setError(error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data akun");
      setAccounts([]);
      toast({
        title: "Gagal memuat akun",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data akun",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    setIsSubmitting(true);
    try {
      if (editingAccount) {
        await apiClient.akun.update({
          id: editingAccount.id,
          ...formData
        });
        toast({
          title: "Akun berhasil diperbarui",
          description: "Data akun telah disimpan",
        });
      } else {
        await apiClient.akun.create({
          tenant_id: currentTenant,
          ...formData
        });
        toast({
          title: "Akun berhasil ditambahkan",
          description: "Akun baru telah dibuat",
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadAccounts();
    } catch (error: any) {
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

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      nama_akun: account.nama_akun,
      jenis: account.jenis,
      saldo_awal: account.saldo_awal,
      mata_uang: account.mata_uang,
      keterangan: account.keterangan || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteDialog.account) return;

    try {
      await apiClient.akun.deleteAkun({ id: deleteDialog.account.id });
      toast({
        title: "Akun berhasil dihapus",
        description: "Akun telah dihapus dari sistem",
      });
      setDeleteDialog({ open: false, account: null });
      loadAccounts();
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      toast({
        title: "Gagal menghapus akun",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus akun",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nama_akun: '',
      jenis: 'kas',
      saldo_awal: 0,
      mata_uang: 'IDR',
      keterangan: ''
    });
    setEditingAccount(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const getAccountIcon = (type: string) => {
    const accountType = accountTypes.find(t => t.value === type);
    const Icon = accountType?.icon || Wallet;
    return <Icon className="h-5 w-5" />;
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Akun</h1>
            <p className="text-gray-600 text-sm sm:text-base">Kelola akun bank, e-wallet, dan aset Anda</p>
          </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Akun
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Edit Akun' : 'Tambah Akun Baru'}</DialogTitle>
              <DialogDescription>
                {editingAccount ? 'Perbarui informasi akun' : 'Buat akun keuangan baru'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Select value={formData.jenis} onValueChange={(value: any) => setFormData(prev => ({ ...prev, jenis: value }))}>
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
                <Input
                  id="saldo_awal"
                  type="number"
                  placeholder="0"
                  value={formData.saldo_awal}
                  onChange={(e) => setFormData(prev => ({ ...prev, saldo_awal: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mata_uang">Mata Uang</Label>
                <Select value={formData.mata_uang} onValueChange={(value) => setFormData(prev => ({ ...prev, mata_uang: value }))}>
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
                  onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Menyimpan...
                    </>
                  ) : (
                    editingAccount ? 'Perbarui' : 'Tambah'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Akun</CardTitle>
          <CardDescription>Semua akun keuangan Anda</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : !accounts || accounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Belum ada akun. Tambahkan akun pertama Anda!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts?.map((account) => (
                <div key={account.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-white shadow-sm gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      {getAccountIcon(account.jenis)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">{account.nama_akun}</h3>
                      <p className="text-sm text-gray-500">
                        {accountTypes.find(t => t.value === account.jenis)?.label} • {account.mata_uang}
                      </p>
                      {account.keterangan && (
                        <p className="text-sm text-gray-400 truncate">{account.keterangan}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-left sm:text-right">
                      <p className="font-medium">{formatCurrency(account.saldo_terkini)}</p>
                      <p className="text-sm text-gray-500">Saldo Terkini</p>
                      <p className="text-xs text-gray-400">Awal: {formatCurrency(account.saldo_awal)}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(account)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, account })}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
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
        onOpenChange={(open) => setDeleteDialog({ open, account: null })}
        title="Hapus Akun"
        description={`Apakah Anda yakin ingin menghapus akun "${deleteDialog.account?.nama_akun}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
