import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Mail, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function MemberManagement() {
  const { toast } = useToast();
  const [isInviting, setIsInviting] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    peran_id: '3' // Default to editor
  });

  // Mock data - replace with actual API calls
  const members = [
    {
      id: '1',
      nama_lengkap: 'John Doe',
      email: 'john@example.com',
      peran_id: 1,
      nama_peran: 'Pemilik',
      bergabung_pada: new Date('2024-01-01')
    },
    {
      id: '2',
      nama_lengkap: 'Jane Smith',
      email: 'jane@example.com',
      peran_id: 2,
      nama_peran: 'Admin',
      bergabung_pada: new Date('2024-01-15')
    }
  ];

  const roles = [
    { id: '1', name: 'Pemilik' },
    { id: '2', name: 'Admin' },
    { id: '3', name: 'Editor' },
    { id: '4', name: 'Pembaca' }
  ];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);

    try {
      // TODO: Implement invite API call
      toast({
        title: "Undangan terkirim",
        description: `Undangan telah dikirim ke ${inviteData.email}`,
      });
      setInviteData({ email: '', peran_id: '3' });
    } catch (error: any) {
      console.error('Invite error:', error);
      toast({
        title: "Gagal mengirim undangan",
        description: error.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
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
                  value={inviteData.peran_id} 
                  onValueChange={(value) => setInviteData(prev => ({ ...prev, peran_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih peran" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.slice(1).map((role) => ( // Exclude owner role
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={isInviting}>
              <Mail className="mr-2 h-4 w-4" />
              {isInviting ? 'Mengirim...' : 'Kirim Undangan'}
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
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {member.nama_lengkap.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{member.nama_lengkap}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Badge className={getRoleBadgeColor(member.peran_id)}>
                    {member.nama_peran}
                  </Badge>
                  
                  {member.peran_id !== 1 && ( // Don't show menu for owner
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ubah Peran</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          Hapus dari Organisasi
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
