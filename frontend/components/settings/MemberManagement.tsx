import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Mail, MoreHorizontal, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMemberManagement } from '@/hooks/useSettings';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface Member {
  id: string;
  nama_lengkap: string;
  email: string;
  avatar_url?: string;
  peran_id: number;
  nama_peran: string;
  bergabung_pada: Date;
}

function MemberManagementSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MemberManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState('');
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    peran_id: 3 // Default to editor
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; member: Member | null }>({ open: false, member: null });

  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const { inviteUser, updatePermission, removeMember, listMembers, isLoading: hookLoading } = useMemberManagement();

  const roles = [
    { id: 1, name: 'Pemilik' },
    { id: 2, name: 'Admin' },
    { id: 3, name: 'Editor' },
    { id: 4, name: 'Pembaca' }
  ];

  const loadMembers = async () => {
    if (!currentTenant) return;
    
    setIsLoading(true);
    try {
      const membersList = await listMembers(currentTenant);
      setMembers(membersList);
    } catch (error) {
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentTenant) {
      loadMembers();
    }
  }, [currentTenant]);

  if (isLoading) {
    return <MemberManagementSkeleton />;
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;
    
    setIsInviting(true);
    try {
      await inviteUser({
        tenant_id: currentTenant,
        email: inviteData.email.trim(),
        peran_id: inviteData.peran_id
      });
      
      setInviteData({ email: '', peran_id: 3 });
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember || !currentTenant || !newRole) return;
    
    setIsUpdatingRole(true);
    try {
      await updatePermission({
        tenant_id: currentTenant,
        pengguna_id: selectedMember.id,
        peran_id: parseInt(newRole)
      });
      
      setIsRoleDialogOpen(false);
      setSelectedMember(null);
      setNewRole('');
      await loadMembers();
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!currentTenant || !deleteDialog.member) return;
    
    try {
      await removeMember({
        tenant_id: currentTenant,
        pengguna_id: deleteDialog.member.id
      });
      
      setDeleteDialog({ open: false, member: null });
      await loadMembers();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const openRoleDialog = (member: Member) => {
    setSelectedMember(member);
    setNewRole(member.peran_id.toString());
    setIsRoleDialogOpen(true);
  };

  const getRoleBadgeColor = (roleId: number) => {
    switch (roleId) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-green-100 text-green-800';
      case 4: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Undang Anggota Baru</CardTitle>
          <CardDescription>
            Undang orang lain untuk bergabung dengan organisasi Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  value={inviteData.email}
                  onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Peran</Label>
                <Select 
                  value={inviteData.peran_id.toString()} 
                  onValueChange={(value) => setInviteData(prev => ({ ...prev, peran_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih peran" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.slice(1).map((role) => ( // Exclude owner role
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={isInviting}>
              {isInviting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Kirim Undangan
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anggota Organisasi</CardTitle>
          <CardDescription>
            Kelola anggota yang sudah bergabung
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Belum ada anggota lain dalam organisasi ini</p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.nama_lengkap} className="w-10 h-10 rounded-full" />
                      ) : (
                        <span className="text-sm font-medium">
                          {member.nama_lengkap.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{member.nama_lengkap}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                      <p className="text-xs text-gray-400">
                        Bergabung {new Date(member.bergabung_pada).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge className={getRoleBadgeColor(member.peran_id)}>
                      {member.nama_peran}
                    </Badge>
                    
                    {member.peran_id !== 1 && member.id !== user?.id && ( // Don't show menu for owner or self
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openRoleDialog(member)}>
                            Ubah Peran
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => setDeleteDialog({ open: true, member })}
                          >
                            Hapus dari Organisasi
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Update Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Peran Anggota</DialogTitle>
            <DialogDescription>
              Ubah peran untuk {selectedMember?.nama_lengkap}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_role">Peran Baru</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih peran baru" />
                </SelectTrigger>
                <SelectContent>
                  {roles.slice(1).map((role) => ( // Exclude owner role
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsRoleDialogOpen(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button 
                onClick={handleUpdateRole} 
                disabled={isUpdatingRole || !newRole}
                className="flex-1"
              >
                {isUpdatingRole ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Memperbarui...
                  </>
                ) : (
                  'Perbarui Peran'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, member: null })}
        title="Hapus Anggota"
        description={`Apakah Anda yakin ingin menghapus "${deleteDialog.member?.nama_lengkap}" dari organisasi? Anggota ini akan kehilangan akses ke semua data organisasi. Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleRemoveMember}
        confirmText="Hapus Anggota"
      />
    </div>
  );
}
