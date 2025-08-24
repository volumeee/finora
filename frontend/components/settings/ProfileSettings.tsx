import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileSettings } from '@/hooks/useSettings';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function ProfileSettingsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
  );
}

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const { getProfile, updateProfile, isLoading } = useProfileSettings();
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    email: '',
    no_telepon: ''
  });
  const [initialLoading, setInitialLoading] = useState(true);

  const loadProfile = async () => {
    setInitialLoading(true);
    try {
      const profile = await getProfile();
      setFormData({
        nama_lengkap: profile.nama_lengkap || '',
        email: profile.email || '',
        no_telepon: profile.no_telepon || ''
      });
    } catch (error) {
      // Fallback to user from context if API fails
      if (user) {
        setFormData({
          nama_lengkap: user.nama_lengkap || '',
          email: user.email || '',
          no_telepon: user.no_telepon || ''
        });
      }
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const updatedProfile = await updateProfile(formData);
      updateUser(updatedProfile);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  if (initialLoading) {
    return <ProfileSettingsSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informasi Profil</CardTitle>
        <CardDescription>
          Perbarui informasi profil Anda
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
            <Input
              id="nama_lengkap"
              value={formData.nama_lengkap}
              onChange={(e) => setFormData(prev => ({ ...prev, nama_lengkap: e.target.value }))}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="no_telepon">No. Telepon</Label>
            <Input
              id="no_telepon"
              value={formData.no_telepon}
              onChange={(e) => setFormData(prev => ({ ...prev, no_telepon: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
            {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
