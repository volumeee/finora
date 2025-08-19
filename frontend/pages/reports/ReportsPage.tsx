import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, PieChart, FileText } from 'lucide-react';

export default function ReportsPage() {
  const reports = [
    {
      title: 'Laporan Cashflow',
      description: 'Analisis arus kas masuk dan keluar',
      icon: TrendingUp,
      color: 'bg-blue-500'
    },
    {
      title: 'Budget vs Actual',
      description: 'Perbandingan anggaran dengan realisasi',
      icon: BarChart3,
      color: 'bg-green-500'
    },
    {
      title: 'Net Worth',
      description: 'Perkembangan kekayaan bersih',
      icon: PieChart,
      color: 'bg-purple-500'
    },
    {
      title: 'Laporan Custom',
      description: 'Buat laporan sesuai kebutuhan',
      icon: FileText,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Laporan</h1>
        <p className="text-gray-600">Analisis mendalam kondisi keuangan Anda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${report.color}`}>
                  <report.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Klik untuk melihat laporan</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
