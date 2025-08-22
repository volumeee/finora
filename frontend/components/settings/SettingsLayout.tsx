import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileSettings from './ProfileSettings';
import TenantSettings from './TenantSettings';
import MemberManagement from './MemberManagement';

export default function SettingsLayout() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pengaturan</h1>
          <p className="text-gray-600 text-sm sm:text-base">Kelola profil dan pengaturan akun Anda</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
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
    </div>
  );
}