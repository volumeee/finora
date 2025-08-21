import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Filter } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface Transaction {
  id: string;
  akun_id: string;
  kategori_id?: string;
  jenis: 'pemasukan' | 'pengeluaran' | 'transfer';
  nominal: number;
  mata_uang: string;
  tanggal_transaksi: string;
  catatan?: string;
  pengguna_id: string;
  dibuat_pada: Date;
  diubah_pada: Date;
}

interface Account {
  id: string;
  nama_akun: string;
  jenis: string;
}

interface Category {
  id: string;
  nama_kategori: string;
  jenis: 'pemasukan' | 'pengeluaran';
}

interface TransactionFormData {
  akun_id: string;
  kategori_id: string;
  jenis: 'pemasukan' | 'pengeluaran' | 'transfer';
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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('transaction');
  const [filters, setFilters] = useState({
    jenis: '',
    akun_id: '',
    kategori_id: '',
    tanggal_dari: '',
    tanggal_sampai: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; transaction: Transaction | null }>({ open: false, transaction: null });

  const [formData, setFormData] = useState<TransactionFormData>({
    akun_id: '',
    kategori_id: '',
    jenis: 'pengeluaran',
    nominal: 0,
    mata_uang: 'IDR',
    tanggal_transaksi: new Date().toISOString().split('T')[0],
    catatan: ''
  });

  const [transferData, setTransferData] = useState<TransferFormData>({
    akun_asal_id: '',
    akun_tujuan_id: '',
    nominal: 0,
    mata_uang: 'IDR',
    tanggal_transaksi: new Date().toISOString().split('T')[0],
    catatan: ''
  });

  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentTenant) {
      loadData();
    }
  }, [currentTenant]);

  const loadData = async () => {
    if (!currentTenant) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const [transactionsRes, accountsRes, categoriesRes] = await Promise.all([
        apiClient.transaksi.list({ tenant_id: currentTenant, ...filters }).catch(() => ({ transactions: [] })),
        apiClient.akun.list({ tenant_id: currentTenant }).catch(() => ({ akun: [] })),
        apiClient.kategori.list({ tenant_id: currentTenant, include_system: true }).catch(() => ({ kategori: [] }))
      ]);
      
      setTransactions(transactionsRes.transactions || []);
      setAccounts(accountsRes.akun || []);
      setCategories(categoriesRes.kategori || []);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      setError(error.message || "Terjadi kesalahan saat memuat data");
      toast({
        title: "Gagal memuat data",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !user) return;

    setIsSubmitting(true);
    try {
      if (editingTransaction) {
        await apiClient.transaksi.update({
          id: editingTransaction.id,
          ...formData
        });
        toast({
          title: "Transaksi berhasil diperbarui",
          description: "Data transaksi telah disimpan",
        });
      } else {
        await apiClient.transaksi.create({
          tenant_id: currentTenant,
          pengguna_id: user.id,
          ...formData
        });
        toast({
          title: "Transaksi berhasil ditambahkan",
          description: "Transaksi baru telah dibuat",
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Failed to save transaction:', error);
      toast({
        title: editingTransaction ? "Gagal memperbarui transaksi" : "Gagal menambah transaksi",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !user) return;

    setIsSubmitting(true);
    try {
      await apiClient.transaksi.createTransfer({
        tenant_id: currentTenant,
        pengguna_id: user.id,
        ...transferData
      });
      
      toast({
        title: "Transfer berhasil",
        description: "Transfer antar akun telah dibuat",
      });
      
      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Failed to create transfer:', error);
      toast({
        title: "Gagal membuat transfer",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat membuat transfer",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      akun_id: transaction.akun_id,
      kategori_id: transaction.kategori_id || '',
      jenis: transaction.jenis === 'transfer' ? 'pengeluaran' : transaction.jenis,
      nominal: transaction.nominal,
      mata_uang: transaction.mata_uang,
      tanggal_transaksi: transaction.tanggal_transaksi.split('T')[0],
      catatan: transaction.catatan || ''
    });
    setActiveTab('transaction');
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteDialog.transaction) return;

    try {
      await apiClient.transaksi.deleteTransaksi({ id: deleteDialog.transaction.id });
      toast({
        title: "Transaksi berhasil dihapus",
        description: "Transaksi telah dihapus dari sistem",
      });
      setDeleteDialog({ open: false, transaction: null });
      loadData();
    } catch (error: any) {
      console.error('Failed to delete transaction:', error);
      toast({
        title: "Gagal menghapus transaksi",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus transaksi",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      akun_id: '',
      kategori_id: '',
      jenis: 'pengeluaran',
      nominal: 0,
      mata_uang: 'IDR',
      tanggal_transaksi: new Date().toISOString().split('T')[0],
      catatan: ''
    });
    setTransferData({
      akun_asal_id: '',
      akun_tujuan_id: '',
      nominal: 0,
      mata_uang: 'IDR',
      tanggal_transaksi: new Date().toISOString().split('T')[0],
      catatan: ''
    });
    setEditingTransaction(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'pemasukan':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'pengeluaran':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      case 'transfer':
        return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
      default:
        return <ArrowUpRight className="h-4 w-4" />;
    }
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account?.nama_akun || 'Unknown Account';
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return '-';
    const category = categories.find(c => c.id === categoryId);
    return category?.nama_kategori || 'Unknown Category';
  };

  const filteredCategories = Array.isArray(categories) ? categories.filter(c => {
    // Check if category has jenis property, if not, include all categories
    return !c.jenis || c.jenis === formData.jenis;
  }) : [];

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={loadData} className="mt-4">Coba Lagi</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaksi</h1>
          <p className="text-gray-600">Kelola semua transaksi keuangan Anda</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Transaksi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}</DialogTitle>
              <DialogDescription>
                {editingTransaction ? 'Perbarui informasi transaksi' : 'Buat transaksi atau transfer baru'}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transaction">Transaksi</TabsTrigger>
                <TabsTrigger value="transfer" disabled={!!editingTransaction}>Transfer</TabsTrigger>
              </TabsList>
              
              <TabsContent value="transaction">
                <form onSubmit={handleSubmitTransaction} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="jenis">Jenis Transaksi</Label>
                    <Select value={formData.jenis} onValueChange={(value: 'pemasukan' | 'pengeluaran') => setFormData(prev => ({ ...prev, jenis: value, kategori_id: '' }))}>
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
                    <Select value={formData.akun_id} onValueChange={(value) => setFormData(prev => ({ ...prev, akun_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih akun" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.nama_akun}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kategori_id">Kategori</Label>
                    <Select value={formData.kategori_id} onValueChange={(value) => setFormData(prev => ({ ...prev, kategori_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.nama_kategori}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nominal">Nominal</Label>
                    <Input
                      id="nominal"
                      type="number"
                      placeholder="0"
                      value={formData.nominal}
                      onChange={(e) => setFormData(prev => ({ ...prev, nominal: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tanggal_transaksi">Tanggal</Label>
                    <Input
                      id="tanggal_transaksi"
                      type="date"
                      value={formData.tanggal_transaksi}
                      onChange={(e) => setFormData(prev => ({ ...prev, tanggal_transaksi: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="catatan">Catatan (Opsional)</Label>
                    <Input
                      id="catatan"
                      placeholder="Deskripsi transaksi"
                      value={formData.catatan}
                      onChange={(e) => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
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
                        editingTransaction ? 'Perbarui' : 'Tambah'
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="transfer">
                <form onSubmit={handleSubmitTransfer} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="akun_asal_id">Akun Asal</Label>
                    <Select value={transferData.akun_asal_id} onValueChange={(value) => setTransferData(prev => ({ ...prev, akun_asal_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih akun asal" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.nama_akun}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="akun_tujuan_id">Akun Tujuan</Label>
                    <Select value={transferData.akun_tujuan_id} onValueChange={(value) => setTransferData(prev => ({ ...prev, akun_tujuan_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih akun tujuan" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.filter(a => a.id !== transferData.akun_asal_id).map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.nama_akun}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transfer_nominal">Nominal</Label>
                    <Input
                      id="transfer_nominal"
                      type="number"
                      placeholder="0"
                      value={transferData.nominal}
                      onChange={(e) => setTransferData(prev => ({ ...prev, nominal: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transfer_tanggal">Tanggal</Label>
                    <Input
                      id="transfer_tanggal"
                      type="date"
                      value={transferData.tanggal_transaksi}
                      onChange={(e) => setTransferData(prev => ({ ...prev, tanggal_transaksi: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transfer_catatan">Catatan (Opsional)</Label>
                    <Input
                      id="transfer_catatan"
                      placeholder="Deskripsi transfer"
                      value={transferData.catatan}
                      onChange={(e) => setTransferData(prev => ({ ...prev, catatan: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                      Batal
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="flex-1">
                      {isSubmitting ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Memproses...
                        </>
                      ) : (
                        'Transfer'
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Transaksi</CardTitle>
          <CardDescription>Semua transaksi dalam 30 hari terakhir</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Belum ada transaksi. Tambahkan transaksi pertama Anda!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getTransactionIcon(transaction.jenis)}
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {transaction.jenis === 'transfer' ? 'Transfer' : getCategoryName(transaction.kategori_id)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {getAccountName(transaction.akun_id)} • {new Date(transaction.tanggal_transaksi).toLocaleDateString('id-ID')}
                      </p>
                      {transaction.catatan && (
                        <p className="text-sm text-gray-400">{transaction.catatan}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.jenis === 'pemasukan' ? 'text-green-600' : 
                        transaction.jenis === 'pengeluaran' ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {transaction.jenis === 'pemasukan' ? '+' : transaction.jenis === 'pengeluaran' ? '-' : ''}
                        {formatCurrency(transaction.nominal)}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">{transaction.jenis}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(transaction)}
                        disabled={transaction.jenis === 'transfer'}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, transaction })}
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
        onOpenChange={(open) => setDeleteDialog({ open, transaction: null })}
        title="Hapus Transaksi"
        description={`Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
