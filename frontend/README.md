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
- JWT token management dengan auto-refresh
- Multi-tenant support dengan tenant switching
- Role-based access control
- Protected routes

### Dashboard Interaktif
- Real-time financial overview
- Visual charts dan statistics
- Recent transactions dengan transfer tracking
- Goal progress indicators
- Quick actions

### Transaction Management
- CRUD operations (Income, Expense, Transfer)
- Advanced filtering dan search
- Split categories
- Account-to-account transfers
- Goal contributions
- Export capabilities (CSV/JSON)

### Account Management
- 6 account types (Cash, Bank, E-Wallet, Credit Card, Loan, Asset)
- Real-time balance tracking
- Account history dengan pagination
- Multi-currency support
- Balance validation

### Financial Calculators
- **Mortgage Calculator** - Payment schedules
- **Emergency Fund** - Recommendations
- **Retirement Planning** - With inflation
- **Custom Goals** - Flexible strategies
- Save & manage results
- Responsive result displays

### Reports & Analytics
- Cashflow analysis
- Budget vs actual comparison
- Net worth tracking
- Interactive charts
- Export capabilities

### UI/UX Features
- Responsive design (mobile-first)
- Loading states (skeleton, spinner)
- Error boundaries
- Toast notifications
- Accessibility compliant
- Filter expand/collapse functionality

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
- Type-safe generated client dari Encore.dev
- JWT authentication dengan auto-refresh
- Centralized error handling
- Request interceptors
- Response caching

## 🔧 Setup & Development

### Prerequisites
- Node.js 18+ atau Bun
- Backend API running di `http://localhost:4000`

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
- **Mobile**: Single column, hamburger menu, bottom nav
- **Tablet**: Two column, sidebar overlay
- **Desktop**: Multi-column, persistent sidebar

### Component Responsiveness
- Grid layouts: 1-4 columns based on screen size
- Navigation: Collapsible sidebar
- Forms: Stacked on mobile, inline on desktop
- Tables: Horizontal scroll on mobile

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
- Consistent spacing (4px base unit)
- Border radius: 4px, 8px, 12px
- Shadow system untuk depth
- Color-coded categories dan accounts

## 🔒 Security

### Authentication
- JWT tokens (15 min access, 30 day refresh)
- Secure token storage
- Auto logout on expiry
- CSRF protection

### Data Protection
- Input validation
- XSS prevention (React built-in)
- Type safety (TypeScript)
- Error boundaries

## 📊 Performance

### Optimizations
- Route-based code splitting
- Component lazy loading
- React Query caching
- Image optimization
- Bundle analysis

### Loading States
- Skeleton loading
- Progressive data loading
- Optimistic updates
- Error retry mechanisms

## 🚀 Deployment

### Build Process
```bash
bun run build
# Output: dist/ folder ready for deployment
```

### Deployment Options
- **Vercel** - Zero-config
- **Netlify** - Static hosting
- **AWS S3 + CloudFront** - Scalable
- **Docker** - Containerized
- **Encore.dev** - Integrated

## 🔮 Future Enhancements

### Planned Features
- PWA support (offline functionality)
- Dark mode implementation
- Mobile app (React Native)
- Advanced charts (interactive)
- Real-time updates (WebSocket)
- AI insights

### Technical Improvements
- Comprehensive testing suite
- Storybook component docs
- Performance monitoring
- Error tracking (Sentry)
- Analytics integration

---

**Built with ❤️ using React, TypeScript, and Tailwind CSS**