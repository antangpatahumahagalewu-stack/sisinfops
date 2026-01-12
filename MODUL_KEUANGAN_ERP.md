# Modul Keuangan (ERP) - Sistem Informasi Perhutanan Sosial & Proyek Karbon

## **Overview**

Modul Keuangan adalah sistem Enterprise Resource Planning (ERP) yang terintegrasi dengan platform Sistem Informasi Perhutanan Sosial & Proyek Karbon. Modul ini dirancang untuk memenuhi kebutuhan transparansi keuangan, akuntabilitas donor, dan pengambilan keputusan berbasis data dalam pengelolaan proyek perhutanan sosial dan karbon.

## **Fitur Utama**

### **1. Manajemen Donor & Grant**
- **Master Data Donor**: Katalog donor/investor (NGO internasional, pemerintah, swasta)
- **Tracking Grant**: Pelacakan dana dari donor ke yayasan
- **Multi-Currency Support**: Support untuk IDR, USD, EUR, dll.
- **Status Monitoring**: Status grant (draft, approved, active, closed)

### **2. Penganggaran & Alokasi Dana**
- **Budget Planning**: Anggaran terperinci per program/kegiatan/lokasi
- **Budget Allocations**: Detail alokasi per item (bibit, alat, gaji, dll)
- **Approval Workflow**: Alur persetujuan anggaran
- **Budget vs Actual**: Monitoring realisasi vs rencana

### **3. Transaksi Keuangan**
- **Dual Entry System**: Penerimaan dan pengeluaran
- **Multi-Category**: Kategorisasi transaksi (bibit, alat, transport, pelatihan, dll)
- **Bukti Digital**: Upload bukti transaksi
- **Rekonsiliasi**: Status rekonsiliasi bank

### **4. Distribusi Bagi Hasil**
- **Benefit Sharing**: Distribusi dana ke masyarakat lokal
- **Integration with KK Data**: Terintegrasi dengan data kepala keluarga
- **Multiple Methods**: Tunai, barang, jasa
- **Audit Trail**: Bukti distribusi dan persetujuan

### **5. Metrik Keuangan Terintegrasi**
- **Cost per Hectare**: Biaya per hektar hutan
- **Cost per Ton Carbon**: Biaya per ton penyerapan karbon
- **Cost per KK**: Biaya per kepala keluarga
- **Automated Calculation**: Kalkulasi otomatis dari data teknis

### **6. Laporan & Compliance**
- **Donor Reports**: Laporan interim, final, audit
- **Financial Statements**: Laporan keuangan standar
- **Export Capabilities**: Excel, PDF, CSV
- **Compliance Tracking**: Tracking persyaratan donor

### **7. Dashboard & Analytics**
- **Real-time Dashboard**: Overview keuangan real-time
- **Visual Analytics**: Chart dan grafik interaktif
- **Alert System**: Notifikasi otomatis
- **Drill-down Capabilities**: Analisis detail per segment

## **Struktur Database**

### **Tabel Utama (10 Tabel)**

1. **`donors`** - Master data donor
2. **`grants`** - Penyaluran dana dari donor
3. **`budgets`** - Anggaran terperinci
4. **`budget_allocations`** - Detail alokasi anggaran
5. **`financial_transactions`** - Transaksi keuangan
6. **`benefit_distributions`** - Distribusi bagi hasil
7. **`financial_metrics`** - Metrik keuangan terintegrasi
8. **`financial_reports`** - Laporan untuk donor
9. **`accounting_segments`** - Segmentasi akuntansi
10. **`segment_combinations`** - Kombinasi segment valid

### **Integrasi dengan Sistem Existing**

- **`carbon_projects`** → Link ke proyek karbon
- **`programs`** → Link ke program kerja
- **`kegiatan_dram`** → Link ke kegiatan implementasi
- **`perhutanan_sosial`** → Link ke unit PS
- **`kepala_keluarga`** → Link ke data penerima manfaat
- **`profiles`** → Link ke user system

## **Security & Access Control**

### **Role-Based Access Control (RBAC)**

1. **Admin** - Full access semua fitur
2. **Carbon Specialist** - Manajemen proyek karbon & keuangan
3. **Program Planner** - Perencanaan anggaran & program
4. **Program Implementer** - Input transaksi implementasi
5. **Monev Officer** - Monitoring & evaluasi keuangan
6. **Viewer** - Read-only access terbatas

### **Row Level Security (RLS)**
- Policies berdasarkan role user
- Audit trail untuk semua operasi
- Data isolation antar proyek/program

## **Dashboard Keuangan**

### **Komponen Utama**

1. **Financial Health Overview**
   - Total Dana Grant
   - Saldo Netto
   - Jumlah Transaksi
   - Jumlah Donor Aktif

2. **Alerts & Notifications**
   - Grant akan berakhir
   - Transaksi perlu rekonsiliasi
   - Budget overrun warning
   - Laporan deadline

3. **Recent Transactions**
   - 10 transaksi terakhir
   - Filter by jenis, status, tanggal
   - Quick actions

4. **Active Grants**
   - Grant dengan status aktif
   - Periode dan jumlah dana
   - Utilization rate

5. **Quick Actions**
   - Tambah transaksi baru
   - Kelola anggaran
   - Generate laporan
   - Kelola donor

6. **Key Performance Indicators**
   - Cost per Hectare
   - Cost per Ton Carbon
   - Grant Utilization Rate

## **Workflow Bisnis**

### **1. Perencanaan Anggaran**
```
Donor → Grant → Budget → Budget Allocations
```

### **2. Implementasi & Transaksi**
```
Budget → Financial Transactions → Bukti → Rekonsiliasi
```

### **3. Distribusi & Pelaporan**
```
Grant → Benefit Distributions → Financial Reports → Donor
```

### **4. Monitoring & Evaluasi**
```
Transactions → Financial Metrics → Dashboard → Alerts
```

## **Technical Implementation**

### **Frontend**
- **Framework**: Next.js 14 (App Router)
- **UI Library**: Shadcn/ui + Tailwind CSS
- **Charts**: Recharts / Chart.js
- **State Management**: React Query
- **Internationalization**: next-intl

### **Backend**
- **Database**: PostgreSQL 15+ (Supabase)
- **API**: Supabase REST & Realtime
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (bukti transaksi)

### **Database Features**
- **Generated Columns**: Auto-calculated metrics
- **JSONB**: Flexible metadata storage
- **Array Columns**: Multiple file URLs
- **Check Constraints**: Data validation
- **Indexes**: Optimized query performance

## **File Migrasi**

### **Lokasi**: `supabase/migrations/20260113_create_financial_module_tables.sql`

### **Fitur Migrasi:**
- 10 tabel baru dengan relasi yang tepat
- Index untuk performa query
- RLS policies untuk security
- Triggers untuk audit trail
- Functions untuk kalkulasi metrik

## **Setup & Deployment**

### **1. Jalankan Migrasi**
```bash
# Apply migration to Supabase
supabase db push
```

### **2. Konfigurasi Awal**
```sql
-- Insert sample accounting segments
INSERT INTO accounting_segments (segment_type, segment_code, segment_name) VALUES
('DONOR', 'USAID', 'United States Agency for International Development'),
('PROJECT', 'CP001', 'Katingan Carbon Project'),
('LOCATION', 'KATINGAN', 'Kabupaten Katingan'),
('EXPENSE_TYPE', 'BIBIT', 'Bibit Pohon');
```

### **3. Testing**
```bash
# Run development server
npm run dev

# Access financial dashboard
http://localhost:3000/id/dashboard/keuangan
```

## **Value Proposition**

### **Untuk Yayasan:**
- **Transparansi** keuangan lengkap
- **Akuntabilitas** kepada donor
- **Efisiensi** operasional
- **Data-driven** decision making

### **Untuk Donor:**
- **Real-time** reporting
- **Traceability** dana hingga lapangan
- **Impact metrics** terukur
- **Compliance** dengan standar internasional

### **Untuk Masyarakat:**
- **Transparansi** distribusi manfaat
- **Keadilan** dalam pembagian hasil
- **Partisipasi** dalam monitoring

## **Roadmap Pengembangan**

### **Phase 1 (MVP) - Selesai**
- [x] Database schema design
- [x] Basic tables creation
- [x] RLS policies implementation
- [x] Dashboard foundation
- [x] Sidebar integration

### **Phase 2 (Q1 2026)**
- [ ] Complete CRUD operations
- [ ] Advanced chart visualizations
- [ ] Export functionality
- [ ] Automated alerts system

### **Phase 3 (Q2 2026)**
- [ ] Bank integration (reconciliation)
- [ ] Mobile responsive views
- [ ] Advanced reporting
- [ ] PDD generator integration

### **Phase 4 (Q3 2026)**
- [ ] AI-powered insights
- [ ] Predictive analytics
- [ ] Multi-tenant architecture
- [ ] API for external systems

## **Dokumentasi Terkait**

1. **Database Design**: `DESAIN_DATABASE_SISTEM_INFORMASI_PERHUTANAN_SOSIAL.md`
2. **Technical Spec**: `TECHNICAL_DOC.md`
3. **Product Spec**: `PRODUCT_SPECIFICATION_DOC.md`
4. **Migration Files**: `supabase/migrations/`

## **Kontak & Support**

- **Technical Lead**: [Nama Lead Developer]
- **Product Owner**: [Nama Product Owner]
- **Documentation**: [Link ke Confluence/Wiki]
- **Issue Tracking**: [Link ke Jira/GitHub Issues]

---
**Dokumen Terakhir Diupdate**: 13 Januari 2026  
**Versi**: 1.0.0  
**Status**: Development Phase 1 Selesai
