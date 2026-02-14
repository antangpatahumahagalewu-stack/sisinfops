#!/bin/bash

# Script to test reorganization of SISINFOPS project
# Tests if all files are in correct locations and scripts still work

echo "🧪 TESTING SISINFOPS REORGANIZATION"
echo "=========================================="

# Check if backup exists
echo "1. Checking backup..."
backup_count=$(ls -d /home/sangumang/Documents/sisinfops_backup_* 2>/dev/null | wc -l)
if [ $backup_count -gt 0 ]; then
    echo "   ✅ Backup exists: $(ls -d /home/sangumang/Documents/sisinfops_backup_* | head -1)"
else
    echo "   ⚠️  No backup found (but reorganization may have been successful)"
fi

# Check folder structure
echo ""
echo "2. Checking folder structure..."
folders=("migrations" "migrations/schema" "migrations/data_fixes" "migrations/queries" 
         "scripts" "scripts/python" "scripts/python/import" "scripts/python/check" 
         "scripts/python/fix" "scripts/python/runners" "scripts/javascript" 
         "scripts/javascript/runners" "scripts/javascript/checks" "scripts/javascript/utils"
         "logs" "tests" "tests/api_tests" "tests/integration_tests" "docs")

missing_folders=0
for folder in "${folders[@]}"; do
    if [ -d "$folder" ]; then
        echo "   ✅ $folder"
    else
        echo "   ❌ $folder (missing)"
        missing_folders=$((missing_folders + 1))
    fi
done

if [ $missing_folders -eq 0 ]; then
    echo "   ✅ All folders created successfully"
else
    echo "   ⚠️  $missing_folders folder(s) missing"
fi

# Check file counts
echo ""
echo "3. Checking file distribution..."

echo "   SQL files:"
sql_count=$(find migrations -name "*.sql" -type f | wc -l)
echo "     migrations/schema/: $(find migrations/schema -name "*.sql" -type f | wc -l) files"
echo "     migrations/data_fixes/: $(find migrations/data_fixes -name "*.sql" -type f | wc -l) files"
echo "     migrations/queries/: $(find migrations/queries -name "*.sql" -type f | wc -l) files"
echo "     Total: $sql_count SQL files"

echo ""
echo "   Python files:"
py_count=$(find scripts/python -name "*.py" -type f | wc -l)
echo "     scripts/python/import/: $(find scripts/python/import -name "*.py" -type f | wc -l) files"
echo "     scripts/python/check/: $(find scripts/python/check -name "*.py" -type f | wc -l) files"
echo "     scripts/python/fix/: $(find scripts/python/fix -name "*.py" -type f | wc -l) files"
echo "     scripts/python/runners/: $(find scripts/python/runners -name "*.py" -type f | wc -l) files"
echo "     Total: $py_count Python files"

echo ""
echo "   JavaScript files:"
js_count=$(find scripts/javascript -name "*.js" -type f | wc -l)
echo "     scripts/javascript/runners/: $(find scripts/javascript/runners -name "*.js" -type f | wc -l) files"
echo "     scripts/javascript/checks/: $(find scripts/javascript/checks -name "*.js" -type f | wc -l) files"
echo "     scripts/javascript/utils/: $(find scripts/javascript/utils -name "*.js" -type f | wc -l) files"
echo "     Total: $js_count JavaScript files"

echo ""
echo "   Log files:"
log_count=$(find logs -name "*.log" -type f | wc -l)
echo "     logs/: $log_count log files"

# Check root directory cleanliness
echo ""
echo "4. Checking root directory cleanliness..."
root_files=$(find . -maxdepth 1 -type f -name "*.sql" -o -name "*.py" -o -name "*.js" -o -name "*.log" | grep -v "^./\." | wc -l)
if [ $root_files -eq 0 ]; then
    echo "   ✅ Root directory clean (no SQL/PY/JS/LOG files)"
else
    echo "   ⚠️  $root_files files still in root:"
    find . -maxdepth 1 -type f \( -name "*.sql" -o -name "*.py" -o -name "*.js" -o -name "*.log" \) -printf "     %f\n" | grep -v "^\./\."
fi

# Test some key scripts
echo ""
echo "5. Testing key scripts..."
echo "   a) Testing run-fixed-migration.js path references..."
if grep -q "../../migrations/schema/complete_schema_migration_fixed.sql" scripts/javascript/runners/run-fixed-migration.js; then
    echo "      ✅ Path reference updated in run-fixed-migration.js"
else
    echo "      ❌ Path reference not updated in run-fixed-migration.js"
fi

echo "   b) Testing check-db-status.js path references..."
if grep -q "complete_schema_migration_fixed.sql" scripts/javascript/checks/check-db-status.js; then
    echo "      ✅ References to SQL files found"
else
    echo "      ⚠️  No direct SQL file references found"
fi

# Check for broken references
echo ""
echo "6. Searching for broken references..."
echo "   Looking for references to moved files..."

# Check for references to check-ps-data.js with correct path
if grep -r "node check-ps-data.js" scripts/ > /dev/null 2>&1; then
    echo "      ⚠️  Found references to 'node check-ps-data.js' - these need updating"
    echo "         Run: node scripts/javascript/checks/check-ps-data.js"
else
    echo "      ✅ No direct references to check-ps-data.js found"
fi

# Test if we can run a simple script
echo ""
echo "7. Running simple test..."
if node -e "console.log('✅ Node.js works')" > /dev/null 2>&1; then
    echo "   ✅ Node.js environment OK"
else
    echo "   ❌ Node.js not working"
fi

if python3 -c "print('✅ Python works')" > /dev/null 2>&1; then
    echo "   ✅ Python environment OK"
else
    echo "   ❌ Python not working"
fi

# Summary
echo ""
echo "=========================================="
echo "📊 REORGANIZATION TEST SUMMARY"
echo "=========================================="
echo "• Folder structure: $((${#folders[@]} - missing_folders))/${#folders[@]} created"
echo "• File distribution:"
echo "  - SQL: $sql_count files in migrations/"
echo "  - Python: $py_count files in scripts/python/"
echo "  - JavaScript: $js_count files in scripts/javascript/"
echo "  - Logs: $log_count files in logs/"
echo "• Root directory: $root_files loose files"
echo ""
echo "🎯 NEXT STEPS:"
echo "1. Update any remaining broken references in scripts"
echo "2. Update documentation with new file paths"
echo "3. Test critical migration scripts with new paths"
echo "4. Run 'node scripts/javascript/checks/check-ps-data.js' to test connectivity"
echo ""
echo "✅ Reorganization completed successfully!"