# Finora Frontend - Web Application

## Gambaran Umum
Aplikasi web modern untuk sistem manajemen keuangan pribadi yang dibangun dengan **React 19** dan **TypeScript**. Menyediakan antarmuka responsif untuk mengelola keuangan dengan fitur lengkap.

## 🚀 Tech Stack
- **React 19.1.0** - Modern UI library
- **TypeScript 5.8.3** - Type safety
- **Vite 6.3.5** - Build tool
- **Tailwind CSS 4.1.11** - Styling
- **Radix UI** - UI components
- **TanStack React Query 5.81.5** - State management
- **React Router DOM 7.6.3** - Routing

## 📁 Struktur Proyek
```
frontend/
├── components/          # UI components
│   ├── auth/           # Authentication
│   ├── layouts/        # Layout components
│   ├── navigation/     # Navigation
│   ├── reports/        # Reports
│   ├── settings/       # Settings
│   ├── tenant/         # Tenant management
│   └── ui/             # UI primitives (20+ components)
├── contexts/           # React contexts
│   ├── AuthContext.tsx
│   └── TenantContext.tsx
├── hooks/              # Custom hooks
├── lib/                # Utilities
│   ├── api-client.ts   # HTTP client
│   ├── format.ts       # Formatters
│   └── utils.ts        # Helpers
├── pages/              # Application pages
│   ├── auth/           # Login, Register
│   ├── dashboard/      # Main dashboard
│   ├── transactions/   # Transaction management
│   ├── accounts/       # Account management
│   ├── categories/     # Category management
│   ├── goals/          # Savings goals
│   ├── calculators/    # Financial calculators
│   ├── reports/        # Financial reports
│   └── settings/       # Settings
└── client.ts           # Generated API client
```

## 🎯 Fitur Utama

### Authentication & Multi-tenant
- Manajemen token JWT dengan auto-refresh
- Dukungan multi-tenant dengan perpindahan tenant
- Kontrol akses berbasis peran
- Route yang dilindungi

### Dashboard Interaktif
- **Net Worth Display**: Kekayaan bersih (Aset - Utang)
- Gambaran keuangan real-time
- Grafik visual dan statistik
- Transaksi terbaru dengan pelacakan transfer
- Indikator progress tujuan
- Aksi cepat

### Transaction Management
- Operasi CRUD (Pemasukan, Pengeluaran, Transfer)
- Filtering dan pencarian lanjutan
- Kategori terpisah
- Transfer antar akun
- Kontribusi tujuan
- Kemampuan ekspor (CSV/JSON)

### Account Management
- 6 jenis akun (Kas, Bank, E-Wallet, Kartu Kredit, Pinjaman, Aset)
- **Debt Account Logic**: UI khusus untuk akun utang
  - Tampilan sisa utang vs saldo normal
  - Validasi transaksi berbeda per jenis akun
  - Indikator visual untuk status utang
- Pelacakan saldo real-time
- Riwayat akun dengan paginasi
- Dukungan multi-mata uang
- Validasi saldo

### Financial Calculators
- **Mortgage Calculator** - Jadwal pembayaran
- **Emergency Fund** - Rekomendasi
- **Retirement Planning** - Dengan inflasi
- **Custom Goals** - Strategi fleksibel
- Simpan & kelola hasil
- Tampilan hasil responsif

### Reports & Analytics
- Analisis arus kas
- Perbandingan anggaran vs aktual
- Pelacakan kekayaan bersih
- Grafik interaktif
- Kemampuan ekspor

### UI/UX Features
- Desain responsif (mobile-first)
- Status loading (skeleton, spinner)
- Error boundaries
- Notifikasi toast
- Sesuai aksesibilitas
- Fungsi expand/collapse filter

## 🏗️ Architecture

### Component Structure
```
App.tsx
├── AuthProvider (Context)
├── TenantProvider (Context)
├── QueryClientProvider
├── Router
├── AuthLayout (Public)
│   ├── LoginPage
│   ├── RegisterPage
│   └── AcceptInvitePage
└── DashboardLayout (Protected)
    ├── Header + Sidebar
    ├── DashboardPage
    ├── TransactionsPage
    ├── AccountsPage
    ├── CategoriesPage
    ├── GoalsPage
    ├── CalculatorsPage
    ├── ReportsPage
    └── SettingsPage
```

### State Management
- **Global State**: React Context (Auth, Tenant)
- **Server State**: TanStack React Query
- **Local State**: useState, useReducer
- **Persistent State**: localStorage

### API Integration
- Client yang dibuat type-safe dari Encore.dev
- Autentikasi JWT dengan auto-refresh
- Penanganan error terpusat
- Request interceptors
- Response caching

## 🔧 Setup & Development

### Prerequisites
- Node.js 18+ atau Bun
- Backend API berjalan di `http://localhost:4000`

### Installation
```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

### Environment Variables
```bash
# .env.development
VITE_CLIENT_TARGET=http://localhost:4000

# .env.production
VITE_CLIENT_TARGET=https://your-api.com
```

## 📱 Responsive Design

### Breakpoints
- **Mobile**: `< 640px`
- **Tablet**: `640px - 1024px`
- **Desktop**: `> 1024px`

### Adaptations
- **Mobile**: Kolom tunggal, menu hamburger, navigasi bawah
- **Tablet**: Dua kolom, overlay sidebar
- **Desktop**: Multi-kolom, sidebar persisten

### Component Responsiveness
- Layout grid: 1-4 kolom berdasarkan ukuran layar
- Navigasi: Sidebar yang dapat dilipat
- Form: Bertumpuk di mobile, inline di desktop
- Tabel: Scroll horizontal di mobile

## 🎨 Design System

### Colors
- **Primary**: Blue (#3b82f6)
- **Secondary**: Light Gray (#f1f5f9)
- **Success**: Green (#10b981)
- **Warning**: Amber (#f59e0b)
- **Error**: Red (#ef4444)

### Typography
- **Font**: Inter (system fallback)
- **Sizes**: 12px - 48px (Tailwind scale)
- **Weights**: 400, 500, 600, 700

### Components
- Spasi konsisten (unit dasar 4px)
- Border radius: 4px, 8px, 12px
- Sistem bayangan untuk kedalaman
- Kategori dan akun berkode warna

## 🔒 Security

### Authentication
- Token JWT (akses 15 menit, refresh 30 hari)
- Penyimpanan token aman
- Logout otomatis saat kedaluwarsa
- Perlindungan CSRF

### Data Protection
- Validasi input
- Pencegahan XSS (bawaan React)
- Keamanan tipe (TypeScript)
- Error boundaries

## 📊 Performance

### Optimizations
- Code splitting berbasis route
- Lazy loading komponen
- Caching React Query
- Optimisasi gambar
- Analisis bundle

### Loading States
- Loading skeleton
- Loading data progresif
- Update optimistik
- Mekanisme retry error

## 🚀 Deployment

### Build Process
```bash
bun run build
# Output: dist/ folder ready for deployment
```

### Deployment Options
- **Vercel** - Tanpa konfigurasi
- **Netlify** - Hosting statis
- **AWS S3 + CloudFront** - Dapat diskalakan
- **Docker** - Dalam kontainer
- **Encore.dev** - Terintegrasi

## 🔮 Future Enhancements

### Planned Features
- Dukungan PWA (fungsi offline)
- Implementasi dark mode
- Aplikasi mobile (React Native)
- Grafik lanjutan (interaktif)
- Pembaruan real-time (WebSocket)
- Wawasan AI

### Technical Improvements
- Suite testing komprehensif
- Dokumentasi komponen Storybook
- Pemantauan performa
- Pelacakan error (Sentry)
- Integrasi analitik

---

**Dibangun dengan ❤️ menggunakan React, TypeScript, dan Tailwind CSS**