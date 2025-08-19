import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import backend from '~backend/client';

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    kata_sandi: '',
    confirmPassword: '',
    no_telepon: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  
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
    
    if (isNewUser && formData.kata_sandi !== formData.confirmPassword) {
      toast({
        title: "Password tidak cocok",
        description: "Pastikan password dan konfirmasi password sama",
        variant: "destructive",
      });
      return;
    }

    if (!token) {
      toast({
        title: "Token tidak valid",
        description: "Link undangan tidak valid",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const requestData: any = { token };
      
      if (isNewUser) {
        requestData.nama_lengkap = formData.nama_lengkap;
        requestData.kata_sandi = formData.kata_sandi;
        if (formData.no_telepon) {
          requestData.no_telepon = formData.no_telepon;
        }
      }

      const response = await backend.user.acceptInvite(requestData);
      
      toast({
        title: "Undangan diterima",
        description: `Selamat bergabung di ${response.tenant.nama}!`,
      });
      
      // Redirect to login if new user, or dashboard if existing user
      if (response.is_new_user) {
        navigate('/auth/login');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Accept invite error:', error);
      toast({
        title: "Gagal menerima undangan",
        description: error.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Terima Undangan</CardTitle>
        <CardDescription>
          Lengkapi informasi untuk bergabung
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isNewUser && (
            <>
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
                <Label htmlFor="kata_sandi">Password</Label>
                <Input
                  id="kata_sandi"
                  name="kata_sandi"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  value={formData.kata_sandi}
                  onChange={handleChange}
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
                  required
                />
              </div>
            </>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isNewUser"
              checked={isNewUser}
              onChange={(e) => setIsNewUser(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isNewUser" className="text-sm">
              Saya pengguna baru
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Memproses...
              </>
            ) : (
              'Terima Undangan'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
