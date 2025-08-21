import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Target, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import apiClient from '@/lib/api-client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface Goal {
  id: string;
  nama_tujuan: string;
  jenis_tujuan: 'emergency_fund' | 'vacation' | 'house' | 'car' | 'education' | 'retirement' | 'other';
  target_nominal: number;
  terkumpul_nominal: number;
  tenggat_tanggal?: string;
  catatan?: string;
  dibuat_pada: Date;
  diubah_pada: Date;
}

interface Contribution {
  id: string;
  tujuan_id: string;
  nominal: number;
  tanggal_kontribusi: string;
  catatan?: string;
  dibuat_pada: Date;
}

interface GoalFormData {
  nama_tujuan: string;
  jenis_tujuan: 'emergency_fund' | 'vacation' | 'house' | 'car' | 'education' | 'retirement' | 'other';
  target_nominal: number;
  tenggat_tanggal: string;
  catatan: string;
}

interface ContributionFormData {
  nominal: number;
  tanggal_kontribusi: string;
  catatan: string;
}

const goalTypes = [
  { value: 'emergency_fund', label: 'Dana Darurat', icon: '🌂' },
  { value: 'vacation', label: 'Liburan', icon: '✈️' },
  { value: 'house', label: 'Rumah', icon: '🏠' },
  { value: 'car', label: 'Kendaraan', icon: '🚗' },
  { value: 'education', label: 'Pendidikan', icon: '🎓' },
  { value: 'retirement', label: 'Pensiun', icon: '👴' },
  { value: 'other', label: 'Lainnya', icon: '🎯' }
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isContributionDialogOpen, setIsContributionDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  
  const [goalFormData, setGoalFormData] = useState<GoalFormData>({
    nama_tujuan: '',
    jenis_tujuan: 'other',
    target_nominal: 0,
    tenggat_tanggal: '',
    catatan: ''
  });

  const [contributionFormData, setContributionFormData] = useState<ContributionFormData>({
    nominal: 0,
    tanggal_kontribusi: new Date().toISOString().split('T')[0],
    catatan: ''
  });

  const { currentTenant } = useTenant();
  const { toast } = useToast();

  useEffect(() => {
    if (currentTenant) {
      loadGoals();
    }
  }, [currentTenant]);

  const loadGoals = async () => {
    if (!currentTenant) return;
    
    try {
      setIsLoading(true);
      const response = await apiClient.tujuan.list({ tenant_id: currentTenant });
      const goalsData = response?.goals || response || [];
      setGoals(Array.isArray(goalsData) ? goalsData : []);
    } catch (error: any) {
      console.error('Failed to load goals:', error);
      setGoals([]);
      toast({
        title: "Gagal memuat tujuan",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data tujuan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadContributions = async (goalId: string) => {
    try {
      const response = await apiClient.tujuan.listKontribusi({ tujuan_id: goalId });
      const contributionsData = response?.contributions || response || [];
      setContributions(Array.isArray(contributionsData) ? contributionsData : []);
    } catch (error: any) {
      console.error('Failed to load contributions:', error);
      setContributions([]);
      toast({
        title: "Gagal memuat kontribusi",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data kontribusi",
        variant: "destructive",
      });
    }
  };

  const handleSubmitGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    setIsSubmitting(true);
    try {
      if (editingGoal) {
        await apiClient.tujuan.update({
          id: editingGoal.id,
          ...goalFormData
        });
        toast({
          title: "Tujuan berhasil diperbarui",
          description: "Data tujuan telah disimpan",
        });
      } else {
        await apiClient.tujuan.create({
          tenant_id: currentTenant,
          ...goalFormData
        });
        toast({
          title: "Tujuan berhasil ditambahkan",
          description: "Tujuan baru telah dibuat",
        });
      }
      
      setIsGoalDialogOpen(false);
      resetGoalForm();
      loadGoals();
    } catch (error: any) {
      console.error('Failed to save goal:', error);
      toast({
        title: editingGoal ? "Gagal memperbarui tujuan" : "Gagal menambah tujuan",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;

    setIsSubmitting(true);
    try {
      await apiClient.tujuan.createKontribusi({
        tujuan_id: selectedGoal.id,
        ...contributionFormData
      });
      
      toast({
        title: "Kontribusi berhasil ditambahkan",
        description: "Kontribusi telah dicatat",
      });
      
      setIsContributionDialogOpen(false);
      resetContributionForm();
      loadGoals();
      if (selectedGoal) {
        loadContributions(selectedGoal.id);
      }
    } catch (error: any) {
      console.error('Failed to add contribution:', error);
      toast({
        title: "Gagal menambah kontribusi",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menambah kontribusi",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalFormData({
      nama_tujuan: goal.nama_tujuan,
      jenis_tujuan: goal.jenis_tujuan,
      target_nominal: goal.target_nominal,
      tenggat_tanggal: goal.tenggat_tanggal?.split('T')[0] || '',
      catatan: goal.catatan || ''
    });
    setIsGoalDialogOpen(true);
  };

  const handleDeleteGoal = async () => {
    if (!deleteDialog.goal) return;

    try {
      await apiClient.tujuan.deleteTujuan({ id: deleteDialog.goal.id });
      toast({
        title: "Tujuan berhasil dihapus",
        description: "Tujuan telah dihapus dari sistem",
      });
      setDeleteDialog({ open: false, goal: null });
      loadGoals();
    } catch (error: any) {
      console.error('Failed to delete goal:', error);
      toast({
        title: "Gagal menghapus tujuan",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus tujuan",
        variant: "destructive",
      });
    }
  };

  const handleAddContribution = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsContributionDialogOpen(true);
    loadContributions(goal.id);
  };

  const resetGoalForm = () => {
    setGoalFormData({
      nama_tujuan: '',
      jenis_tujuan: 'other',
      target_nominal: 0,
      tenggat_tanggal: '',
      catatan: ''
    });
    setEditingGoal(null);
  };

  const resetContributionForm = () => {
    setContributionFormData({
      nominal: 0,
      tanggal_kontribusi: new Date().toISOString().split('T')[0],
      catatan: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const getGoalTypeInfo = (type: string) => {
    return goalTypes.find(t => t.value === type) || goalTypes[goalTypes.length - 1];
  };

  const calculateProgress = (current: number, target: number) => {
    return target > 0 ? Math.min((current / target) * 100, 100) : 0;
  };

  const getDaysRemaining = (deadline?: string) => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tujuan Tabungan</h1>
          <p className="text-gray-600">Tetapkan dan capai tujuan keuangan Anda</p>
        </div>
        <Dialog open={isGoalDialogOpen} onOpenChange={(open) => {
          setIsGoalDialogOpen(open);
          if (!open) resetGoalForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Tujuan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Edit Tujuan' : 'Tambah Tujuan Baru'}</DialogTitle>
              <DialogDescription>
                {editingGoal ? 'Perbarui informasi tujuan tabungan' : 'Buat tujuan tabungan baru'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmitGoal} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nama_tujuan">Nama Tujuan</Label>
                <Input
                  id="nama_tujuan"
                  placeholder="Contoh: Liburan ke Bali"
                  value={goalFormData.nama_tujuan}
                  onChange={(e) => setGoalFormData(prev => ({ ...prev, nama_tujuan: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jenis_tujuan">Jenis Tujuan</Label>
                <Select value={goalFormData.jenis_tujuan} onValueChange={(value: any) => setGoalFormData(prev => ({ ...prev, jenis_tujuan: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {goalTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_nominal">Target Nominal</Label>
                <Input
                  id="target_nominal"
                  type="number"
                  placeholder="0"
                  value={goalFormData.target_nominal}
                  onChange={(e) => setGoalFormData(prev => ({ ...prev, target_nominal: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenggat_tanggal">Tenggat Waktu (Opsional)</Label>
                <Input
                  id="tenggat_tanggal"
                  type="date"
                  value={goalFormData.tenggat_tanggal}
                  onChange={(e) => setGoalFormData(prev => ({ ...prev, tenggat_tanggal: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="catatan">Catatan (Opsional)</Label>
                <Input
                  id="catatan"
                  placeholder="Deskripsi tujuan"
                  value={goalFormData.catatan}
                  onChange={(e) => setGoalFormData(prev => ({ ...prev, catatan: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsGoalDialogOpen(false)} className="flex-1">
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Menyimpan...
                    </>
                  ) : (
                    editingGoal ? 'Perbarui' : 'Tambah'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contribution Dialog */}
      <Dialog open={isContributionDialogOpen} onOpenChange={(open) => {
        setIsContributionDialogOpen(open);
        if (!open) {
          resetContributionForm();
          setSelectedGoal(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Kontribusi</DialogTitle>
            <DialogDescription>
              Tambahkan kontribusi untuk tujuan: {selectedGoal?.nama_tujuan}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitContribution} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contribution_nominal">Nominal Kontribusi</Label>
              <Input
                id="contribution_nominal"
                type="number"
                placeholder="0"
                value={contributionFormData.nominal}
                onChange={(e) => setContributionFormData(prev => ({ ...prev, nominal: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggal_kontribusi">Tanggal Kontribusi</Label>
              <Input
                id="tanggal_kontribusi"
                type="date"
                value={contributionFormData.tanggal_kontribusi}
                onChange={(e) => setContributionFormData(prev => ({ ...prev, tanggal_kontribusi: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contribution_catatan">Catatan (Opsional)</Label>
              <Input
                id="contribution_catatan"
                placeholder="Deskripsi kontribusi"
                value={contributionFormData.catatan}
                onChange={(e) => setContributionFormData(prev => ({ ...prev, catatan: e.target.value }))}
              />
            </div>

            {contributions.length > 0 && (
              <div className="space-y-2">
                <Label>Kontribusi Sebelumnya</Label>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {contributions.slice(0, 3).map((contribution) => (
                    <div key={contribution.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                      <span>{formatCurrency(contribution.nominal)}</span>
                      <span>{new Date(contribution.tanggal_kontribusi).toLocaleDateString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsContributionDialogOpen(false)} className="flex-1">
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Menambah...
                  </>
                ) : (
                  'Tambah Kontribusi'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : goals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Belum ada tujuan tabungan. Tambahkan tujuan pertama Anda!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => {
              const typeInfo = getGoalTypeInfo(goal.jenis_tujuan);
              const progress = calculateProgress(goal.terkumpul_nominal, goal.target_nominal);
              const daysRemaining = getDaysRemaining(goal.tenggat_tanggal);
              
              return (
                <Card key={goal.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{typeInfo.icon}</span>
                        <div>
                          <CardTitle className="text-lg">{goal.nama_tujuan}</CardTitle>
                          <CardDescription>{typeInfo.label}</CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditGoal(goal)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, goal })}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{formatCurrency(goal.terkumpul_nominal)}</span>
                        <span>{formatCurrency(goal.target_nominal)}</span>
                      </div>
                    </div>
                    
                    {goal.tenggat_tanggal && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {daysRemaining !== null && daysRemaining >= 0 ? (
                            <span className={daysRemaining <= 30 ? 'text-orange-600' : 'text-gray-600'}>
                              {daysRemaining} hari lagi
                            </span>
                          ) : (
                            <span className="text-red-600">Melewati tenggat</span>
                          )}
                        </span>
                      </div>
                    )}
                    
                    {goal.catatan && (
                      <p className="text-sm text-gray-600">{goal.catatan}</p>
                    )}
                    
                    <Button 
                      onClick={() => handleAddContribution(goal)}
                      className="w-full"
                      size="sm"
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Tambah Kontribusi
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, goal: null })}
        title="Hapus Tujuan"
        description={`Apakah Anda yakin ingin menghapus tujuan "${deleteDialog.goal?.nama_tujuan}"? Semua kontribusi yang terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteGoal}
      />
    </div>
  );
}
