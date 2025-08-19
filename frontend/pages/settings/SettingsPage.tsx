import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileSettings from '@/components/settings/ProfileSettings';
import TenantSettings from '@/components/settings/TenantSettings';
import MemberManagement from '@/components/settings/MemberManagement';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-600">Kelola profil dan pengaturan akun Anda</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="tenant">Organisasi</TabsTrigger>
          <TabsTrigger value="members">Anggota</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="tenant">
          <TenantSettings />
        </TabsContent>

        <TabsContent value="members">
          <MemberManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
