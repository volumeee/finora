# Finora - Sistem Manajemen Keuangan Pribadi

## 🌟 Gambaran Umum
**Finora** adalah platform manajemen keuangan pribadi yang komprehensif, dibangun dengan arsitektur modern full-stack. Sistem ini menyediakan solusi lengkap untuk pelacakan keuangan, perencanaan tujuan, dan analisis finansial dengan dukungan multi-tenant dan kontrol akses berbasis peran.

## 🏗️ Arsitektur Sistem

### Full-Stack Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    FINORA PLATFORM                         │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React 19 + TypeScript)                          │
│  ├── Aplikasi Web (SPA)                                    │
│  ├── UI Responsif (Mobile-first)                           │
│  ├── Dashboard Real-time                                   │
│  └── Progressive Web App (Siap PWA)                        │
├─────────────────────────────────────────────────────────────┤
│  Backend (Encore.dev Microservices)                        │
│  ├── 11 Microservices                                      │
│  ├── 62 API Endpoints                                      │
│  ├── 7 Database PostgreSQL                                 │
│  └── Client Type-safe Otomatis                             │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure                                            │
│  ├── PostgreSQL (Multi-database)                          │
│  ├── Autentikasi JWT                                       │
│  ├── Arsitektur Multi-tenant                              │
│  └── Migrasi Otomatis                                      │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Komponen Utama

### 📱 Frontend Application
**Lokasi**: `/frontend/`  
**Tech Stack**: React 19, TypeScript, Tailwind CSS, Vite  
**Fitur**:
- Dashboard interaktif dengan real-time data
- Manajemen transaksi dengan filtering advanced
- Kalkulator keuangan responsif
- Sistem laporan dengan visualisasi
- Dukungan multi-tenant dengan UI berbasis peran
- Kemampuan Progressive Web App

[📖 **Frontend Documentation**](./frontend/README.md)

### ⚙️ Backend API Services
**Lokasi**: `/backend/`  
**Tech Stack**: Encore.dev, TypeScript, PostgreSQL  
**Fitur**:
- 11 microservices dengan 62 endpoints
- Isolasi data multi-tenant
- Autentikasi JWT dengan refresh token
- Pelacakan saldo real-time
- Audit logging komprehensif
- Client type-safe yang dibuat otomatis

[📖 **Backend Documentation**](./backend/README.md)

## 🎯 Fitur Lengkap

### 💰 Manajemen Keuangan
- **6 Jenis Akun**: Kas, Bank, E-Wallet, Kartu Kredit, Pinjaman, Aset
- **3 Jenis Transaksi**: Pemasukan, Pengeluaran, Transfer
- **Logic Akun Utang**: Pinjaman & Kartu Kredit dengan validasi khusus
  - ❌ Tidak bisa jadi sumber transfer atau kontribusi
  - ✅ Bisa jadi tujuan transfer (pembayaran utang)
  - ❌ Hanya bisa pengeluaran (menambah utang)
- **Split Transactions**: Kategori ganda per transaksi
- **Real-time Balance**: Pembaruan otomatis saldo akun
- **Multi-currency**: Dukungan mata uang ganda (default IDR)

### 🎯 Perencanaan Tujuan
- **7 Jenis Tujuan**: Dana Darurat, Rumah, Kendaraan, Liburan, Pendidikan, Pensiun, Custom
- **Progress Tracking**: Pemantauan otomatis pencapaian
- **Contribution Management**: Dari berbagai sumber akun
- **Target & Deadline**: Perencanaan dengan tenggat waktu

### 🧮 Kalkulator Keuangan
- **Kalkulator KPR**: Cicilan dengan jadwal amortisasi
- **Dana Darurat**: Rekomendasi berdasarkan profil risiko
- **Perencanaan Pensiun**: Dengan perhitungan inflasi
- **Tujuan Custom**: Strategi pencapaian fleksibel
- **Save Results**: Simpan dan kelola hasil perhitungan

### 📊 Analisis & Laporan
- **Dashboard Real-time**: Overview keuangan komprehensif
- **Net Worth Calculation**: Aset dikurangi utang otomatis
- **Cashflow Analysis**: Analisis arus kas dengan trend
- **Budget vs Actual**: Perbandingan anggaran dan realisasi
- **Debt Tracking**: Pelacakan utang terpisah dari aset
- **Export Capabilities**: Format ganda (CSV, JSON)

### 👥 Multi-tenant & User Management
- **Tenant Isolation**: Data terpisah per organisasi
- **4 Level Role**: Pemilik, Admin, Editor, Pembaca
- **User Invitation**: Sistem undangan berbasis email
- **Permission Control**: Kontrol akses terperinci
- **Audit Trail**: Pencatatan semua aktivitas pengguna

## 🛠️ Setup & Installation

### Prerequisites
- **Node.js 18+** atau **Bun**
- **PostgreSQL 14+**
- **Encore CLI**

### Quick Start
```bash
# 1. Clone repository
git clone <repository-url>
cd finora-backend-zh3i

# 2. Setup Backend
cd backend
curl -L https://encore.dev/install.sh | bash  # Install Encore CLI
bun install
encore db create finora-backend-zh3i
encore db migrate
encore run  # Starts on http://localhost:4000

# 3. Setup Frontend (new terminal)
cd ../frontend
bun install
bun run dev  # Starts on http://localhost:5173
```

### Environment Configuration
```bash
# Backend - Automatic via Encore.dev
# Database: Auto-managed PostgreSQL
# API: http://localhost:4000

# Frontend
# .env.development
VITE_CLIENT_TARGET=http://localhost:4000
```

## 📊 Statistik Proyek

### Backend Metrics
- **11 Microservices** dengan database terpisah
- **62 API Endpoints** dengan dokumentasi lengkap
- **7 PostgreSQL Databases** dengan migrasi otomatis
- **4 Role Levels** dengan permission granular
- **8 Default Categories** siap pakai

### Frontend Metrics
- **60+ Components** dengan design system konsisten
- **10 Main Pages** dengan responsive design
- **20+ UI Primitives** dari Radix UI
- **3 Layout Types** (Auth, Dashboard, Settings)
- **4 Calculator Types** dengan hasil responsif

### Code Quality
- **100% TypeScript** untuk keamanan tipe
- **Generated API Client** untuk konsistensi
- **Comprehensive Error Handling** di semua lapisan
- **Audit Logging** untuk semua operasi
- **Soft Delete Pattern** untuk integritas data

## 🔒 Keamanan & Performance

### Security Features
- **JWT Authentication** dengan rotasi refresh token
- **bcrypt Password Hashing** dengan salt
- **Role-based Access Control** (RBAC)
- **SQL Injection Prevention** melalui parameterized queries
- **XSS Protection** bawaan React
- **CSRF Protection** melalui Encore.dev

### Performance Optimizations
- **Database Indexing** pada kolom yang sering diquery
- **Connection Pooling** untuk efisiensi database
- **React Query Caching** untuk server state
- **Code Splitting** untuk loading lebih cepat
- **Lazy Loading** untuk komponen dan routes
- **Bundle Optimization** dengan Vite

## 🚀 Deployment

### Development
```bash
# Backend
cd backend && encore run

# Frontend  
cd frontend && bun run dev
```

### Production
```bash
# Backend
encore deploy --env production

# Frontend
cd frontend && bun run build
# Deploy dist/ folder ke hosting provider
```

### Deployment Options
- **Encore.dev Cloud** - Deployment backend terintegrasi
- **Vercel/Netlify** - Hosting statis frontend
- **AWS/GCP/Azure** - Infrastruktur lengkap
- **Docker** - Deployment dalam kontainer

## 🔮 Roadmap & Future Development

### Short Term (Q1-Q2 2024)
- [ ] OCR Receipt Processing
- [ ] Recurring Transactions
- [ ] Budget Management Module
- [ ] Dark Mode Implementation
- [ ] PWA Offline Support

### Medium Term (Q3-Q4 2024)
- [ ] Mobile App (React Native)
- [ ] Investment Portfolio Tracking
- [ ] Advanced Analytics dengan ML
- [ ] Open Banking Integration
- [ ] Real-time Notifications

### Long Term (2025+)
- [ ] AI-powered Financial Insights
- [ ] Multi-currency Trading
- [ ] Cryptocurrency Support
- [ ] Advanced Reporting Engine
- [ ] Third-party Integrations

## 📚 Documentation & Resources

### Project Documentation
- [📖 Backend API Documentation](./backend/README.md)
- [📖 Frontend Application Guide](./frontend/README.md)
- [🔧 API Endpoints Reference](./backend/README.md#-api-endpoints)
- [🎨 UI Components Guide](./frontend/README.md#-design-system)

### Development Resources
- **Encore.dev**: https://encore.dev/docs
- **React 19**: https://react.dev
- **TypeScript**: https://typescriptlang.org
- **Tailwind CSS**: https://tailwindcss.com
- **Radix UI**: https://radix-ui.com

### Getting Help
- 📧 **Email**: support@finora.dev
- 💬 **Discord**: [Finora Community](https://discord.gg/finora)
- 🐛 **Issues**: [GitHub Issues](https://github.com/finora/issues)
- 📖 **Wiki**: [Project Wiki](https://github.com/finora/wiki)

## 🤝 Contributing

### Development Workflow
1. Fork repository
2. Buat feature branch (`git checkout -b feature/amazing-feature`)
3. Commit perubahan (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buka Pull Request

### Code Standards
- **TypeScript Strict Mode** diaktifkan
- **ESLint + Prettier** untuk format kode
- **Conventional Commits** untuk pesan commit
- **Comprehensive Testing** untuk fitur baru
- **Documentation Updates** untuk perubahan API

## 📄 License

Proyek ini dilisensikan di bawah **MIT License** - lihat file [LICENSE](LICENSE) untuk detail.

## 🙏 Acknowledgments

- **Encore.dev Team** - Framework backend yang luar biasa
- **React Team** - Library frontend yang menakjubkan  
- **Tailwind CSS** - CSS utility-first yang indah
- **Radix UI** - Primitif komponen yang dapat diakses
- **Open Source Community** - Inspirasi dan tools

---

<div align="center">

**🚀 Built with ❤️ by Finora Development Team**

**Version**: 1.0.0 | **Last Updated**: 2024 | **Status**: 🟢 Active Development

[⭐ Star this repo](https://github.com/finora/finora) | [🐛 Report Bug](https://github.com/finora/issues) | [💡 Request Feature](https://github.com/finora/issues)

</div>