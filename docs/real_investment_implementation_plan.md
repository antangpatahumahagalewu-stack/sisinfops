# 📋 PLAN IMPLEMENTASI: REAL INVESTMENT DATA UNTUK INVESTOR DASHBOARD

## 📊 HASIL ANALISIS DATABASE (Current State)

### **✅ STRUKTUR YANG SUDAH ADA:**
1. **Carbon Projects**: 4 projects dengan `investment_amount` hardcoded
2. **Programs**: 1 program dengan `carbon_project_id` column (✅ sudah ada!)
3. **Program Budgets**: 1 budget (Rp 500M) dengan status "draft"
4. **Program Budget Items**: 1 item linked ke price_list

### **❌ ISSUES YANG DITEMUKAN:**
1. **Missing columns in carbon_projects**:
   - `kabupaten` ❌ tidak ada
   - `luas_total_ha` ❌ tidak ada  
   - `real_investment_total` ❌ tidak ada
   - `avg_investment_per_ha` ❌ tidak ada

2. **No data mapping**:
   - 0/1 programs memiliki `carbon_project_id` (belum ada mapping)

3. **Budget status**:
   - Semua budget masih "draft" (belum "approved")

## 🎯 TUJUAN AKHIR
```
Total Investment = Σ(program_budgets.total_amount WHERE status = 'approved')
Avg per Ha = Total Investment ÷ luas_total_ha
```

## 🔧 LANGKAH IMPLEMENTASI (REVISED)

### **STEP 1: PERBAIKI STRUKTUR CARBON_PROJECTS**
```sql
-- 1.1 Tambah kolom yang hilang
ALTER TABLE carbon_projects 
ADD COLUMN IF NOT EXISTS kabupaten VARCHAR(100),
ADD COLUMN IF NOT EXISTS luas_total_ha DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS real_investment_total DECIMAL(20,2),
ADD COLUMN IF NOT EXISTS avg_investment_per_ha DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS investment_calculation_method VARCHAR(50) DEFAULT 'estimated',
ADD COLUMN IF NOT EXISTS last_investment_calculation TIMESTAMP WITH TIME ZONE;

-- 1.2 Update data existing (jika ada data di kolom lain)
UPDATE carbon_projects 
SET 
    kabupaten = CASE 
        WHEN nama_project ILIKE '%gunung mas%' THEN 'Gunung Mas'
        WHEN nama_project ILIKE '%pulang pisau%' THEN 'Pulang Pisau' 
        WHEN nama_project ILIKE '%kapuas%' THEN 'Kapuas'
        WHEN nama_project ILIKE '%katingan%' THEN 'Katingan'
        ELSE 'Unknown'
    END,
    luas_total_ha = CASE 
        WHEN nama_project ILIKE '%gunung mas%' THEN 72800.99
        WHEN nama_project ILIKE '%pulang pisau%' THEN 27876.00
        WHEN nama_project ILIKE '%kapuas%' THEN 56771.00
        WHEN nama_project ILIKE '%katingan%' THEN 29239.00
        ELSE 0
    END
WHERE kabupaten IS NULL OR luas_total_ha IS NULL;
```

### **STEP 2: BUAT MAPPING PROGRAM ↔ CARBON PROJECT**
```sql
-- 2.1 Update existing program dengan carbon_project_id
UPDATE programs p
SET carbon_project_id = cp.id
FROM carbon_projects cp
WHERE 
    -- Mapping logic: program mengandung nama kabupaten
    (p.program_name ILIKE '%' || 
        CASE 
            WHEN cp.kabupaten = 'Gunung Mas' THEN 'gunung mas'
            WHEN cp.kabupaten = 'Pulang Pisau' THEN 'pulang pisau'
            WHEN cp.kabupaten = 'Kapuas' THEN 'kapuas'
            WHEN cp.kabupaten = 'Katingan' THEN 'katingan'
            ELSE ''
        END || '%')
    AND p.carbon_project_id IS NULL;

-- 2.2 Jika tidak ada match, assign secara manual
-- (Butuh input manual untuk mapping yang tepat)
```

### **STEP 3: IMPLEMENT CALCULATION LOGIC**
```sql
-- 3.1 Function untuk hitung real investment
CREATE OR REPLACE FUNCTION calculate_real_investment()
RETURNS TRIGGER AS $$
DECLARE
    total_investment DECIMAL(20,2);
    luas_ha DECIMAL(15,2);
    avg_per_ha DECIMAL(15,2);
BEGIN
    -- Hitung total approved budgets untuk carbon project ini
    SELECT COALESCE(SUM(pb.total_amount), 0) INTO total_investment
    FROM programs p
    JOIN program_budgets pb ON pb.program_id = p.id
    WHERE p.carbon_project_id = NEW.carbon_project_id
    AND pb.status = 'approved'
    AND p.budget_status = 'approved';
    
    -- Get luas project
    SELECT luas_total_ha INTO luas_ha
    FROM carbon_projects
    WHERE id = NEW.carbon_project_id;
    
    -- Calculate average per hectare
    IF luas_ha > 0 THEN
        avg_per_ha := total_investment / luas_ha;
    ELSE
        avg_per_ha := 0;
    END IF;
    
    -- Update carbon_projects
    UPDATE carbon_projects
    SET 
        real_investment_total = total_investment,
        avg_investment_per_ha = avg_per_ha,
        investment_calculation_method = CASE 
            WHEN total_investment > 0 THEN 'real_budget'
            ELSE 'estimated'
        END,
        last_investment_calculation = NOW()
    WHERE id = NEW.carbon_project_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3.2 Triggers
CREATE TRIGGER trigger_update_investment_on_budget_change
    AFTER INSERT OR UPDATE OF status OR DELETE ON program_budgets
    FOR EACH ROW EXECUTE FUNCTION calculate_real_investment();

CREATE TRIGGER trigger_update_investment_on_program_change
    AFTER INSERT OR UPDATE OF carbon_project_id OR DELETE ON programs
    FOR EACH ROW EXECUTE FUNCTION calculate_real_investment();
```

### **STEP 4: MIGRATION EXISTING DATA**
```python
# File: migrate_real_investment_data.py
"""
1. Update carbon_projects dengan kolom baru
2. Hitung real investment dari approved budgets
3. Update investor data
4. Generate report perbedaan old vs new
"""
```

### **STEP 5: UPDATE INVESTOR DASHBOARD API**
```typescript
// Prioritaskan real data, fallback ke estimated
const investmentAmount = project.real_investment_total || project.investment_amount || 0;
const avgPerHa = project.avg_investment_per_ha || 
                (project.luas_total_ha > 0 ? investmentAmount / project.luas_total_ha : 0);
```

### **STEP 6: UPDATE FRONTEND DISPLAY**
```typescript
// Tampilkan:
// - Total Investment: Rp XXX (Real/Estimated)
// - Avg per Ha: Rp XXX
// - Data Source: Real Budget / Estimated
```

## 📅 TIMELINE DETAILED

### **Day 1: Database Fixes & Mapping**
1. Run SQL untuk tambah kolom carbon_projects
2. Update mapping program ↔ carbon project
3. Test calculation function

### **Day 2: Data Migration**
1. Run migration script untuk data existing
2. Validate calculations
3. Generate audit report

### **Day 3: API Updates**
1. Update investor dashboard API
2. Test dengan real data
3. Implement fallback logic

### **Day 4: Frontend Updates**
1. Update UI untuk tampilkan avg per ha
2. Add data source indicator
3. Test end-to-end

### **Day 5: Testing & Validation**
1. Unit testing
2. Integration testing
3. User acceptance testing

### **Day 6: Deployment & Monitoring**
1. Deploy to production
2. Monitor data accuracy
3. Collect user feedback

## ⚠️ RISKS & MITIGATION

### **Risk 1: No approved budgets**
- **Mitigation**: Fallback ke estimated data, tampilkan warning

### **Risk 2: Mapping tidak akurat**
- **Mitigation**: Manual review mapping, add UI untuk manage mapping

### **Risk 3: Performance issues**
- **Mitigation**: Indexing, materialized views, caching

## ✅ SUCCESS METRICS

1. **Data Accuracy**: 100% real budget data untuk projects dengan approved budgets
2. **Performance**: API response < 500ms
3. **User Satisfaction**: Investor dapat lihat real investment data
4. **System Integrity**: No breaking changes to existing functionality

## 🔍 VALIDATION QUERIES

```sql
-- Post-implementation validation
SELECT 
    cp.nama_project,
    cp.kabupaten,
    cp.luas_total_ha,
    cp.investment_amount as "OLD_Estimated",
    cp.real_investment_total as "NEW_Real",
    cp.avg_investment_per_ha as "Avg_per_Ha",
    cp.investment_calculation_method as "Data_Source",
    COUNT(DISTINCT p.id) as "Program_Count",
    COUNT(DISTINCT pb.id) as "Approved_Budget_Count"
FROM carbon_projects cp
LEFT JOIN programs p ON p.carbon_project_id = cp.id
LEFT JOIN program_budgets pb ON pb.program_id = p.id AND pb.status = 'approved'
GROUP BY cp.id
ORDER BY cp.nama_project;
```

## 📞 ESCALATION POINTS

1. **Technical Issues**: Database team for SQL optimization
2. **Business Logic**: Product owner for mapping decisions  
3. **Data Quality**: Data team for validation and cleanup
4. **User Training**: Training team for new features