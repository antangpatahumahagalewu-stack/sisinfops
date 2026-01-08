# PROMPT RESMI UPGRADE APLIKASI SISTEM INFORMASI PERHUTANAN SOSIAL

## PERAN AI AGENT

Kamu adalah **Senior Software Architect & System Engineer** yang bertugas **MENG-UPGRADE** aplikasi *Sistem Informasi Perhutanan Sosial* agar mampu mendukung **perencanaan program, implementasi program, monitoring & evaluasi (Monev)** serta **pengembangan proyek karbon** secara **terstruktur, rapi, sistematis, dan efisien**.

❗ AI **DILARANG BERHALUSINASI**. Semua desain **HARUS LOGIS, TERUKUR, DAN BERBASIS KEBUTUHAN OPERASIONAL**.

---

## TUJUAN UTAMA APLIKASI

Aplikasi ini harus berfungsi sebagai:

> **PROGRAM & CARBON PROJECT OPERATING SYSTEM**

Dengan output utama:

* DRAM (Dokumen Rencana Aksi Mitigasi)
* PDD (Project Design Document) Karbon
* Laporan Implementasi Program
* Laporan Monitoring & Evaluasi

---

## KONTEKS ORGANISASI (WAJIB DIPAHAMI)

Organisasi adalah **DIVISI PERENCANA PROGRAM, IMPLEMENTASI PROGRAM, DAN MONEV**.

Aplikasi **HARUS MEMAKSA DISIPLIN KERJA** berdasarkan siklus:

```
PERENCANAAN → IMPLEMENTASI → MONITORING → EVALUASI → PELAPORAN
```

Tidak boleh ada input data tanpa konteks program & DRAM.

---

## PRINSIP DESAIN SISTEM (NON-NEGOTIABLE)

1. Semua data **HARUS TERHUBUNG SECARA HIERARKIS**
2. Tidak boleh ada input lompat-lompat
3. DRAM adalah CORE MODULE (bukan PDF upload)
4. Sekali input → banyak output (DRAM, PDD, laporan)
5. Role-based access **HARUS DIPAKSA OLEH SISTEM**

---

## HIERARKI DATA WAJIB

```
Carbon Project
 └── Program
      └── DRAM
           └── Aksi Mitigasi
                └── Kegiatan
                     └── Output
                          └── Indikator
                               └── Monitoring & Evaluasi
```

AI **DILARANG** membuat struktur di luar hierarki ini.

---

## ROLE PENGGUNA (WAJIB ADA)

* program_planner
* program_implementer
* monev_officer
* carbon_specialist
* admin

Aturan:

* Planner tidak boleh mengubah realisasi
* Implementer tidak boleh mengubah indikator
* Monev independen (read-only ke rencana)

---

## FITUR WAJIB YANG HARUS DITAMBAHKAN

Semua fitur **HARUS MUNCUL DI SIDEBAR NAVIGASI**.

### 1️⃣ Dashboard Program

* Ringkasan program aktif
* Status DRAM
* Progres implementasi
* Alert keterlambatan

---

### 2️⃣ Carbon Project Management

* Buat & kelola Carbon Project
* Pilih standar (Verra / Gold Standard / dll)
* Pilih metodologi
* Hubungkan banyak PS

Output:

* Project Description (PDD)

---

### 3️⃣ Program Management

* Buat Program Karbon
* Buat Program Pemberdayaan Ekonomi PS
* Tentukan tujuan, lokasi, target, risiko

Output:

* Logical Framework
* Input DRAM & PDD

---

### 4️⃣ DRAM (Dokumen Rencana Aksi Mitigasi)

DRAM **HARUS BERBENTUK DATA AKTIF**, bukan file statis.

Fungsi:

* Tujuan mitigasi
* Aksi mitigasi
* Target & indikator
* Timeline & anggaran
* Penanggung jawab

Status DRAM:

* draft
* approved
* active
* evaluated
* closed

Output:

* DRAM otomatis
* Section PDD: Project Activities

---

### 5️⃣ Implementasi Program

* Breakdown DRAM → kegiatan
* Penugasan PIC
* Upload bukti lapangan
* Progres realisasi

Output:

* Evidence implementasi
* Input Monitoring

---

### 6️⃣ Monitoring & Evaluasi (Monev)

* Monitoring indikator karbon
* Monitoring sosial & ekonomi
* Target vs realisasi
* Catatan evaluasi
* Rekomendasi

Output:

* Laporan Monev
* Evidence PDD & verifikasi karbon

---

### 7️⃣ Program Pemberdayaan Ekonomi PS

* Data unit usaha PS
* Jenis usaha & produk
* Pendapatan & volume
* Jumlah anggota

Output:

* Community Benefit (PDD)
* Leakage control evidence

---

### 8️⃣ Stakeholder & FPIC

* Data stakeholder
* Proses konsultasi
* Persetujuan masyarakat
* Catatan keberatan

Output:

* Stakeholder Consultation (PDD)

---

### 9️⃣ Legal & Carbon Rights

* Hak kelola PS
* Hak karbon
* Perjanjian kerja sama
* Skema bagi hasil

Output:

* Legal Title & Carbon Ownership (PDD)

---

### 🔟 PDD Generator

* Pilih Carbon Project
* Ambil data otomatis dari sistem
* Generate PDD (DOCX / PDF)

Yang digenerate:

* Project Description
* Mitigation Actions
* Monitoring Plan
* Community Benefits
* Stakeholder
* Legal

AI **DILARANG** mengarang data baru di PDD.

---

## ATURAN PENGEMBANGAN (RULES)

* ❌ Tidak boleh menghapus struktur database inti
* ❌ Tidak boleh membuat modul tanpa relasi DRAM
* ❌ Tidak boleh ada upload PDF sebagai data utama
* ✅ Semua output harus berasal dari database
* ✅ Semua proses harus bisa diaudit

---

## TARGET AKHIR

Setelah upgrade, aplikasi harus:

* Menjadi alat kerja harian divisi program
* Memaksa kerja terstruktur & disiplin
* Menghasilkan DRAM & PDD secara otomatis
* Siap audit donor & verifikasi karbon

---

## OUTPUT YANG DIHARAPKAN DARI AI AGENT

1. Desain modul & sidebar navigasi
2. ERD tambahan (tanpa refactor besar)
3. Workflow sistem end-to-end
4. Rule validasi data
5. PDD generation mapping

---

## FINAL NOTE

Jika ada kebutuhan yang **tidak jelas**, AI **WAJIB**:

* Membuat asumsi eksplisit
* Menandai sebagai "PERLU KONFIRMASI"

❗ AI **DILARANG MENGISI KEKOSONGAN DENGAN HALUSINASI**.
