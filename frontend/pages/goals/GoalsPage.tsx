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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Target,
  Calendar,
  DollarSign,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import apiClient from "@/lib/api-client";
import { GoalCardSkeleton } from "@/components/ui/skeletons";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatCurrency } from "@/lib/format";

type GoalType = "dana_darurat" | "rumah" | "kendaraan" | "liburan" | "pendidikan" | "pensiun" | "lainnya";

interface Goal {
  id: string;
  nama_tujuan: string;
  jenis_tujuan: GoalType;
  target_nominal: number;
  nominal_terkumpul: number;
  tenggat_tanggal?: string;
  catatan?: string;
  dibuat_pada: Date;
  diubah_pada: Date;
}

interface Contribution {
  id: string;
  tujuan_tabungan_id: string;
  transaksi_id: string;
  nominal_kontribusi: number;
  tanggal_kontribusi: string;
}

interface GoalFormData {
  nama_tujuan: string;
  jenis_tujuan: GoalType;
  target_nominal: number;
  tenggat_tanggal: string;
  catatan: string;
}

interface ContributionFormData {
  nominal: number;
  tanggal_kontribusi: string;
  catatan: string;
}

interface GoalTypeOption {
  value: GoalType;
  label: string;
  icon: string;
}

const goalTypes: GoalTypeOption[] = [
  { value: "dana_darurat", label: "Dana Darurat", icon: "🌂" },
  { value: "liburan", label: "Liburan", icon: "✈️" },
  { value: "rumah", label: "Rumah", icon: "🏠" },
  { value: "kendaraan", label: "Kendaraan", icon: "🚗" },
  { value: "pendidikan", label: "Pendidikan", icon: "🎓" },
  { value: "pensiun", label: "Pensiun", icon: "👴" },
  { value: "lainnya", label: "Lainnya", icon: "🎯" },
] as const;

const INITIAL_GOAL_FORM: GoalFormData = {
  nama_tujuan: "",
  jenis_tujuan: "lainnya",
  target_nominal: 0,
  tenggat_tanggal: "",
  catatan: "",
};

const getInitialContributionForm = (): ContributionFormData => ({
  nominal: 0,
  tanggal_kontribusi: new Date().toISOString().split("T")[0],
  catatan: "",
});

export default function GoalsPage(): JSX.Element {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isContributionDialogOpen, setIsContributionDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; goal: Goal | null }>({
    open: false,
    goal: null,
  });

  const [goalFormData, setGoalFormData] = useState<GoalFormData>(INITIAL_GOAL_FORM);
  const [contributionFormData, setContributionFormData] = useState<ContributionFormData>(
    getInitialContributionForm()
  );

  const { currentTenant } = useTenant();
  const { toast } = useToast();

  const loadGoals = useCallback(async (): Promise<void> => {
    if (!currentTenant) return;

    try {
      setIsLoading(true);
      const response = await apiClient.tujuan.list({ tenant_id: currentTenant });
      const goalsData = response?.tujuan || response || [];
      setGoals(Array.isArray(goalsData) ? goalsData : []);
    } catch (error) {
      console.error("Failed to load goals:", error);
      setGoals([]);
      toast({
        title: "Gagal memuat tujuan",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data tujuan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, toast]);

  const loadContributions = useCallback(async (goalId: string): Promise<void> => {
    try {
      const response = await apiClient.tujuan.listKontribusi({ tujuan_id: goalId });
      const contributionsData = response?.kontribusi || [];
      setContributions(Array.isArray(contributionsData) ? contributionsData : []);
    } catch (error) {
      console.error("Failed to load contributions:", error);
      setContributions([]);
      toast({
        title: "Gagal memuat kontribusi",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data kontribusi",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    if (currentTenant) {
      loadGoals();
    }
  }, [loadGoals]);

  const handleSubmitGoal = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!currentTenant) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        ...goalFormData,
        tenggat_tanggal: goalFormData.tenggat_tanggal || undefined,
        catatan: goalFormData.catatan || undefined,
      };

      if (editingGoal) {
        await apiClient.tujuan.update({ id: editingGoal.id, ...submitData });
        toast({
          title: "Tujuan berhasil diperbarui",
          description: "Data tujuan telah disimpan",
        });
      } else {
        await apiClient.tujuan.create({ tenant_id: currentTenant, ...submitData });
        toast({
          title: "Tujuan berhasil ditambahkan",
          description: "Tujuan baru telah dibuat",
        });
      }

      setIsGoalDialogOpen(false);
      resetGoalForm();
      await loadGoals();
    } catch (error) {
      console.error("Failed to save goal:", error);
      toast({
        title: editingGoal ? "Gagal memperbarui tujuan" : "Gagal menambah tujuan",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitContribution = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!selectedGoal) return;

    setIsSubmitting(true);
    try {
      // Generate a UUID for transaksi_id since it's required
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      await apiClient.tujuan.createKontribusi({
        tujuan_tabungan_id: selectedGoal.id,
        transaksi_id: generateUUID(),
        nominal_kontribusi: contributionFormData.nominal,
        tanggal_kontribusi: contributionFormData.tanggal_kontribusi,
      });

      toast({
        title: "Kontribusi berhasil ditambahkan",
        description: "Kontribusi telah dicatat",
      });

      setIsContributionDialogOpen(false);
      resetContributionForm();
      await loadGoals();
      await loadContributions(selectedGoal.id);
    } catch (error) {
      console.error("Failed to add contribution:", error);
      toast({
        title: "Gagal menambah kontribusi",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menambah kontribusi",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditGoal = (goal: Goal): void => {
    setEditingGoal(goal);
    
    let dateValue = "";
    if (goal.tenggat_tanggal) {
      dateValue = typeof goal.tenggat_tanggal === 'string' 
        ? goal.tenggat_tanggal.split("T")[0] 
        : new Date(goal.tenggat_tanggal).toISOString().split("T")[0];
    }
    
    setGoalFormData({
      nama_tujuan: goal.nama_tujuan,
      jenis_tujuan: goal.jenis_tujuan,
      target_nominal: goal.target_nominal,
      tenggat_tanggal: dateValue,
      catatan: goal.catatan || "",
    });
    setIsGoalDialogOpen(true);
  };

  const handleDeleteGoal = async (): Promise<void> => {
    if (!deleteDialog.goal) return;

    try {
      await apiClient.tujuan.deleteTujuan({ id: deleteDialog.goal.id });
      toast({
        title: "Tujuan berhasil dihapus",
        description: "Tujuan telah dihapus dari sistem",
      });
      setDeleteDialog({ open: false, goal: null });
      await loadGoals();
    } catch (error) {
      console.error("Failed to delete goal:", error);
      toast({
        title: "Gagal menghapus tujuan",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus tujuan",
        variant: "destructive",
      });
    }
  };

  const handleAddContribution = (goal: Goal): void => {
    setSelectedGoal(goal);
    setIsContributionDialogOpen(true);
    loadContributions(goal.id);
  };

  const resetGoalForm = (): void => {
    setGoalFormData(INITIAL_GOAL_FORM);
    setEditingGoal(null);
  };

  const resetContributionForm = (): void => {
    setContributionFormData(getInitialContributionForm());
  };

  const getGoalTypeInfo = (type: GoalType): GoalTypeOption => {
    return goalTypes.find(t => t.value === type) || goalTypes[goalTypes.length - 1];
  };

  const calculateProgress = (current: number, target: number): number => {
    const validCurrent = Number.isFinite(current) && current >= 0 ? current : 0;
    const validTarget = Number.isFinite(target) && target > 0 ? target : 1;
    return Math.min((validCurrent / validTarget) * 100, 100);
  };

  const safeFormatCurrency = (value: number | undefined | null): string => {
    const numValue = Number(value);
    return Number.isFinite(numValue) ? formatCurrency(numValue) : formatCurrency(0);
  };

  const getDaysRemaining = (deadline?: string): number | null => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleDialogClose = (open: boolean): void => {
    setIsGoalDialogOpen(open);
    if (!open) resetGoalForm();
  };

  const handleContributionDialogClose = (open: boolean): void => {
    setIsContributionDialogOpen(open);
    if (!open) {
      resetContributionForm();
      setSelectedGoal(null);
    }
  };

  const handleDeleteDialogChange = (open: boolean): void => {
    setDeleteDialog({ open, goal: null });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Tujuan Tabungan</h1>
            <p className="text-gray-600 text-sm sm:text-base truncate">Tetapkan dan capai tujuan keuangan Anda</p>
          </div>
        <Dialog open={isGoalDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Tujuan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
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
                <Select value={goalFormData.jenis_tujuan} onValueChange={(value: GoalType) => setGoalFormData(prev => ({ ...prev, jenis_tujuan: value }))}>
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
                <CurrencyInput
                  value={goalFormData.target_nominal}
                  onChange={(value) => setGoalFormData(prev => ({ ...prev, target_nominal: value }))}
                  placeholder="Masukkan target nominal"
                  required
                  maxLength={12}
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
                  onChange={(e) => setGoalFormData(prev => ({ ...prev, catatan: e.target.value.slice(0, 100) }))}
                  maxLength={100}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsGoalDialogOpen(false)} className="flex-1">
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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

      <Dialog open={isContributionDialogOpen} onOpenChange={handleContributionDialogClose}>
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
              <CurrencyInput
                value={contributionFormData.nominal}
                onChange={(value) => setContributionFormData(prev => ({ ...prev, nominal: value }))}
                placeholder="Masukkan nominal kontribusi"
                required
                maxLength={12}
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
                onChange={(e) => setContributionFormData(prev => ({ ...prev, catatan: e.target.value.slice(0, 100) }))}
                maxLength={100}
              />
            </div>

            {contributions.length > 0 && (
              <div className="space-y-2">
                <Label>Kontribusi Sebelumnya</Label>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {contributions.slice(0, 3).map((contribution) => (
                    <div key={contribution.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                      <span>{safeFormatCurrency(contribution.nominal_kontribusi)}</span>
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <GoalCardSkeleton key={i} />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Belum ada tujuan tabungan. Tambahkan tujuan pertama Anda!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {goals.map((goal) => {
              const typeInfo = getGoalTypeInfo(goal.jenis_tujuan);
              const progress = calculateProgress(goal.nominal_terkumpul, goal.target_nominal);
              const daysRemaining = getDaysRemaining(goal.tenggat_tanggal);
              
              return (
                <Card key={goal.id} className="relative overflow-hidden">
                  <CardHeader className="pb-3 px-4 sm:px-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xl sm:text-2xl flex-shrink-0">{typeInfo.icon}</span>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg truncate" title={goal.nama_tujuan}>
                            {goal.nama_tujuan}
                          </CardTitle>
                          <CardDescription className="text-sm truncate">{typeInfo.label}</CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditGoal(goal)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, goal })}
                          className="text-red-600 hover:text-red-700 hover:bg-red-100 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>Progress</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs sm:text-sm text-gray-600 gap-2">
                        <span className="truncate" title={safeFormatCurrency(goal.nominal_terkumpul)}>
                          {safeFormatCurrency(goal.nominal_terkumpul)}
                        </span>
                        <span className="truncate" title={safeFormatCurrency(goal.target_nominal)}>
                          {safeFormatCurrency(goal.target_nominal)}
                        </span>
                      </div>
                    </div>
                    
                    {goal.tenggat_tanggal && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">
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
                      <p className="text-xs sm:text-sm text-gray-600 truncate" title={goal.catatan}>
                        {goal.catatan}
                      </p>
                    )}
                    
                    <Button 
                      onClick={() => handleAddContribution(goal)}
                      className="w-full text-xs sm:text-sm"
                      size="sm"
                    >
                      <DollarSign className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Tambah Kontribusi</span>
                      <span className="sm:hidden">Kontribusi</span>
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
        onOpenChange={handleDeleteDialogChange}
        title="Hapus Tujuan"
        description={`Apakah Anda yakin ingin menghapus tujuan "${deleteDialog.goal?.nama_tujuan}"? Semua kontribusi yang terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteGoal}
        />
      </div>
    </div>
  );
}