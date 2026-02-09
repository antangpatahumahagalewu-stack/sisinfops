# SISINFOPS Reorganization Notes

## 📁 New Folder Structure (Implemented on $(date))

### Root Directory Structure
```
sisinfops/
├── 📁 migrations/           # All SQL files
│   ├── schema/             # Schema migrations (complete_schema_migration*.sql)
│   ├── data_fixes/         # Fix scripts (fix_*.sql, run_*_fix.sql)
│   ├── queries/            # Check/query scripts (check_*.sql, analyze_*.sql)
│   └── archive/            # Old/unused files
├── 📁 scripts/             # All Python & JavaScript scripts
│   ├── python/
│   │   ├── import/         # Import scripts (import_*.py, add_*.py)
│   │   ├── check/          # Check scripts (check_*.py, verify_*.py)
│   │   ├── fix/            # Fix scripts (fix_*.py, run_*_fix.py)
│   │   └── runners/        # Runner scripts (run_*.py)
│   ├── javascript/
│   │   ├── runners/        # Runner scripts (run_*.js, *-migration.js)
│   │   ├── checks/         # Check scripts (check_*.js, verify_*.js)
│   │   └── utils/          # Utility scripts
│   └── sql_runners/        # Scripts that execute SQL
├── 📁 logs/                # Log files (*.log)
├── 📁 tests/               # Test files
│   ├── sql_tests/
│   ├── api_tests/
│   └── integration_tests/
├── 📁 docs/                # Documentation (already existed)
├── 📁 app/                 # Next.js application (unchanged)
├── 📁 components/          # React components (unchanged)
└── 📁 lib/                 # Libraries (unchanged)
```

### File Distribution Summary
- **SQL files**: 30 files in migrations/
- **Python scripts**: 62 files in scripts/python/
- **JavaScript scripts**: 30 files in scripts/javascript/
- **Log files**: 12 files in logs/

### 🔧 Updated References
The following references have been updated:
1. `node check-ps-data.js` → `node scripts/javascript/checks/check-ps-data.js`
2. SQL file paths in migration runners now point to `../../migrations/schema/`
3. All loose files moved from root to appropriate folders

### 🚀 How to Run Scripts Now
```bash
# Migration runners
node scripts/javascript/runners/run-fixed-migration.js
node scripts/javascript/runners/simple-migration-runner.js

# Database checks
node scripts/javascript/checks/check-db-status.js
node scripts/javascript/checks/check-ps-data.js

# Python scripts
python3 scripts/python/runners/run_simple_migration.py
python3 scripts/python/check/debug_rls.py
```

### 📝 Notes for Developers
1. When adding new SQL files, place them in the appropriate `migrations/` subfolder
2. New Python scripts go in `scripts/python/` with appropriate subfolder
3. New JavaScript scripts go in `scripts/javascript/` with appropriate subfolder
4. Always use relative paths that account for the new structure
5. Backup created at: /home/sangumang/Documents/sisinfops_backup_20260204_183513

### ✅ Verification
Run the test script to verify organization:
```bash
chmod +x test_reorganization.sh
./test_reorganization.sh
```

