# Error Detector with Cline Integration (PERBAIKAN - v1.1)

Script Python untuk mendeteksi error pada Next.js development server dan auto-generate prompt untuk Cline Plan Mode.

**PERBAIKAN v1.1** - Script sekarang mendeteksi browser console warnings dan berbagai jenis issues!

## 🎯 Fitur Utama

1. **Real-time Monitoring**: Monitor Next.js dev server logs secara real-time
2. **Auto Error Detection**: Deteksi berbagai jenis error (JavaScript, API, database, Supabase)
3. **Cline Integration**: Auto-generate prompt untuk Cline Plan Mode
4. **Clipboard Support**: Auto-copy prompt ke clipboard untuk instant paste
5. **Context Capture**: Capture konteks proyek (git branch, recent changes, environment)
6. **Development Only**: Hanya untuk development, tidak di-commit ke GitHub

## 📦 Instalasi & Setup

### 1. Pastikan Python 3 terinstall
```bash
python3 --version
```

### 2. Script sudah siap digunakan
File: `error_detector.py`

### 3. Script sudah ditambahkan ke .gitignore
File lokal tidak akan di-commit ke GitHub

## 🚀 Cara Penggunaan

### Mode 1: Start dan Monitor Server Baru
```bash
python3 error_detector.py
```

### Mode 2: Monitor Server yang Sudah Running
```bash
python3 error_detector.py --monitor-existing
```

### Mode 3: Gunakan Port Tertentu
```bash
python3 error_detector.py --port 3001
```

### Mode 4: Test Script
```bash
python3 error_detector.py --test
```

### Mode 5: Help
```bash
python3 error_detector.py --help
```

## 🔧 Error yang Dideteksi (PERBAIKAN v1.1)

Script sekarang mendeteksi **berbagai jenis issues** dari 2 sumber:

### 1. Terminal/Server Logs:
- JavaScript Errors (`Error:`, `TypeError:`, `ReferenceError:`, `SyntaxError:`)
- Uncaught Exceptions
- Database Errors (`Could not find`, `foreign key violation`)
- Network Errors (`Failed to fetch`)
- HTTP Status Errors (500, 404, 401, 403)
- Supabase Errors
- Relationship Errors
- Next.js Issues (Fast Refresh, HMR, Turbopack)
- ESLint & TypeScript Issues
- Performance Warnings

### 2. Browser Console Warnings:
- React Warnings (`Warning:`, `React Warning:`)
- Deprecation Warnings (`DeprecationWarning:`)
- Console Warnings (`console.warn`)
- Network Warnings
- Memory Leak Warnings
- Performance Warnings

## 📋 Workflow Deteksi Error

```
1. Script monitoring Next.js dev server logs
2. Ketika error terdeteksi → Analyze error context
3. Generate prompt untuk Cline Plan Mode
4. Save prompt ke file (.cline_prompts/)
5. Copy prompt ke clipboard
6. User: Switch Cline ke Plan Mode
7. User: Paste prompt ke Cline box
8. Cline: Analyze dan berikan solusi
```

## 📁 File yang Dihasilkan

### 1. Prompt Files
```
.cline_prompts/
├── error_analysis_20260204_082303_Test_Error.txt
├── error_analysis_20260204_082305_Database_Error.txt
└── ...
```

Format: `error_analysis_YYYYMMDD_HHMMSS_Error_Type.txt`

### 2. Log Files
```
.error_logs/
├── 2026-02-04_errors.log
└── ...
```

## 💡 Contoh Prompt yang Digenerate

```markdown
# [PLAN MODE REQUEST] - ERROR ANALYSIS REQUIRED
## Task: Fix Database Error in Social Forestry Information System (sisinfops)

## 🔴 ERROR DETAILS
**Timestamp**: 2026-02-04 08:23:03
**Error Type**: Database Error
**Error Message**: Could not find relationship between vvb_engagements and verra_project_registrations
**Pattern Detected**: Could not find

## 📊 PROJECT CONTEXT
**Project**: sisinfops
**Environment**: development
**Git Branch**: main
**Uncommitted Changes**: True
**Port**: 3000

## 📝 RECENT CHANGES
7fa1abc update 25
9ece99a update 24
...

## 🎯 EXPECTED BEHAVIOR
Next.js dev server should run without errors during development.

## 🚨 CURRENT BEHAVIOR
Error detected: "Could not find relationship between vvb_engagements and verra_project_registrations"

## 🔍 FILES TO CHECK
1. Check database schema and relationships
2. Check Supabase queries
3. Check VVB management page components
4. Check recent migrations

## 🛠️ REQUESTED ANALYSIS
Please analyze:
1. What type of error is this?
2. Which files are affected?
3. How to fix step-by-step?
4. Precautions before applying fixes?

## 🚀 MODE: Plan Mode
Please provide step-by-step solution.
```

## ⚙️ Konfigurasi Error Patterns

Error patterns bisa dikustomisasi di dalam script:
```python
ERROR_PATTERNS = [
    (r"Error:", "JavaScript Error"),
    (r"TypeError:", "Type Error"),
    (r"Could not find", "Relationship Error"),
    # Tambahkan pattern Anda sendiri
]
```

## 🛠️ Troubleshooting

### 1. Clipboard tidak bekerja di Linux
Install xclip atau xsel:
```bash
sudo apt install xclip  # Debian/Ubuntu
# atau
sudo apt install xsel   # Alternatif
```

### 2. Next.js server tidak start
Pastikan dependensi terinstall:
```bash
npm install
```

### 3. Port sudah digunakan
```bash
python3 error_detector.py --port 3001
```

### 4. Script permission denied
```bash
chmod +x error_detector.py
```

## 📝 Best Practices

1. **Gunakan di development mode saja** - Script ini untuk debugging development
2. **Check .gitignore** - Pastikan file tidak di-commit
3. **Review prompt** - Sebelum paste ke Cline, review prompt untuk konteks
4. **Clean up periodically** - Hapus file prompt lama di `.cline_prompts/`
5. **Test dengan `--test` flag** - Verifikasi script bekerja sebelum digunakan

## 🔄 Integrasi dengan Cursor/Cline

### Manual Integration:
1. Jalankan script: `python3 error_detector.py`
2. Ketika error terjadi, prompt otomatis di-copy
3. Switch Cline ke Plan Mode
4. Paste prompt ke Cline box
5. Cline akan analisis dan berikan solusi

### Tips:
- Keep Cline window open side-by-side
- Script akan terus monitoring selama development
- Prompt sudah include semua konteks yang dibutuhkan

## 🚫 Error yang Tidak Dideteksi

Script ini fokus pada server-side errors. Untuk client-side errors:
- Gunakan browser DevTools
- React Error Boundaries sudah ada di `components/error/error-boundary.tsx`

## 📄 License & Credits

Script ini dibuat khusus untuk proyek **Social Forestry Information System (sisinfops)**.

**Note**: Script ini hanya untuk development lokal, tidak untuk production use.

---

**Happy Debugging! 🐛→🦸→✅**