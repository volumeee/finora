import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    email: '',
    kata_sandi: '',
    confirmPassword: '',
    nama_tenant: '',
    sub_domain: '',
    no_telepon: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.kata_sandi !== formData.confirmPassword) {
      toast({
        title: "Password tidak cocok",
        description: "Pastikan password dan konfirmasi password sama",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      await register(registerData);
      
      toast({
        title: "Registrasi berhasil",
        description: "Akun Anda telah dibuat!",
      });
      navigate('/dashboard');
    } catch (error: unknown) {
      console.error('Registration error:', error);
      toast({
        title: "Registrasi gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat membuat akun",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Finora</h1>
          <p className="mt-2 text-sm text-gray-600">Kelola keuangan dengan mudah</p>
        </div>
        <CardTitle className="text-2xl">Daftar</CardTitle>
        <CardDescription>
          Buat akun Finora baru
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
            <Input
              id="nama_lengkap"
              name="nama_lengkap"
              placeholder="Nama lengkap Anda"
              value={formData.nama_lengkap}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="nama@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="no_telepon">No. Telepon (Opsional)</Label>
            <Input
              id="no_telepon"
              name="no_telepon"
              placeholder="08123456789"
              value={formData.no_telepon}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nama_tenant">Nama Organisasi</Label>
            <Input
              id="nama_tenant"
              name="nama_tenant"
              placeholder="Nama perusahaan/keluarga"
              value={formData.nama_tenant}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub_domain">Subdomain</Label>
            <div className="flex">
              <Input
                id="sub_domain"
                name="sub_domain"
                placeholder="mycompany"
                value={formData.sub_domain}
                onChange={handleChange}
                className="rounded-r-none"
                required
              />
              <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                .finora.id
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kata_sandi">Password</Label>
            <Input
              id="kata_sandi"
              name="kata_sandi"
              type="password"
              placeholder="Minimal 8 karakter"
              value={formData.kata_sandi}
              onChange={handleChange}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Ulangi password"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Memproses...
              </>
            ) : (
              'Daftar'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">Sudah punya akun? </span>
          <Link to="/auth/login" className="text-blue-600 hover:underline font-medium">
            Masuk di sini
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
