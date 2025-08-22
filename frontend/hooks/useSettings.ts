import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import apiClient from '@/lib/api-client';

export const useProfileSettings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await apiClient.auth.getProfile({});
      return result;
    } catch (error: any) {
      toast({
        title: "Gagal memuat profil",
        description: error?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateProfile = useCallback(async (data: {
    nama_lengkap?: string;
    email?: string;
    no_telepon?: string;
  }) => {
    setIsLoading(true);
    try {
      const result = await apiClient.auth.updateProfile(data);
      toast({
        title: "Profil diperbarui",
        description: "Informasi profil berhasil diperbarui",
      });
      return result;
    } catch (error: any) {
      toast({
        title: "Gagal memperbarui profil",
        description: error?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { getProfile, updateProfile, isLoading };
};

export const useTenantSettings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getTenant = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const result = await apiClient.tenant.get({ id });
      return result;
    } catch (error: any) {
      toast({
        title: "Gagal memuat organisasi",
        description: error?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateTenant = useCallback(async (id: string, data: {
    nama?: string;
    sub_domain?: string;
  }) => {
    setIsLoading(true);
    try {
      const result = await apiClient.tenant.update({ id, ...data });
      toast({
        title: "Organisasi diperbarui",
        description: "Informasi organisasi berhasil diperbarui",
      });
      return result;
    } catch (error: any) {
      toast({
        title: "Gagal memperbarui organisasi",
        description: error?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { getTenant, updateTenant, isLoading };
};

export const useMemberManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const inviteUser = useCallback(async (data: {
    tenant_id: string;
    email: string;
    peran_id: number;
  }) => {
    setIsLoading(true);
    try {
      const result = await apiClient.user.inviteUser(data);
      toast({
        title: "Undangan terkirim",
        description: `Undangan telah dikirim ke ${data.email}`,
      });
      return result;
    } catch (error: any) {
      toast({
        title: "Gagal mengirim undangan",
        description: error?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updatePermission = useCallback(async (data: {
    tenant_id: string;
    pengguna_id: string;
    peran_id: number;
  }) => {
    setIsLoading(true);
    try {
      const result = await apiClient.user.updatePermission(data);
      toast({
        title: "Peran berhasil diperbarui",
        description: "Peran anggota telah diubah",
      });
      return result;
    } catch (error: any) {
      toast({
        title: "Gagal memperbarui peran",
        description: error?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const removeMember = useCallback(async (data: {
    tenant_id: string;
    pengguna_id: string;
  }) => {
    setIsLoading(true);
    try {
      await apiClient.user.removeMember(data);
      toast({
        title: "Anggota berhasil dihapus",
        description: "Anggota telah dihapus dari organisasi",
      });
    } catch (error: any) {
      toast({
        title: "Gagal menghapus anggota",
        description: error?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const listMembers = useCallback(async (tenantId: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.user.listMembers({ tenant_id: tenantId });
      return response?.members || [];
    } catch (error: any) {
      toast({
        title: "Gagal memuat anggota",
        description: error?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    inviteUser,
    updatePermission,
    removeMember,
    listMembers,
    isLoading
  };
};