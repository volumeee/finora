import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Home, Shield, TrendingUp } from 'lucide-react';

export default function CalculatorsPage() {
  const calculators = [
    {
      title: 'Kalkulator KPR',
      description: 'Hitung cicilan dan simulasi kredit rumah',
      icon: Home,
      color: 'bg-blue-500'
    },
    {
      title: 'Dana Darurat',
      description: 'Tentukan kebutuhan dana darurat Anda',
      icon: Shield,
      color: 'bg-green-500'
    },
    {
      title: 'Perencanaan Pensiun',
      description: 'Rencanakan masa pensiun yang nyaman',
      icon: TrendingUp,
      color: 'bg-purple-500'
    },
    {
      title: 'Tujuan Custom',
      description: 'Kalkulator untuk tujuan keuangan khusus',
      icon: Calculator,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Kalkulator Keuangan</h1>
        <p className="text-gray-600">Alat bantu untuk perencanaan keuangan Anda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {calculators.map((calc, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${calc.color}`}>
                  <calc.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{calc.title}</CardTitle>
                  <CardDescription>{calc.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Klik untuk menggunakan kalkulator</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
