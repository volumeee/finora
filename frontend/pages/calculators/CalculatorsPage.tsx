import React, { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Calculator,
  Home,
  Shield,
  TrendingUp,
  ArrowRight,
  Save,
  History,
  Edit,
  Trash2,
} from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatCurrency } from "@/lib/format";
import apiClient from "@/lib/api-client";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTenant } from "@/contexts/TenantContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface KPRFormData {
  harga_properti: number;
  uang_muka: number;
  suku_bunga_tahunan: number;
  jangka_waktu_tahun: number;
  tipe_bunga: "fixed" | "floating";
}

interface EmergencyFundFormData {
  pengeluaran_bulanan: number;
  jumlah_tanggungan: number;
  jenis_pekerjaan: "tetap" | "freelance" | "bisnis";
  jumlah_bulan: number;
}

interface RetirementFormData {
  usia_sekarang: number;
  usia_pensiun: number;
  pengeluaran_bulanan_sekarang: number;
  inflasi_tahunan: number;
  return_investasi_tahunan: number;
  target_passive_income_bulanan: number;
}

interface CustomGoalFormData {
  target_nominal: number;
  jangka_waktu_bulan: number;
  kontribusi_bulanan: number;
  return_investasi_tahunan: number;
  target_tanggal: string;
}

interface KPRResult {
  angsuran_bulanan: number;
  total_pembayaran: number;
  total_bunga: number;
  uang_muka: number;
  jumlah_pinjaman: number;
  biaya_tambahan: number;
  tabel_angsuran: {
    bulan: number;
    angsuran_pokok: number;
    angsuran_bunga: number;
    total_angsuran: number;
    sisa_pokok: number;
  }[];
}

interface EmergencyResult {
  dana_darurat_minimum?: number;
  dana_darurat_ideal?: number;
  rekomendasi?: string;
  tabungan_bulanan_diperlukan: number;
  target_dana_darurat: number;
  rekomendasi_instrumen: string[];
  skenario: {
    agresif: { jumlah_bulan: number; target_nominal: number };
    konservatif: { jumlah_bulan: number; target_nominal: number };
    moderat: { jumlah_bulan: number; target_nominal: number };
  };
}

interface RetirementResult {
  dana_pensiun_dibutuhkan?: number;
  tabungan_bulanan_dibutuhkan?: number;
  strategi_investasi?: string;
  target_dana_pensiun: number;
  tabungan_bulanan_diperlukan: number;
  tahun_menabung: number;
  nilai_sekarang_target: number;
  rekomendasi_investasi: string[];
  proyeksi_tahunan: {
    tahun: number;
    usia: number;
    kontribusi_tahunan: number;
    nilai_investasi: number;
  }[];
}

interface CustomGoalResult {
  kontribusi_bulanan_dibutuhkan: number;
  total_kontribusi: number;
  proyeksi_return: number;
}

type CalculatorResult = any;

interface Calculator {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface SavedCalculation {
  id: string;
  nama_perhitungan: string;
  tipe_kalkulator: string;
  input_data: any;
  result_data: any;
  created_at: string;
}

export default function CalculatorsPage() {
  const [activeCalculator, setActiveCalculator] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [savedCalculations, setSavedCalculations] = useState<
    SavedCalculation[]
  >([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCalculation, setEditingCalculation] =
    useState<SavedCalculation | null>(null);
  const [saveName, setSaveName] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    calculation: SavedCalculation | null;
  }>({
    open: false,
    calculation: null,
  });
  const itemsPerPage = 12;

  const { currentTenant } = useTenant();
  const { toast } = useToast();

  const [kprData, setKprData] = useState<KPRFormData>({
    harga_properti: 0,
    uang_muka: 0,
    suku_bunga_tahunan: 0,
    jangka_waktu_tahun: 0,
    tipe_bunga: "fixed",
  });

  const [emergencyData, setEmergencyData] = useState<EmergencyFundFormData>({
    pengeluaran_bulanan: 0,
    jumlah_tanggungan: 0,
    jenis_pekerjaan: "tetap",
    jumlah_bulan: 6,
  });

  const [retirementData, setRetirementData] = useState<RetirementFormData>({
    usia_sekarang: 0,
    usia_pensiun: 0,
    pengeluaran_bulanan_sekarang: 0,
    inflasi_tahunan: 0,
    return_investasi_tahunan: 0,
    target_passive_income_bulanan: 0,
  });

  const [customGoalData, setCustomGoalData] = useState<CustomGoalFormData>({
    target_nominal: 0,
    jangka_waktu_bulan: 0,
    kontribusi_bulanan: 0,
    return_investasi_tahunan: 0,
    target_tanggal: "",
  });

  const handleSaveCalculation = useCallback(async () => {
    if (!result || !saveName.trim() || !activeCalculator || !currentTenant)
      return;

    let inputData: any;
    let calculatorType: string;

    switch (activeCalculator) {
      case "kpr":
        inputData = kprData;
        calculatorType = "kpr";
        break;
      case "emergency":
        inputData = emergencyData;
        calculatorType = "emergency";
        break;
      case "retirement":
        inputData = retirementData;
        calculatorType = "retirement";
        break;
      case "custom":
        inputData = customGoalData;
        calculatorType = "custom";
        break;
      default:
        return;
    }

    try {
      await apiClient.kalkulator.saveCalculation({
        tenant_id: currentTenant,
        nama_perhitungan: saveName,
        tipe_kalkulator: calculatorType as any,
        input_data: inputData,
        result_data: result,
      });

      toast({
        title: "Perhitungan berhasil disimpan",
        description: `Perhitungan "${saveName}" telah disimpan`,
      });

      setShowSaveDialog(false);
      setSaveName("");
    } catch (error) {
      toast({
        title: "Gagal menyimpan perhitungan",
        description:
          error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  }, [
    result,
    saveName,
    activeCalculator,
    currentTenant,
    kprData,
    emergencyData,
    retirementData,
    customGoalData,
    toast,
  ]);

  const loadSavedCalculations = useCallback(
    async (calculatorType?: string) => {
      if (!currentTenant) return;

      try {
        const response = await apiClient.kalkulator.getSavedCalculations({
          tenant_id: currentTenant,
          type: calculatorType || undefined,
        });
        setSavedCalculations(response.calculations);
      } catch (error) {
        toast({
          title: "Gagal memuat perhitungan tersimpan",
          description:
            error instanceof Error ? error.message : "Terjadi kesalahan",
          variant: "destructive",
        });
      }
    },
    [currentTenant, toast]
  );

  const loadSavedCalculation = useCallback(
    async (id: string) => {
      if (!currentTenant) return;

      try {
        const calculation = await apiClient.kalkulator.getSavedCalculation({
          id,
          tenant_id: currentTenant,
        });

        // Set form data based on calculator type
        switch (calculation.tipe_kalkulator) {
          case "kpr":
            setKprData(calculation.input_data);
            break;
          case "emergency":
            setEmergencyData(calculation.input_data);
            break;
          case "retirement":
            setRetirementData(calculation.input_data);
            break;
          case "custom":
            setCustomGoalData(calculation.input_data);
            break;
        }

        setResult(calculation.result_data);
        setActiveCalculator(calculation.tipe_kalkulator);
        setShowHistoryDialog(false);

        toast({
          title: "Perhitungan dimuat",
          description: `Perhitungan "${calculation.nama_perhitungan}" berhasil dimuat`,
        });
      } catch (error) {
        toast({
          title: "Gagal memuat perhitungan",
          description:
            error instanceof Error ? error.message : "Terjadi kesalahan",
          variant: "destructive",
        });
      }
    },
    [currentTenant, toast]
  );

  const deleteSavedCalculation = useCallback(
    async (id: string, name: string) => {
      if (!currentTenant) return;

      try {
        await apiClient.kalkulator.deleteCalculation({
          id,
          tenant_id: currentTenant,
        });
        toast({
          title: "Perhitungan dihapus",
          description: `Perhitungan "${name}" berhasil dihapus`,
        });
        loadSavedCalculations();
      } catch (error) {
        toast({
          title: "Gagal menghapus perhitungan",
          description:
            error instanceof Error ? error.message : "Terjadi kesalahan",
          variant: "destructive",
        });
      }
    },
    [currentTenant, toast, loadSavedCalculations]
  );

  const updateSavedCalculation = useCallback(async () => {
    if (!editingCalculation || !saveName.trim() || !currentTenant) return;

    try {
      await apiClient.kalkulator.updateCalculation({
        id: editingCalculation.id,
        tenant_id: currentTenant,
        nama_perhitungan: saveName,
        tipe_kalkulator: editingCalculation.tipe_kalkulator as any,
        input_data: editingCalculation.input_data,
        result_data: editingCalculation.result_data,
      });

      toast({
        title: "Perhitungan berhasil diperbarui",
        description: `Perhitungan "${saveName}" telah diperbarui`,
      });

      setShowEditDialog(false);
      setEditingCalculation(null);
      setSaveName("");
      loadSavedCalculations();
    } catch (error) {
      toast({
        title: "Gagal memperbarui perhitungan",
        description:
          error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  }, [
    editingCalculation,
    saveName,
    currentTenant,
    toast,
    loadSavedCalculations,
  ]);

  const handleEditCalculation = useCallback((calculation: SavedCalculation) => {
    setEditingCalculation(calculation);
    setSaveName(calculation.nama_perhitungan);
    setShowEditDialog(true);
  }, []);

  const calculators: Calculator[] = [
    {
      id: "kpr",
      title: "Kalkulator KPR",
      description: "Hitung cicilan dan simulasi kredit rumah",
      icon: Home,
      color: "bg-blue-500",
    },
    {
      id: "emergency",
      title: "Dana Darurat",
      description: "Tentukan kebutuhan dana darurat Anda",
      icon: Shield,
      color: "bg-green-500",
    },
    {
      id: "retirement",
      title: "Perencanaan Pensiun",
      description: "Rencanakan masa pensiun yang nyaman",
      icon: TrendingUp,
      color: "bg-purple-500",
    },
    {
      id: "custom",
      title: "Tujuan Custom",
      description: "Kalkulator untuk tujuan keuangan khusus",
      icon: Calculator,
      color: "bg-orange-500",
    },
  ];

  const handleKPRCalculation = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate input data
      if (kprData.harga_properti <= 0) {
        toast({
          title: "Data tidak valid",
          description: "Harga properti harus lebih dari 0",
          variant: "destructive",
        });
        return;
      }

      if (kprData.uang_muka >= kprData.harga_properti) {
        toast({
          title: "Data tidak valid",
          description: "Uang muka harus lebih kecil dari harga properti",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      try {
        // Transform frontend data to match backend interface
        const backendData = {
          harga_properti: kprData.harga_properti,
          uang_muka_persen: (kprData.uang_muka / kprData.harga_properti) * 100,
          tenor_tahun: kprData.jangka_waktu_tahun,
          bunga_tahunan_persen: kprData.suku_bunga_tahunan,
          tipe_bunga: kprData.tipe_bunga,
        };
        const response = await apiClient.kalkulator.hitungKPR(backendData);
        setResult(response);
        toast({
          title: "Perhitungan KPR berhasil",
          description: "Hasil simulasi KPR telah dihitung",
        });
      } catch (error) {
        toast({
          title: "Gagal menghitung KPR",
          description:
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat menghitung",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [kprData, toast]
  );

  const handleEmergencyFundCalculation = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate input data
      if (emergencyData.pengeluaran_bulanan <= 0) {
        toast({
          title: "Data tidak valid",
          description: "Pengeluaran bulanan harus lebih dari 0",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      try {
        const response = await apiClient.kalkulator.hitungDanaDarurat(
          emergencyData
        );
        setResult(response);
        toast({
          title: "Perhitungan dana darurat berhasil",
          description: "Kebutuhan dana darurat telah dihitung",
        });
      } catch (error) {
        toast({
          title: "Gagal menghitung dana darurat",
          description:
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat menghitung",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [emergencyData, toast]
  );

  const handleRetirementCalculation = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate input data
      if (
        retirementData.usia_sekarang <= 0 ||
        retirementData.usia_pensiun <= 0
      ) {
        toast({
          title: "Data tidak valid",
          description: "Usia harus lebih dari 0",
          variant: "destructive",
        });
        return;
      }

      if (retirementData.usia_pensiun <= retirementData.usia_sekarang) {
        toast({
          title: "Data tidak valid",
          description: "Usia pensiun harus lebih besar dari usia sekarang",
          variant: "destructive",
        });
        return;
      }

      if (retirementData.target_passive_income_bulanan <= 0) {
        toast({
          title: "Data tidak valid",
          description: "Target passive income harus lebih dari 0",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      try {
        const response = await apiClient.kalkulator.hitungPensiun(
          retirementData
        );
        setResult(response);
        toast({
          title: "Perhitungan pensiun berhasil",
          description: "Rencana pensiun telah dihitung",
        });
      } catch (error) {
        toast({
          title: "Gagal menghitung rencana pensiun",
          description:
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat menghitung",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [retirementData, toast]
  );

  const handleCustomGoalCalculation = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate input data
      if (customGoalData.target_nominal <= 0) {
        toast({
          title: "Data tidak valid",
          description: "Target nominal harus lebih dari 0",
          variant: "destructive",
        });
        return;
      }

      if (customGoalData.jangka_waktu_bulan <= 0) {
        toast({
          title: "Data tidak valid",
          description: "Jangka waktu harus lebih dari 0 bulan",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      try {
        const response = await apiClient.kalkulator.hitungCustomGoal(
          customGoalData
        );
        setResult(response);
        toast({
          title: "Perhitungan tujuan custom berhasil",
          description: "Strategi mencapai tujuan telah dihitung",
        });
      } catch (error) {
        toast({
          title: "Gagal menghitung tujuan custom",
          description:
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat menghitung",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [customGoalData, toast]
  );

  const resetCalculator = useCallback(() => {
    setActiveCalculator(null);
    setResult(null);
    setCurrentPage(1);
    setSaveName("");
    setShowSaveDialog(false);
    setShowHistoryDialog(false);
    setShowEditDialog(false);
    setEditingCalculation(null);
  }, []);

  const renderKPRForm = () => (
    <form onSubmit={handleKPRCalculation} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="harga_properti">Harga Properti</Label>
        <CurrencyInput
          value={kprData.harga_properti}
          onChange={(value) =>
            setKprData((prev) => ({ ...prev, harga_properti: value }))
          }
          placeholder="500.000.000"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="uang_muka">Uang Muka</Label>
        <CurrencyInput
          value={kprData.uang_muka}
          onChange={(value) =>
            setKprData((prev) => ({ ...prev, uang_muka: value }))
          }
          placeholder="100.000.000"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="suku_bunga_tahunan">Suku Bunga Tahunan (%)</Label>
        <Input
          id="suku_bunga_tahunan"
          type="number"
          step="0.1"
          placeholder="8.5"
          value={kprData.suku_bunga_tahunan || ""}
          onChange={(e) =>
            setKprData((prev) => ({
              ...prev,
              suku_bunga_tahunan: parseFloat(e.target.value) || 0,
            }))
          }
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="jangka_waktu_tahun">Jangka Waktu (Tahun)</Label>
        <Input
          id="jangka_waktu_tahun"
          type="number"
          placeholder="15"
          value={kprData.jangka_waktu_tahun || ""}
          onChange={(e) =>
            setKprData((prev) => ({
              ...prev,
              jangka_waktu_tahun: parseInt(e.target.value) || 0,
            }))
          }
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tipe_bunga">Tipe Bunga</Label>
        <Select
          value={kprData.tipe_bunga}
          onValueChange={(value: "fixed" | "floating") =>
            setKprData((prev) => ({ ...prev, tipe_bunga: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih tipe bunga" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed Rate</SelectItem>
            <SelectItem value="floating">Floating Rate</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
        Hitung KPR
      </Button>
    </form>
  );

  const renderEmergencyForm = () => (
    <form onSubmit={handleEmergencyFundCalculation} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pengeluaran_bulanan">Pengeluaran Bulanan</Label>
        <CurrencyInput
          value={emergencyData.pengeluaran_bulanan}
          onChange={(value) =>
            setEmergencyData((prev) => ({
              ...prev,
              pengeluaran_bulanan: value,
            }))
          }
          placeholder="5.000.000"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="jumlah_tanggungan">Jumlah Tanggungan</Label>
        <Input
          id="jumlah_tanggungan"
          type="number"
          placeholder="3"
          value={emergencyData.jumlah_tanggungan || ""}
          onChange={(e) =>
            setEmergencyData((prev) => ({
              ...prev,
              jumlah_tanggungan: parseInt(e.target.value) || 0,
            }))
          }
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="jenis_pekerjaan">Jenis Pekerjaan</Label>
        <Select
          value={emergencyData.jenis_pekerjaan}
          onValueChange={(value: "tetap" | "freelance" | "bisnis") =>
            setEmergencyData((prev) => ({ ...prev, jenis_pekerjaan: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih jenis pekerjaan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tetap">Karyawan Tetap</SelectItem>
            <SelectItem value="freelance">Freelancer</SelectItem>
            <SelectItem value="bisnis">Pemilik Bisnis</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
        Hitung Dana Darurat
      </Button>
    </form>
  );

  const renderRetirementForm = () => (
    <form onSubmit={handleRetirementCalculation} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="usia_sekarang">Usia Sekarang</Label>
        <Input
          id="usia_sekarang"
          type="number"
          placeholder="30"
          value={retirementData.usia_sekarang || ""}
          onChange={(e) =>
            setRetirementData((prev) => ({
              ...prev,
              usia_sekarang: parseInt(e.target.value) || 0,
            }))
          }
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="usia_pensiun">Usia Pensiun</Label>
        <Input
          id="usia_pensiun"
          type="number"
          placeholder="60"
          value={retirementData.usia_pensiun || ""}
          onChange={(e) =>
            setRetirementData((prev) => ({
              ...prev,
              usia_pensiun: parseInt(e.target.value) || 0,
            }))
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="inflasi_tahunan">Inflasi Tahunan (%)</Label>
        <Input
          id="inflasi_tahunan"
          type="number"
          step="0.1"
          placeholder="3.5"
          value={retirementData.inflasi_tahunan || ""}
          onChange={(e) =>
            setRetirementData((prev) => ({
              ...prev,
              inflasi_tahunan: parseFloat(e.target.value) || 0,
            }))
          }
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="return_investasi_tahunan">
          Return Investasi Tahunan (%)
        </Label>
        <Input
          id="return_investasi_tahunan"
          type="number"
          step="0.1"
          placeholder="10"
          value={retirementData.return_investasi_tahunan || ""}
          onChange={(e) =>
            setRetirementData((prev) => ({
              ...prev,
              return_investasi_tahunan: parseFloat(e.target.value) || 0,
            }))
          }
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="target_passive_income_bulanan">
          Target Passive Income Bulanan
        </Label>
        <CurrencyInput
          value={retirementData.target_passive_income_bulanan}
          onChange={(value) =>
            setRetirementData((prev) => ({
              ...prev,
              target_passive_income_bulanan: value,
            }))
          }
          placeholder="5.000.000"
          required
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
        Hitung Rencana Pensiun
      </Button>
    </form>
  );

  const renderCustomGoalForm = () => (
    <form onSubmit={handleCustomGoalCalculation} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="target_nominal">Target Nominal</Label>
        <CurrencyInput
          value={customGoalData.target_nominal}
          onChange={(value) =>
            setCustomGoalData((prev) => ({ ...prev, target_nominal: value }))
          }
          placeholder="100.000.000"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="jangka_waktu_bulan">Jangka Waktu (Bulan)</Label>
        <Input
          id="jangka_waktu_bulan"
          type="number"
          placeholder="24"
          value={customGoalData.jangka_waktu_bulan || ""}
          onChange={(e) =>
            setCustomGoalData((prev) => ({
              ...prev,
              jangka_waktu_bulan: parseInt(e.target.value) || 0,
            }))
          }
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kontribusi_bulanan">
          Kontribusi Bulanan (Opsional)
        </Label>
        <CurrencyInput
          value={customGoalData.kontribusi_bulanan}
          onChange={(value) =>
            setCustomGoalData((prev) => ({
              ...prev,
              kontribusi_bulanan: value,
            }))
          }
          placeholder="2.000.000"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="return_investasi_tahunan_custom">
          Return Investasi Tahunan (%)
        </Label>
        <Input
          id="return_investasi_tahunan_custom"
          type="number"
          step="0.1"
          placeholder="8"
          value={customGoalData.return_investasi_tahunan || ""}
          onChange={(e) =>
            setCustomGoalData((prev) => ({
              ...prev,
              return_investasi_tahunan: parseFloat(e.target.value) || 0,
            }))
          }
          required
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
        Hitung Strategi Tujuan
      </Button>
    </form>
  );

  const renderHistoryItem = (calc: SavedCalculation) => {
    const getCalculatorName = (type: string) => {
      switch (type) {
        case "kpr":
          return "KPR";
        case "emergency":
          return "Dana Darurat";
        case "retirement":
          return "Pensiun";
        case "custom":
          return "Tujuan Custom";
        default:
          return type;
      }
    };

    const getResultSummary = (type: string, data: any) => {
      switch (type) {
        case "kpr":
          return `Angsuran: ${formatCurrency(
            data.angsuran_bulanan || 0
          )}/bulan`;
        case "emergency":
          return `Target: ${formatCurrency(
            data.target_dana_darurat || data.dana_darurat_ideal || 0
          )}`;
        case "retirement":
          return `Tabungan: ${formatCurrency(
            data.tabungan_bulanan_diperlukan || 0
          )}/bulan`;
        case "custom":
          return `Kontribusi: ${formatCurrency(
            data.kontribusi_bulanan_dibutuhkan || 0
          )}/bulan`;
        default:
          return "";
      }
    };

    return (
      <div key={calc.id} className="border rounded-lg p-4 hover:bg-gray-50">
        <div className="flex justify-between items-start">
          <div
            className="flex-1 cursor-pointer"
            onClick={() => loadSavedCalculation(calc.id)}
          >
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{calc.nama_perhitungan}</h4>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {getCalculatorName(calc.tipe_kalkulator)}
              </span>
            </div>
            <p className="text-sm font-medium text-blue-600 mt-1">
              {getResultSummary(calc.tipe_kalkulator, calc.result_data)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(calc.created_at).toLocaleDateString("id-ID")}
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleEditCalculation(calc);
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteDialog({ open: true, calculation: calc });
              }}
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Hasil Perhitungan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeCalculator === "kpr" && "angsuran_bulanan" in result && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 font-medium">
                    Angsuran Bulanan
                  </p>
                  <p className="text-xl font-bold text-blue-800">
                    {formatCurrency(result.angsuran_bulanan || 0)}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-600 font-medium">
                    Uang Muka
                  </p>
                  <p className="text-xl font-bold text-green-800">
                    {formatCurrency(result.uang_muka || 0)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 font-medium">
                    Jumlah Pinjaman
                  </p>
                  <p className="text-xl font-bold text-gray-800">
                    {formatCurrency(result.jumlah_pinjaman || 0)}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm text-red-600 font-medium">
                    Total Bunga
                  </p>
                  <p className="text-xl font-bold text-red-800">
                    {formatCurrency(result.total_bunga || 0)}
                  </p>
                </div>
              </div>

              {/* Total Payment */}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex justify-between items-center">
                  <span className="text-purple-600 font-medium">
                    Total Pembayaran:
                  </span>
                  <span className="text-2xl font-bold text-purple-800">
                    {formatCurrency(result.total_pembayaran || 0)}
                  </span>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex gap-2">
                <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Simpan Perhitungan
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Simpan Perhitungan</DialogTitle>
                      <DialogDescription>
                        Berikan nama untuk perhitungan ini agar mudah ditemukan
                        nanti
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="save-name">Nama Perhitungan</Label>
                        <Input
                          id="save-name"
                          value={saveName}
                          onChange={(e) => setSaveName(e.target.value)}
                          placeholder="Contoh: Rumah Impian Jakarta"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setShowSaveDialog(false)}
                          variant="outline"
                          className="flex-1"
                        >
                          Batal
                        </Button>
                        <Button
                          onClick={handleSaveCalculation}
                          disabled={!saveName.trim()}
                          className="flex-1"
                        >
                          Simpan
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={showHistoryDialog}
                  onOpenChange={(open) => {
                    setShowHistoryDialog(open);
                    if (open) loadSavedCalculations(activeCalculator);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <History className="h-4 w-4 mr-2" />
                      Riwayat
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Riwayat Perhitungan</DialogTitle>
                      <DialogDescription>
                        Pilih perhitungan yang ingin dimuat kembali
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-96 overflow-y-auto">
                      {savedCalculations.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                          Belum ada perhitungan tersimpan
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {savedCalculations.map(renderHistoryItem)}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Amortization Table */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-4">Tabel Angsuran</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-3 py-2 text-left">
                          Bulan
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-right">
                          Angsuran Pokok
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-right">
                          Angsuran Bunga
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-right">
                          Total Angsuran
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-right">
                          Sisa Pokok
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(result.tabel_angsuran || [])
                        .slice(
                          (currentPage - 1) * itemsPerPage,
                          currentPage * itemsPerPage
                        )
                        .map((row: any) => (
                          <tr key={row.bulan} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-3 py-2 font-medium">
                              {row.bulan}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right">
                              {formatCurrency(row.angsuran_pokok)}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right text-red-600">
                              {formatCurrency(row.angsuran_bunga)}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                              {formatCurrency(row.total_angsuran)}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-right text-blue-600">
                              {formatCurrency(row.sisa_pokok)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{" "}
                    {Math.min(
                      currentPage * itemsPerPage,
                      result.tabel_angsuran.length
                    )}{" "}
                    dari {result.tabel_angsuran?.length || 0} bulan
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Sebelumnya
                    </Button>
                    <span className="text-sm text-gray-600">
                      Halaman {currentPage} dari{" "}
                      {Math.ceil(
                        (result.tabel_angsuran?.length || 0) / itemsPerPage
                      )}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(
                            prev + 1,
                            Math.ceil(
                              result.tabel_angsuran.length / itemsPerPage
                            )
                          )
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(
                          (result.tabel_angsuran?.length || 0) / itemsPerPage
                        )
                      }
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCalculator === "emergency" &&
            (result?.tabungan_bulanan_diperlukan ||
              result?.dana_darurat_minimum) && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {result?.tabungan_bulanan_diperlukan ? (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-600 font-medium">
                        Tabungan Bulanan Diperlukan
                      </p>
                      <p className="text-xl font-bold text-blue-800">
                        {formatCurrency(result.tabungan_bulanan_diperlukan)}
                      </p>
                    </div>
                  ) : result?.dana_darurat_minimum ? (
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <p className="text-sm text-orange-600 font-medium">
                        Dana Darurat Minimum
                      </p>
                      <p className="text-xl font-bold text-orange-800">
                        {formatCurrency(result.dana_darurat_minimum)}
                      </p>
                    </div>
                  ) : null}

                  {result?.target_dana_darurat ? (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-600 font-medium">
                        Target Dana Darurat
                      </p>
                      <p className="text-xl font-bold text-green-800">
                        {formatCurrency(result.target_dana_darurat)}
                      </p>
                    </div>
                  ) : result?.dana_darurat_ideal ? (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-600 font-medium">
                        Dana Darurat Ideal
                      </p>
                      <p className="text-xl font-bold text-green-800">
                        {formatCurrency(result.dana_darurat_ideal)}
                      </p>
                    </div>
                  ) : null}
                </div>

                {result.skenario && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800">
                      Skenario Dana Darurat
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <p className="text-xs text-red-600 font-medium">
                          Konservatif
                        </p>
                        <p className="text-sm font-bold text-red-800">
                          {formatCurrency(
                            result.skenario.konservatif.target_nominal
                          )}
                        </p>
                        <p className="text-xs text-red-600">
                          {result.skenario.konservatif.jumlah_bulan} bulan
                        </p>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <p className="text-xs text-yellow-600 font-medium">
                          Moderat
                        </p>
                        <p className="text-sm font-bold text-yellow-800">
                          {formatCurrency(
                            result.skenario.moderat.target_nominal
                          )}
                        </p>
                        <p className="text-xs text-yellow-600">
                          {result.skenario.moderat.jumlah_bulan} bulan
                        </p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <p className="text-xs text-purple-600 font-medium">
                          Agresif
                        </p>
                        <p className="text-sm font-bold text-purple-800">
                          {formatCurrency(
                            result.skenario.agresif.target_nominal
                          )}
                        </p>
                        <p className="text-xs text-purple-600">
                          {result.skenario.agresif.jumlah_bulan} bulan
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {result.rekomendasi_instrumen && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-800">
                      Rekomendasi Instrumen
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {result.rekomendasi_instrumen.map(
                        (instrumen: any, index: any) => (
                          <div
                            key={index}
                            className="bg-gray-50 p-2 rounded border text-sm text-gray-700"
                          >
                            {instrumen}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {result.rekomendasi && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {result.rekomendasi}
                    </p>
                  </div>
                )}

                {/* Save/Load Buttons */}
                <div className="flex gap-2 mt-4">
                  <Dialog
                    open={showSaveDialog}
                    onOpenChange={setShowSaveDialog}
                  >
                    <DialogTrigger asChild>
                      <Button className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        Simpan Perhitungan
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Simpan Perhitungan</DialogTitle>
                        <DialogDescription>
                          Berikan nama untuk perhitungan ini agar mudah
                          ditemukan nanti
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="save-name">Nama Perhitungan</Label>
                          <Input
                            id="save-name"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            placeholder="Contoh: Dana Darurat Keluarga"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setShowSaveDialog(false)}
                            variant="outline"
                            className="flex-1"
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={handleSaveCalculation}
                            disabled={!saveName.trim()}
                            className="flex-1"
                          >
                            Simpan
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={showHistoryDialog}
                    onOpenChange={(open) => {
                      setShowHistoryDialog(open);
                      if (open) loadSavedCalculations();
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <History className="h-4 w-4 mr-2" />
                        Riwayat
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Riwayat Perhitungan</DialogTitle>
                        <DialogDescription>
                          Pilih perhitungan yang ingin dimuat kembali
                        </DialogDescription>
                      </DialogHeader>
                      <div className="max-h-96 overflow-y-auto">
                        {savedCalculations.length === 0 ? (
                          <p className="text-center text-gray-500 py-8">
                            Belum ada perhitungan tersimpan
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {savedCalculations.map(renderHistoryItem)}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}

          {activeCalculator === "retirement" &&
            ("target_dana_pensiun" in result ||
              "dana_pensiun_dibutuhkan" in result) && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-600 font-medium">
                      Target Dana Pensiun
                    </p>
                    <p className="text-xl font-bold text-purple-800">
                      {formatCurrency(
                        result.target_dana_pensiun ||
                          result.dana_pensiun_dibutuhkan ||
                          0
                      )}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600 font-medium">
                      Tabungan Bulanan
                    </p>
                    <p className="text-xl font-bold text-blue-800">
                      {formatCurrency(
                        result.tabungan_bulanan_diperlukan ||
                          result.tabungan_bulanan_dibutuhkan ||
                          0
                      )}
                    </p>
                  </div>
                </div>

                {result.tahun_menabung && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-green-600 font-medium">
                      Periode Menabung
                    </p>
                    <p className="text-xl font-bold text-green-800">
                      {result.tahun_menabung} tahun
                    </p>
                  </div>
                )}

                {result.rekomendasi_investasi && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-800">
                      Rekomendasi Investasi
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {result.rekomendasi_investasi.map(
                        (investasi: any, index: any) => (
                          <div
                            key={index}
                            className="bg-gray-50 p-2 rounded border text-sm text-gray-700"
                          >
                            {investasi}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {result.proyeksi_tahunan && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800">
                      Proyeksi 10 Tahun Pertama
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-3 py-2 text-left">
                              Tahun
                            </th>
                            <th className="border border-gray-300 px-3 py-2 text-left">
                              Usia
                            </th>
                            <th className="border border-gray-300 px-3 py-2 text-right">
                              Kontribusi
                            </th>
                            <th className="border border-gray-300 px-3 py-2 text-right">
                              Nilai Investasi
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.proyeksi_tahunan
                            .slice(0, 10)
                            .map((proyeksi: any) => (
                              <tr
                                key={proyeksi.tahun}
                                className="hover:bg-gray-50"
                              >
                                <td className="border border-gray-300 px-3 py-2">
                                  {proyeksi.tahun}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  {proyeksi.usia}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right">
                                  {formatCurrency(proyeksi.kontribusi_tahunan)}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                                  {formatCurrency(proyeksi.nilai_investasi)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result.strategi_investasi && (
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-sm text-purple-800">
                      {result.strategi_investasi}
                    </p>
                  </div>
                )}

                {/* Save/Load Buttons */}
                <div className="flex gap-2 mt-4">
                  <Dialog
                    open={showSaveDialog}
                    onOpenChange={setShowSaveDialog}
                  >
                    <DialogTrigger asChild>
                      <Button className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        Simpan Perhitungan
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Simpan Perhitungan</DialogTitle>
                        <DialogDescription>
                          Berikan nama untuk perhitungan ini agar mudah
                          ditemukan nanti
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="save-name">Nama Perhitungan</Label>
                          <Input
                            id="save-name"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            placeholder="Contoh: Dana Darurat Keluarga"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setShowSaveDialog(false)}
                            variant="outline"
                            className="flex-1"
                          >
                            Batal
                          </Button>
                          <Button
                            onClick={handleSaveCalculation}
                            disabled={!saveName.trim()}
                            className="flex-1"
                          >
                            Simpan
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={showHistoryDialog}
                    onOpenChange={(open) => {
                      setShowHistoryDialog(open);
                      if (open) loadSavedCalculations();
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <History className="h-4 w-4 mr-2" />
                        Riwayat
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Riwayat Perhitungan</DialogTitle>
                        <DialogDescription>
                          Pilih perhitungan yang ingin dimuat kembali
                        </DialogDescription>
                      </DialogHeader>
                      <div className="max-h-96 overflow-y-auto">
                        {savedCalculations.length === 0 ? (
                          <p className="text-center text-gray-500 py-8">
                            Belum ada perhitungan tersimpan
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {savedCalculations.map(renderHistoryItem)}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}

          {activeCalculator === "custom" &&
            "kontribusi_bulanan_dibutuhkan" in result && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Kontribusi Bulanan Dibutuhkan:
                  </span>
                  <span className="font-semibold text-lg text-blue-600">
                    {formatCurrency(result.kontribusi_bulanan_dibutuhkan)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Total Kontribusi:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(result.total_kontribusi)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Proyeksi Return:
                  </span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(result.proyeksi_return)}
                  </span>
                </div>

                {/* Save/Load Buttons */}
                <div className="flex gap-2 mt-4">
                  <Dialog
                    open={showSaveDialog}
                    onOpenChange={setShowSaveDialog}
                  >
                    <DialogTrigger asChild>
                      <Button className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        Simpan Perhitungan
                      </Button>
                    </DialogTrigger>
                  </Dialog>

                  <Dialog
                    open={showHistoryDialog}
                    onOpenChange={(open) => {
                      setShowHistoryDialog(open);
                      if (open) loadSavedCalculations();
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <History className="h-4 w-4 mr-2" />
                        Riwayat
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Riwayat Perhitungan</DialogTitle>
                        <DialogDescription>
                          Pilih perhitungan yang ingin dimuat kembali
                        </DialogDescription>
                      </DialogHeader>
                      <div className="max-h-96 overflow-y-auto">
                        {savedCalculations.length === 0 ? (
                          <p className="text-center text-gray-500 py-8">
                            Belum ada perhitungan tersimpan
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {savedCalculations.map(renderHistoryItem)}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    );
  };

  // Load saved calculations when calculator changes
  React.useEffect(() => {
    if (activeCalculator && currentTenant) {
      loadSavedCalculations(activeCalculator);
    }
  }, [activeCalculator, currentTenant, loadSavedCalculations]);

  if (activeCalculator) {
    const calculator = calculators.find((c) => c.id === activeCalculator);
    if (!calculator) return null;

    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Button
              variant="outline"
              onClick={resetCalculator}
              className="w-fit"
            >
              ← Kembali
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {calculator.title}
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {calculator.description}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Input Data</CardTitle>
                <CardDescription>
                  Masukkan data untuk perhitungan
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeCalculator === "kpr" && renderKPRForm()}
                {activeCalculator === "emergency" && renderEmergencyForm()}
                {activeCalculator === "retirement" && renderRetirementForm()}
                {activeCalculator === "custom" && renderCustomGoalForm()}
              </CardContent>
            </Card>

            <div className="space-y-6">
              {renderResult()}

              {/* History Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Riwayat Perhitungan</CardTitle>
                  <CardDescription>
                    Perhitungan yang pernah disimpan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {savedCalculations
                      .filter(
                        (calc) => calc.tipe_kalkulator === activeCalculator
                      )
                      .slice(0, 5)
                      .map(renderHistoryItem)}
                    {savedCalculations.filter(
                      (calc) => calc.tipe_kalkulator === activeCalculator
                    ).length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        Belum ada perhitungan tersimpan
                      </p>
                    )}
                    {savedCalculations.filter(
                      (calc) => calc.tipe_kalkulator === activeCalculator
                    ).length > 5 && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setShowHistoryDialog(true);
                          loadSavedCalculations(activeCalculator);
                        }}
                      >
                        Lihat Semua Riwayat
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Perhitungan</DialogTitle>
              <DialogDescription>Ubah nama perhitungan</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nama Perhitungan</Label>
                <Input
                  id="edit-name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Masukkan nama baru"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingCalculation(null);
                    setSaveName("");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={updateSavedCalculation}
                  disabled={!saveName.trim()}
                  className="flex-1"
                >
                  Simpan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ open, calculation: null })}
          title="Hapus Perhitungan"
          description={`Apakah Anda yakin ingin menghapus perhitungan "${deleteDialog.calculation?.nama_perhitungan}"? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={() => {
            if (deleteDialog.calculation) {
              deleteSavedCalculation(
                deleteDialog.calculation.id,
                deleteDialog.calculation.nama_perhitungan
              );
              setDeleteDialog({ open: false, calculation: null });
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Kalkulator Keuangan
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Alat bantu untuk perencanaan keuangan Anda
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {calculators.map((calc) => (
            <Card
              key={calc.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setActiveCalculator(calc.id)}
            >
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${calc.color}`}>
                    <calc.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{calc.title}</CardTitle>
                    <CardDescription>{calc.description}</CardDescription>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Klik untuk menggunakan kalkulator
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
