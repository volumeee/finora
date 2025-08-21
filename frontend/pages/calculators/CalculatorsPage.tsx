import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Calculator, Home, Shield, TrendingUp, ArrowRight } from 'lucide-react';
import apiClient from '@/lib/api-client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface KPRFormData {
  harga_properti: number;
  uang_muka: number;
  suku_bunga_tahunan: number;
  jangka_waktu_tahun: number;
}

interface EmergencyFundFormData {
  pengeluaran_bulanan: number;
  jumlah_tanggungan: number;
  jenis_pekerjaan: 'tetap' | 'freelance' | 'bisnis';
  jumlah_bulan: number;
}

interface RetirementFormData {
  usia_sekarang: number;
  usia_pensiun: number;
  pengeluaran_bulanan_sekarang: number;
  inflasi_tahunan: number;
  return_investasi_tahunan: number;
}

interface CustomGoalFormData {
  target_nominal: number;
  jangka_waktu_bulan: number;
  kontribusi_bulanan: number;
  return_investasi_tahunan: number;
}

export default function CalculatorsPage() {
  const [activeCalculator, setActiveCalculator] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [kprData, setKprData] = useState<KPRFormData>({
    harga_properti: 0,
    uang_muka: 0,
    suku_bunga_tahunan: 0,
    jangka_waktu_tahun: 0
  });
  
  const [emergencyData, setEmergencyData] = useState<EmergencyFundFormData>({
    pengeluaran_bulanan: 0,
    jumlah_tanggungan: 0,
    jenis_pekerjaan: 'tetap',
    jumlah_bulan: 6
  });
  
  const [retirementData, setRetirementData] = useState<RetirementFormData>({
    usia_sekarang: 0,
    usia_pensiun: 0,
    pengeluaran_bulanan_sekarang: 0,
    inflasi_tahunan: 0,
    return_investasi_tahunan: 0
  });
  
  const [customGoalData, setCustomGoalData] = useState<CustomGoalFormData>({
    target_nominal: 0,
    jangka_waktu_bulan: 0,
    kontribusi_bulanan: 0,
    return_investasi_tahunan: 0
  });

  const { toast } = useToast();

  const calculators = [
    {
      id: 'kpr',
      title: 'Kalkulator KPR',
      description: 'Hitung cicilan dan simulasi kredit rumah',
      icon: Home,
      color: 'bg-blue-500'
    },
    {
      id: 'emergency',
      title: 'Dana Darurat',
      description: 'Tentukan kebutuhan dana darurat Anda',
      icon: Shield,
      color: 'bg-green-500'
    },
    {
      id: 'retirement',
      title: 'Perencanaan Pensiun',
      description: 'Rencanakan masa pensiun yang nyaman',
      icon: TrendingUp,
      color: 'bg-purple-500'
    },
    {
      id: 'custom',
      title: 'Tujuan Custom',
      description: 'Kalkulator untuk tujuan keuangan khusus',
      icon: Calculator,
      color: 'bg-orange-500'
    }
  ];

  const handleKPRCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await apiClient.kalkulator.hitungKPR(kprData);
      setResult(response);
      toast({
        title: "Perhitungan KPR berhasil",
        description: "Hasil simulasi KPR telah dihitung",
      });
    } catch (error: any) {
      console.error('KPR calculation failed:', error);
      toast({
        title: "Gagal menghitung KPR",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghitung",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyFundCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await apiClient.kalkulator.hitungDanaDarurat(emergencyData);
      setResult(response);
      toast({
        title: "Perhitungan dana darurat berhasil",
        description: "Kebutuhan dana darurat telah dihitung",
      });
    } catch (error: any) {
      console.error('Emergency fund calculation failed:', error);
      toast({
        title: "Gagal menghitung dana darurat",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghitung",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetirementCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await apiClient.kalkulator.hitungPensiun(retirementData);
      setResult(response);
      toast({
        title: "Perhitungan pensiun berhasil",
        description: "Rencana pensiun telah dihitung",
      });
    } catch (error: any) {
      console.error('Retirement calculation failed:', error);
      toast({
        title: "Gagal menghitung rencana pensiun",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghitung",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomGoalCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await apiClient.kalkulator.hitungCustomGoal(customGoalData);
      setResult(response);
      toast({
        title: "Perhitungan tujuan custom berhasil",
        description: "Strategi mencapai tujuan telah dihitung",
      });
    } catch (error: any) {
      console.error('Custom goal calculation failed:', error);
      toast({
        title: "Gagal menghitung tujuan custom",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghitung",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const resetCalculator = () => {
    setActiveCalculator(null);
    setResult(null);
  };

  const renderKPRForm = () => (
    <form onSubmit={handleKPRCalculation} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="harga_properti">Harga Properti</Label>
        <Input
          id="harga_properti"
          type="number"
          placeholder="500000000"
          value={kprData.harga_properti}
          onChange={(e) => setKprData(prev => ({ ...prev, harga_properti: parseFloat(e.target.value) || 0 }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="uang_muka">Uang Muka</Label>
        <Input
          id="uang_muka"
          type="number"
          placeholder="100000000"
          value={kprData.uang_muka}
          onChange={(e) => setKprData(prev => ({ ...prev, uang_muka: parseFloat(e.target.value) || 0 }))}
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
          value={kprData.suku_bunga_tahunan}
          onChange={(e) => setKprData(prev => ({ ...prev, suku_bunga_tahunan: parseFloat(e.target.value) || 0 }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="jangka_waktu_tahun">Jangka Waktu (Tahun)</Label>
        <Input
          id="jangka_waktu_tahun"
          type="number"
          placeholder="15"
          value={kprData.jangka_waktu_tahun}
          onChange={(e) => setKprData(prev => ({ ...prev, jangka_waktu_tahun: parseFloat(e.target.value) || 0 }))}
          required
        />
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
        <Input
          id="pengeluaran_bulanan"
          type="number"
          placeholder="5000000"
          value={emergencyData.pengeluaran_bulanan}
          onChange={(e) => setEmergencyData(prev => ({ ...prev, pengeluaran_bulanan: parseFloat(e.target.value) || 0 }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="jumlah_tanggungan">Jumlah Tanggungan</Label>
        <Input
          id="jumlah_tanggungan"
          type="number"
          placeholder="3"
          value={emergencyData.jumlah_tanggungan}
          onChange={(e) => setEmergencyData(prev => ({ ...prev, jumlah_tanggungan: parseInt(e.target.value) || 0 }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="jenis_pekerjaan">Jenis Pekerjaan</Label>
        <Select value={emergencyData.jenis_pekerjaan} onValueChange={(value: any) => setEmergencyData(prev => ({ ...prev, jenis_pekerjaan: value }))}>
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
          value={retirementData.usia_sekarang}
          onChange={(e) => setRetirementData(prev => ({ ...prev, usia_sekarang: parseInt(e.target.value) || 0 }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="usia_pensiun">Usia Pensiun</Label>
        <Input
          id="usia_pensiun"
          type="number"
          placeholder="60"
          value={retirementData.usia_pensiun}
          onChange={(e) => setRetirementData(prev => ({ ...prev, usia_pensiun: parseInt(e.target.value) || 0 }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pengeluaran_bulanan_sekarang">Pengeluaran Bulanan Sekarang</Label>
        <Input
          id="pengeluaran_bulanan_sekarang"
          type="number"
          placeholder="8000000"
          value={retirementData.pengeluaran_bulanan_sekarang}
          onChange={(e) => setRetirementData(prev => ({ ...prev, pengeluaran_bulanan_sekarang: parseFloat(e.target.value) || 0 }))}
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
          value={retirementData.inflasi_tahunan}
          onChange={(e) => setRetirementData(prev => ({ ...prev, inflasi_tahunan: parseFloat(e.target.value) || 0 }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="return_investasi_tahunan">Return Investasi Tahunan (%)</Label>
        <Input
          id="return_investasi_tahunan"
          type="number"
          step="0.1"
          placeholder="10"
          value={retirementData.return_investasi_tahunan}
          onChange={(e) => setRetirementData(prev => ({ ...prev, return_investasi_tahunan: parseFloat(e.target.value) || 0 }))}
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
        <Input
          id="target_nominal"
          type="number"
          placeholder="100000000"
          value={customGoalData.target_nominal}
          onChange={(e) => setCustomGoalData(prev => ({ ...prev, target_nominal: parseFloat(e.target.value) || 0 }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="jangka_waktu_bulan">Jangka Waktu (Bulan)</Label>
        <Input
          id="jangka_waktu_bulan"
          type="number"
          placeholder="24"
          value={customGoalData.jangka_waktu_bulan}
          onChange={(e) => setCustomGoalData(prev => ({ ...prev, jangka_waktu_bulan: parseInt(e.target.value) || 0 }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kontribusi_bulanan">Kontribusi Bulanan (Opsional)</Label>
        <Input
          id="kontribusi_bulanan"
          type="number"
          placeholder="2000000"
          value={customGoalData.kontribusi_bulanan}
          onChange={(e) => setCustomGoalData(prev => ({ ...prev, kontribusi_bulanan: parseFloat(e.target.value) || 0 }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="return_investasi_tahunan_custom">Return Investasi Tahunan (%)</Label>
        <Input
          id="return_investasi_tahunan_custom"
          type="number"
          step="0.1"
          placeholder="8"
          value={customGoalData.return_investasi_tahunan}
          onChange={(e) => setCustomGoalData(prev => ({ ...prev, return_investasi_tahunan: parseFloat(e.target.value) || 0 }))}
          required
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
        Hitung Strategi Tujuan
      </Button>
    </form>
  );

  const renderResult = () => {
    if (!result) return null;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Hasil Perhitungan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeCalculator === 'kpr' && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Cicilan Bulanan:</span>
                <span className="font-semibold">{formatCurrency(result.cicilan_bulanan)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Pembayaran:</span>
                <span className="font-semibold">{formatCurrency(result.total_pembayaran)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Bunga:</span>
                <span className="font-semibold">{formatCurrency(result.total_bunga)}</span>
              </div>
            </div>
          )}
          
          {activeCalculator === 'emergency' && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Dana Darurat Minimum:</span>
                <span className="font-semibold">{formatCurrency(result.dana_darurat_minimum)}</span>
              </div>
              <div className="flex justify-between">
                <span>Dana Darurat Ideal:</span>
                <span className="font-semibold">{formatCurrency(result.dana_darurat_ideal)}</span>
              </div>
              <div className="text-sm text-gray-600">
                <p>{result.rekomendasi}</p>
              </div>
            </div>
          )}
          
          {activeCalculator === 'retirement' && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Dana Pensiun Dibutuhkan:</span>
                <span className="font-semibold">{formatCurrency(result.dana_pensiun_dibutuhkan)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tabungan Bulanan:</span>
                <span className="font-semibold">{formatCurrency(result.tabungan_bulanan_dibutuhkan)}</span>
              </div>
              <div className="text-sm text-gray-600">
                <p>{result.strategi_investasi}</p>
              </div>
            </div>
          )}
          
          {activeCalculator === 'custom' && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Kontribusi Bulanan Dibutuhkan:</span>
                <span className="font-semibold">{formatCurrency(result.kontribusi_bulanan_dibutuhkan)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Kontribusi:</span>
                <span className="font-semibold">{formatCurrency(result.total_kontribusi)}</span>
              </div>
              <div className="flex justify-between">
                <span>Proyeksi Return:</span>
                <span className="font-semibold">{formatCurrency(result.proyeksi_return)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (activeCalculator) {
    const calculator = calculators.find(c => c.id === activeCalculator);
    if (!calculator) return null;

    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Button variant="outline" onClick={resetCalculator} className="w-fit">
              ← Kembali
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{calculator.title}</h1>
              <p className="text-gray-600 text-sm sm:text-base">{calculator.description}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Data</CardTitle>
              <CardDescription>Masukkan data untuk perhitungan</CardDescription>
            </CardHeader>
            <CardContent>
              {activeCalculator === 'kpr' && renderKPRForm()}
              {activeCalculator === 'emergency' && renderEmergencyForm()}
              {activeCalculator === 'retirement' && renderRetirementForm()}
              {activeCalculator === 'custom' && renderCustomGoalForm()}
            </CardContent>
          </Card>

          <div>
            {renderResult()}
          </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Kalkulator Keuangan</h1>
          <p className="text-gray-600 text-sm sm:text-base">Alat bantu untuk perencanaan keuangan Anda</p>
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
              <p className="text-sm text-gray-500">Klik untuk menggunakan kalkulator</p>
            </CardContent>
          </Card>
        ))}
        </div>
      </div>
    </div>
  );
}
