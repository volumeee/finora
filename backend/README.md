# Finora Backend - API Microservices

## Gambaran Umum
Backend API untuk sistem manajemen keuangan pribadi yang dibangun dengan **Encore.dev** menggunakan TypeScript. Menyediakan arsitektur microservices dengan 11 layanan dan 62 endpoint API.

## 🏗️ Arsitektur
- **Framework**: Encore.dev (TypeScript)
- **Database**: PostgreSQL dengan migrasi otomatis
- **Arsitektur**: Microservices dengan komunikasi service-to-service
- **Autentikasi**: JWT dengan refresh token
- **Multi-tenancy**: Isolasi data berbasis tenant

## 🚀 Layanan Microservices

### Infrastruktur (11 Services)
| Layanan | Endpoints | Database | Deskripsi |
|---------|-----------|----------|-----------|
| **akun** | 6 | ✅ | Manajemen akun keuangan |
| **auth** | 6 | ✅ | Autentikasi & sesi |
| **dashboard** | 1 | - | Statistik dashboard |
| **frontend** | 1 | - | Static assets |
| **kalkulator** | 9 | ✅ | Kalkulator keuangan |
| **kategori** | 5 | ✅ | Manajemen kategori |
| **laporan** | 3 | - | Laporan keuangan |
| **tenant** | 5 | ✅ | Manajemen tenant |
| **transaksi** | 9 | ✅ | Transaksi keuangan |
| **tujuan** | 9 | ✅ | Tujuan tabungan |
| **user** | 8 | - | Manajemen pengguna |

**Total: 62 Public Endpoints | 7 Databases**

## 🔧 API Endpoints

### Auth Service (`/auth`)
- `POST /auth/register` - Registrasi pengguna
- `POST /auth/login` - Login pengguna
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout
- `GET /auth/profile` - Profil pengguna
- `PUT /auth/profile` - Update profil

### Akun Service (`/akun`)
- `POST /akun` - Buat akun
- `GET /akun` - List akun
- `GET /akun/:id` - Detail akun
- `PUT /akun/:id` - Update akun
- `DELETE /akun/:id` - Hapus akun
- `POST /internal/update-balance` - Update saldo (Internal)

### Transaksi Service (`/transaksi`)
- `POST /transaksi` - Buat transaksi
- `GET /transaksi` - List transaksi
- `GET /transaksi/:id` - Detail transaksi
- `PUT /transaksi/:id` - Update transaksi
- `DELETE /transaksi/:id` - Hapus transaksi
- `POST /transaksi/transfer` - Transfer antar akun
- `GET /history/:akun_id` - Riwayat akun
- `GET /transaksi/export` - Export transaksi
- `GET /history/export` - Export riwayat

### Tujuan Service (`/tujuan`)
- `POST /tujuan` - Buat tujuan
- `GET /tujuan` - List tujuan
- `GET /tujuan/:id` - Detail tujuan
- `PUT /tujuan/:id` - Update tujuan
- `DELETE /tujuan/:id` - Hapus tujuan
- `POST /tujuan/kontribusi` - Tambah kontribusi
- `GET /tujuan/:id/kontribusi` - List kontribusi
- `DELETE /tujuan/kontribusi/:id` - Hapus kontribusi
- `GET /tujuan/kontribusi` - All kontribusi

### Kalkulator Service (`/kalkulator`)
- `POST /kalkulator/kpr` - Kalkulator KPR
- `POST /kalkulator/dana-darurat` - Dana darurat
- `POST /kalkulator/pensiun` - Perencanaan pensiun
- `POST /kalkulator/custom-goal` - Tujuan custom
- `POST /kalkulator/save` - Simpan hasil
- `GET /kalkulator/saved` - List tersimpan
- `GET /kalkulator/saved/:id` - Detail tersimpan
- `PUT /kalkulator/saved/:id` - Update tersimpan
- `DELETE /kalkulator/saved/:id` - Hapus tersimpan

### Kategori Service (`/kategori`)
- `POST /kategori` - Buat kategori
- `GET /kategori` - List kategori
- `GET /kategori/:id` - Detail kategori
- `PUT /kategori/:id` - Update kategori
- `DELETE /kategori/:id` - Hapus kategori

### Tenant Service (`/tenant`)
- `POST /tenant` - Buat tenant
- `GET /tenant` - List tenant
- `GET /tenant/:id` - Detail tenant
- `PUT /tenant/:id` - Update tenant
- `DELETE /tenant/:id` - Hapus tenant

### User Service (`/user`)
- `POST /user/invite` - Undang pengguna
- `GET /user/invites` - List undangan
- `POST /user/accept-invite` - Terima undangan
- `DELETE /user/invite` - Batalkan undangan
- `POST /user/invite/resend` - Kirim ulang
- `GET /user/members` - List anggota
- `PUT /user/permission` - Update permission
- `DELETE /user/member` - Hapus anggota

### Dashboard Service (`/dashboard`)
- `GET /dashboard/stats` - Statistik dashboard

### Laporan Service (`/laporan`)
- `GET /laporan/cashflow` - Laporan arus kas
- `GET /laporan/budget-vs-actual` - Budget vs aktual
- `GET /laporan/net-worth` - Kekayaan bersih

### Frontend Service (`/frontend`)
- `GET /frontend/*path` - Static assets

## 💾 Database Schema

### Core Tables
- **tenants** - Data tenant
- **pengguna** - Data pengguna
- **peran** - Role sistem
- **pengguna_tenant** - Relasi user-tenant

### Financial Tables
- **akun** - Akun keuangan
- **kategori** - Kategori transaksi
- **transaksi** - Data transaksi
- **detail_transaksi_split** - Split kategori
- **transfer_antar_akun** - Transfer data
- **tujuan_tabungan** - Tujuan tabungan
- **kontribusi_tujuan** - Kontribusi tujuan
- **kalkulator_kpr** - Data KPR

### System Tables
- **sesi_login** - Session management
- **undangan** - User invitations
- **notifikasi** - Notifications
- **audit_log** - Audit trail
- **calculator_results** - Saved calculations

## 🔒 Keamanan

### Autentikasi
- bcrypt password hashing
- JWT access tokens (15 min)
- Refresh tokens (30 days)
- Session tracking

### Otorisasi
- Role-based access control
- Tenant data isolation
- API endpoint protection
- Resource-level permissions

### Data Protection
- Input validation & sanitization
- SQL injection prevention
- XSS protection
- Rate limiting

## 🚀 Setup & Development

### Prasyarat
- Node.js 18+ atau Bun
- PostgreSQL 14+
- Encore CLI

### Instalasi
```bash
# Install Encore CLI
curl -L https://encore.dev/install.sh | bash

# Install dependencies
bun install

# Setup database
encore db create finora-backend-zh3i

# Run migrations
encore db migrate

# Start development
encore run
```

### Environment
```bash
# Database otomatis dihandle Encore
# API tersedia di http://localhost:4000
```

## 📊 Fitur Utama

### Multi-tenant Architecture
- Isolasi data per tenant
- Role-based access (Pemilik, Admin, Editor, Pembaca)
- Subdomain identification

### Financial Management
- 6 jenis akun (Kas, Bank, E-Wallet, Kartu Kredit, Pinjaman, Aset)
- 3 jenis transaksi (Pemasukan, Pengeluaran, Transfer)
- Real-time balance tracking
- Multi-currency support (default IDR)

### Advanced Features
- Split transactions
- Goal tracking dengan progress
- Financial calculators (KPR, Dana Darurat, Pensiun, Custom)
- Comprehensive reporting
- Data export capabilities

### System Features
- Soft delete dengan audit trail
- Automatic balance updates
- Transaction pairing untuk transfers
- OCR receipt processing (ready)

## 🔄 Business Logic

### Transaction Flow
1. Validation (amount, balance, required fields)
2. Database transaction (atomic operations)
3. Balance updates (automatic)
4. Audit trail (complete history)

### Transfer Logic
- Paired transactions (outgoing + incoming)
- Goal contributions handling
- Virtual transactions untuk incomplete transfers
- Referential integrity via transfer_antar_akun

### Goal Contributions
- Automatic progress calculation
- Transaction linking untuk audit
- Partial dan excess contribution support
- Transfer system integration

## 📈 Performance

### Database Optimization
- Composite indexes pada frequently queried columns
- Tenant-based partitioning
- Optimized queries untuk listing/filtering

### Caching Strategy
- Service-level caching
- Database connection pooling
- Optimized SQL queries

### Scalability
- Microservices architecture
- Database-per-service pattern
- Stateless service design

## 🔮 Future Development

### Planned Features
- OCR receipt processing
- Recurring transactions
- Budget management
- Investment tracking
- Mobile app support
- ML-powered analytics
- Open banking integration

### Technical Improvements
- Real-time updates (WebSocket)
- Advanced caching (Redis)
- File storage (S3)
- Push notifications
- Advanced rate limiting
- Scheduled exports

---

**Built with ❤️ using Encore.dev framework**