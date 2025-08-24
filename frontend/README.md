# Finora Frontend - Aplikasi Web Manajemen Keuangan Pribadi

## Gambaran Umum
Finora Frontend adalah aplikasi web modern yang dibangun dengan **React 19** dan **TypeScript** untuk sistem manajemen keuangan pribadi. Aplikasi ini menyediakan antarmuka pengguna yang responsif dan intuitif untuk mengelola keuangan dengan fitur lengkap seperti pelacakan transaksi, manajemen akun, perencanaan tujuan, dan kalkulator keuangan.

## 🚀 Teknologi Stack

### Core Framework
- **React 19.1.0** - Library UI modern dengan fitur terbaru
- **TypeScript 5.8.3** - Type safety dan developer experience yang lebih baik
- **Vite 6.3.5** - Build tool yang cepat dan modern
- **React Router DOM 7.6.3** - Routing dan navigasi

### UI & Styling
- **Tailwind CSS 4.1.11** - Utility-first CSS framework
- **Radix UI** - Komponen UI primitif yang accessible
- **Lucide React** - Icon library modern
- **Class Variance Authority** - Utility untuk variant styling

### State Management & Data Fetching
- **TanStack React Query 5.81.5** - Server state management
- **React Context API** - Global state management
- **Custom Hooks** - Reusable logic

### Development Tools
- **Bun** - Package manager yang cepat
- **ESLint & TypeScript** - Code quality dan type checking
- **Vite Dev Server** - Hot reload development

## 📁 Struktur Proyek

```
frontend/
├── components/           # Komponen UI reusable
│   ├── auth/            # Komponen autentikasi
│   │   └── ProtectedRoute.tsx
│   ├── layouts/         # Layout komponen
│   │   ├── AuthLayout.tsx
│   │   └── DashboardLayout.tsx
│   ├── navigation/      # Komponen navigasi
│   │   ├── Header.tsx
│   │   ├── MobileNav.tsx
│   │   └── Sidebar.tsx
│   ├── reports/         # Komponen laporan
│   │   ├── BudgetReport.tsx
│   │   ├── CashflowReport.tsx
│   │   └── NetWorthReport.tsx
│   ├── settings/        # Komponen pengaturan
│   │   ├── MemberManagement.tsx
│   │   ├── ProfileSettings.tsx
│   │   ├── SettingsLayout.tsx
│   │   └── TenantSettings.tsx
│   ├── tenant/          # Komponen tenant
│   │   └── TenantSwitcher.tsx
│   ├── ui/              # UI primitif dan komponen dasar
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   └── ... (20+ komponen UI)
│   └── ErrorBoundary.tsx
├── contexts/            # React Context providers
│   ├── AuthContext.tsx  # Manajemen autentikasi
│   └── TenantContext.tsx # Manajemen tenant
├── hooks/               # Custom React hooks
│   └── useSettings.ts
├── lib/                 # Utility libraries
│   ├── api-client.ts    # HTTP client dengan auth
│   ├── format.ts        # Formatting utilities
│   └── utils.ts         # Helper functions
├── pages/               # Halaman aplikasi
│   ├── auth/            # Halaman autentikasi
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── AcceptInvitePage.tsx
│   ├── dashboard/       # Dashboard utama
│   │   └── DashboardPage.tsx
│   ├── transactions/    # Manajemen transaksi
│   │   └── TransactionsPage.tsx
│   ├── accounts/        # Manajemen akun
│   │   ├── AccountsPage.tsx
│   │   └── AccountHistoryPage.tsx
│   ├── categories/      # Manajemen kategori
│   │   └── CategoriesPage.tsx
│   ├── goals/           # Tujuan tabungan
│   │   └── GoalsPage.tsx
│   ├── calculators/     # Kalkulator keuangan
│   │   └── CalculatorsPage.tsx
│   ├── reports/         # Laporan keuangan
│   │   └── ReportsPage.tsx
│   └── settings/        # Pengaturan
│       └── SettingsPage.tsx
├── client.ts            # Generated API client
├── App.tsx              # Root component
├── main.tsx             # Entry point
└── index.css            # Global styles
```

## 🎯 Fitur Utama

### 1. **Sistem Autentikasi**
- **Login/Register** dengan validasi form
- **JWT Token Management** dengan auto-refresh
- **Multi-tenant Support** dengan tenant switching
- **Protected Routes** dengan role-based access
- **Session Persistence** dengan localStorage

### 2. **Dashboard Interaktif**
- **Ringkasan Keuangan** real-time
- **Grafik dan Statistik** visual
- **Transaksi Terbaru** dengan detail
- **Progress Tujuan** dengan indikator
- **Quick Actions** untuk operasi cepat

### 3. **Manajemen Transaksi**
- **CRUD Transaksi** lengkap (Pemasukan, Pengeluaran, Transfer)
- **Filter dan Pencarian** advanced
- **Split Categories** untuk transaksi kompleks
- **Transfer Antar Akun** dengan tracking
- **Export Data** ke CSV/JSON
- **Responsive Design** untuk mobile dan desktop

### 4. **Manajemen Akun Keuangan**
- **6 Jenis Akun**: Kas, Bank, E-Wallet, Kartu Kredit, Pinjaman, Aset
- **Real-time Balance** tracking
- **Account History** dengan pagination
- **Multi-currency Support** (default IDR)
- **Balance Validation** untuk transaksi

### 5. **Kategori Dinamis**
- **Kategori Sistem** default (8 kategori)
- **Kategori Custom** dengan warna dan ikon
- **Hierarchical Structure** (parent-child)
- **Color-coded Organization** untuk visual clarity

### 6. **Tujuan Tabungan**
- **7 Jenis Tujuan**: Dana Darurat, Rumah, Kendaraan, Liburan, Pendidikan, Pensiun, Lainnya
- **Progress Tracking** otomatis
- **Contribution Management** dari berbagai sumber
- **Target & Deadline** monitoring
- **Visual Progress Indicators**

### 7. **Kalkulator Keuangan**
- **Kalkulator KPR**: Cicilan dengan jadwal amortisasi
- **Kalkulator Dana Darurat**: Rekomendasi berdasarkan pengeluaran
- **Kalkulator Pensiun**: Perencanaan dengan inflasi
- **Kalkulator Tujuan Custom**: Strategi pencapaian fleksibel
- **Save & Manage Results**: Riwayat perhitungan
- **Responsive Results Display**: Grid layout adaptif

### 8. **Sistem Laporan**
- **Cashflow Analysis**: Arus kas dengan trend
- **Budget vs Actual**: Perbandingan anggaran
- **Net Worth Tracking**: Pelacakan kekayaan bersih
- **Interactive Charts**: Visualisasi data dinamis
- **Export Capabilities**: Multiple format support

### 9. **Manajemen Tenant & User**
- **Multi-tenant Architecture**: Isolasi data
- **Role-based Access**: Pemilik, Admin, Editor, Pembaca
- **User Invitation System**: Email-based invites
- **Member Management**: CRUD operations
- **Permission Control**: Granular access control

### 10. **UI/UX Modern**
- **Responsive Design**: Mobile-first approach
- **Dark/Light Mode**: Theme switching (ready)
- **Accessibility**: WCAG compliant components
- **Loading States**: Skeleton dan spinner
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Real-time feedback

## 🏗️ Arsitektur Aplikasi

### Component Architecture
```
App.tsx
├── AuthProvider (Context)
├── TenantProvider (Context)
├── QueryClientProvider (React Query)
├── Router (React Router)
├── AuthLayout (Public routes)
│   ├── LoginPage
│   ├── RegisterPage
│   └── AcceptInvitePage
└── DashboardLayout (Protected routes)
    ├── Header + Sidebar Navigation
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
- **Generated Client**: Type-safe API client dari Encore.dev
- **Authentication**: JWT dengan auto-refresh
- **Error Handling**: Centralized error management
- **Request Interceptors**: Auto-retry dan token refresh
- **Response Caching**: React Query caching strategy

## 🔧 Setup dan Instalasi

### Prasyarat
- **Node.js 18+** atau **Bun**
- **Backend Finora** running di `http://localhost:4000`

### Instalasi
```bash
# Clone repository
git clone <repository-url>
cd finora-backend-zh3i/frontend

# Install dependencies dengan Bun (recommended)
bun install

# Atau dengan npm
npm install
```

### Environment Variables
```bash
# .env.development
VITE_CLIENT_TARGET=http://localhost:4000

# .env.production
VITE_CLIENT_TARGET=https://your-production-api.com
```

### Development
```bash
# Start development server
bun run dev

# Atau dengan npm
npm run dev

# Build untuk production
bun run build

# Preview production build
bun run preview
```

## 📱 Responsive Design

### Breakpoints (Tailwind CSS)
- **Mobile**: `< 640px` (sm)
- **Tablet**: `640px - 1024px` (md, lg)
- **Desktop**: `> 1024px` (xl, 2xl)

### Layout Adaptations
- **Mobile**: Single column, collapsible sidebar, bottom navigation
- **Tablet**: Two column, sidebar overlay, optimized touch targets
- **Desktop**: Multi-column, persistent sidebar, hover interactions

### Component Responsiveness
- **Grid Layouts**: 1-4 columns based on screen size
- **Navigation**: Hamburger menu on mobile, full sidebar on desktop
- **Forms**: Stacked on mobile, inline on desktop
- **Tables**: Horizontal scroll on mobile, full view on desktop

## 🎨 Design System

### Color Palette
```css
/* Primary Colors */
--primary: #3b82f6;      /* Blue */
--primary-foreground: #ffffff;

/* Secondary Colors */
--secondary: #f1f5f9;    /* Light Gray */
--secondary-foreground: #0f172a;

/* Accent Colors */
--accent: #10b981;       /* Green */
--destructive: #ef4444;  /* Red */
--warning: #f59e0b;      /* Amber */

/* Neutral Colors */
--background: #ffffff;
--foreground: #0f172a;
--muted: #f8fafc;
--border: #e2e8f0;
```

### Typography
- **Font Family**: Inter (system font fallback)
- **Font Sizes**: 12px - 48px (Tailwind scale)
- **Font Weights**: 400, 500, 600, 700
- **Line Heights**: 1.2 - 1.8

### Spacing & Layout
- **Spacing Scale**: 4px base unit (Tailwind)
- **Container Max Width**: 1200px
- **Grid System**: CSS Grid dan Flexbox
- **Border Radius**: 4px, 8px, 12px

## 🔒 Keamanan

### Authentication Security
- **JWT Tokens**: Short-lived access tokens (15 min)
- **Refresh Tokens**: Long-lived refresh tokens (30 days)
- **Secure Storage**: httpOnly cookies untuk production
- **Auto Logout**: Token expiry handling
- **CSRF Protection**: Built-in dengan Encore.dev

### Data Protection
- **Input Validation**: Client-side dan server-side
- **XSS Prevention**: React built-in protection
- **Type Safety**: TypeScript untuk runtime safety
- **Error Boundaries**: Graceful error handling

### Privacy
- **Local Storage**: Minimal sensitive data storage
- **Session Management**: Secure session handling
- **Data Encryption**: HTTPS untuk semua komunikasi

## 📊 Performance Optimizations

### Code Splitting
- **Route-based Splitting**: Lazy loading pages
- **Component Splitting**: Dynamic imports
- **Bundle Analysis**: Webpack bundle analyzer

### Caching Strategy
- **React Query**: Server state caching
- **Browser Cache**: Static assets caching
- **Service Worker**: Offline capability (ready)

### Loading Performance
- **Skeleton Loading**: UI placeholders
- **Progressive Loading**: Incremental data loading
- **Image Optimization**: Lazy loading dan compression
- **Code Minification**: Production builds

## 🧪 Testing Strategy

### Testing Tools (Ready for Implementation)
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Cypress atau Playwright
- **Component Tests**: Storybook
- **E2E Tests**: Full user journey testing

### Test Coverage Areas
- **Authentication Flow**: Login, register, logout
- **CRUD Operations**: Create, read, update, delete
- **Form Validation**: Input validation dan error handling
- **Navigation**: Route protection dan navigation
- **API Integration**: Mock API responses

## 🚀 Deployment

### Build Process
```bash
# Production build
bun run build

# Output directory: dist/
# Static files ready for deployment
```

### Deployment Options
- **Vercel**: Zero-config deployment
- **Netlify**: Static site hosting
- **AWS S3 + CloudFront**: Scalable hosting
- **Docker**: Containerized deployment
- **Encore.dev**: Integrated dengan backend

### Environment Configuration
- **Development**: Local API server
- **Staging**: Staging API environment
- **Production**: Production API dengan CDN

## 📈 Monitoring & Analytics

### Error Tracking (Ready)
- **Error Boundaries**: React error catching
- **Console Logging**: Development debugging
- **Sentry Integration**: Production error tracking
- **User Feedback**: Error reporting system

### Performance Monitoring
- **Web Vitals**: Core performance metrics
- **Bundle Size**: Build size monitoring
- **Load Times**: Page load performance
- **User Analytics**: Usage patterns

## 🔄 Development Workflow

### Git Workflow
```bash
# Feature development
git checkout -b feature/new-feature
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Code review via Pull Request
# Merge to main branch
```

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Code quality rules
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **Conventional Commits**: Commit message format

### Component Development
```typescript
// Component template
interface ComponentProps {
  // Props definition
}

export function Component({ ...props }: ComponentProps) {
  // Component logic
  return (
    // JSX template
  );
}
```

## 🔮 Roadmap & Future Enhancements

### Planned Features
- **PWA Support**: Offline functionality
- **Dark Mode**: Complete theme system
- **Mobile App**: React Native version
- **Advanced Charts**: Interactive visualizations
- **Real-time Updates**: WebSocket integration
- **AI Insights**: Machine learning recommendations

### Technical Improvements
- **Micro-frontends**: Modular architecture
- **GraphQL**: Advanced data fetching
- **State Machines**: XState integration
- **Testing**: Comprehensive test suite
- **Documentation**: Storybook component docs

### Performance Enhancements
- **Virtual Scrolling**: Large list optimization
- **Web Workers**: Background processing
- **Streaming**: Server-side rendering
- **Edge Computing**: CDN optimization

## 📚 Resources & Documentation

### Development Resources
- **React Documentation**: https://react.dev
- **TypeScript Handbook**: https://typescriptlang.org
- **Tailwind CSS**: https://tailwindcss.com
- **Radix UI**: https://radix-ui.com
- **TanStack Query**: https://tanstack.com/query

### Project Documentation
- **API Documentation**: Backend README.md
- **Component Library**: Storybook (planned)
- **Style Guide**: Design system documentation
- **Deployment Guide**: Infrastructure setup

---

**Dibangun dengan ❤️ menggunakan React, TypeScript, dan Tailwind CSS**

**Frontend Version**: 1.0.0  
**Last Updated**: 2024  
**Maintainer**: Finora Development Team