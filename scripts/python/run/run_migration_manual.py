#!/usr/bin/env python3
"""
Script untuk menjalankan migration investor dashboard secara manual dengan SQL sederhana.
Karena RPC function tidak tersedia, kita akan jalankan SQL inti saja.
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

def main():
    print("🔧 RUNNING MANUAL MIGRATION FOR INVESTOR DASHBOARD")
    print("=" * 60)
    
    # Initialize Supabase client
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ ERROR: Missing Supabase configuration in .env.local")
        sys.exit(1)
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        print(f"✅ Connected to Supabase: {supabase_url.split('//')[1].split('.')[0]}")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        sys.exit(1)
    
    # SQL statements to run (core migration only)
    sql_statements = [
        # 1. Add investor columns to carbon_projects
        """
        ALTER TABLE carbon_projects 
        ADD COLUMN IF NOT EXISTS investment_amount DECIMAL(20,2),
        ADD COLUMN IF NOT EXISTS roi_percentage DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS carbon_sequestration_estimated DECIMAL(15,2),
        ADD COLUMN IF NOT EXISTS project_period_years INTEGER DEFAULT 10,
        ADD COLUMN IF NOT EXISTS investor_notes TEXT,
        ADD COLUMN IF NOT EXISTS performance_rating VARCHAR(20),
        ADD COLUMN IF NOT EXISTS last_investor_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        """,
        
        # 2. Simple view for investor dashboard (without complex joins)
        """
        CREATE OR REPLACE VIEW v_investor_dashboard_simple AS
        SELECT 
            id,
            kode_project,
            nama_project,
            status,
            luas_total_ha,
            standar_karbon,
            metodologi,
            tanggal_mulai,
            tanggal_selesai,
            COALESCE(investment_amount, 0) as investment_amount,
            COALESCE(roi_percentage, 0) as roi_percentage,
            COALESCE(carbon_sequestration_estimated, 0) as carbon_sequestration_estimated,
            COALESCE(project_period_years, 10) as project_period_years,
            investor_notes,
            performance_rating,
            last_investor_update,
            created_at
        FROM carbon_projects
        WHERE status NOT IN ('archived', 'cancelled')
        ORDER BY created_at DESC;
        """,
        
        # 3. Update existing projects with investor data
        """
        DO $$
        DECLARE
            project_record RECORD;
            base_investment DECIMAL;
            base_roi DECIMAL;
            base_carbon DECIMAL;
        BEGIN
            FOR project_record IN SELECT id, luas_total_ha, status FROM carbon_projects WHERE status NOT IN ('archived', 'cancelled')
            LOOP
                -- Calculate realistic values based on project size and status
                base_investment := project_record.luas_total_ha * 5000000; -- 5 million per hectare
                base_roi := CASE 
                    WHEN project_record.status = 'active' THEN 18.0 -- 18% for active
                    WHEN project_record.status = 'approved' THEN 15.0 -- 15% for approved
                    ELSE 10.0 -- 10% for others
                END;
                base_carbon := project_record.luas_total_ha * 100 * 10; -- 100 tons per hectare per year × 10 years
                
                UPDATE carbon_projects
                SET 
                    investment_amount = base_investment,
                    roi_percentage = base_roi,
                    carbon_sequestration_estimated = base_carbon,
                    project_period_years = 10,
                    performance_rating = CASE 
                        WHEN base_roi > 20 THEN 'excellent'
                        WHEN base_roi > 15 THEN 'good'
                        WHEN base_roi > 10 THEN 'average'
                        ELSE 'poor'
                    END,
                    last_investor_update = NOW()
                WHERE id = project_record.id;
            END LOOP;
        END $$;
        """
    ]
    
    print("\n📋 MIGRATION STEPS:")
    print("1. Add investor columns to carbon_projects table")
    print("2. Create simple investor dashboard view")
    print("3. Update existing projects with investor data")
    
    response = input("\nDo you want to proceed with the migration? (yes/NO): ").strip().lower()
    
    if response != 'yes':
        print("❌ Migration cancelled by user.")
        print("\n📋 MANUAL MIGRATION INSTRUCTIONS:")
        print("Please run the migration manually via Supabase Dashboard:")
        print("1. Go to https://supabase.com/dashboard")
        print("2. Select your project")
        print("3. Open SQL Editor → New query")
        print("4. Copy-paste the SQL from:")
        print("   supabase/migrations/202602060943_fix_investor_dashboard_mock_data.sql")
        print("5. Click 'Run'")
        sys.exit(0)
    
    print("\n" + "=" * 60)
    print("🔄 EXECUTING MIGRATION...")
    
    # Note: We can't execute raw SQL via Supabase Python client directly
    # We need to use a different approach
    
    print("\n⚠️  DIRECT SQL EXECUTION NOT SUPPORTED VIA PYTHON CLIENT")
    print("\n📋 MANUAL EXECUTION REQUIRED:")
    print("Please run the following SQL statements in Supabase Dashboard:")
    
    for i, sql in enumerate(sql_statements, 1):
        print(f"\n{'='*60}")
        print(f"STEP {i}:")
        print(sql[:500] + "..." if len(sql) > 500 else sql)
    
    print("\n" + "=" * 60)
    print("📋 ALTERNATIVE SOLUTION:")
    print("Since we can't execute raw SQL via Python client, let's:")
    print("1. First create carbon projects WITHOUT investor columns")
    print("2. Then run migration manually in Supabase Dashboard")
    print("3. Then update projects with investor data")
    
    print("\n🎯 RECOMMENDED APPROACH:")
    print("1. Run: python create_carbon_projects_basic.py")
    print("2. Run migration manually in Supabase Dashboard")
    print("3. Run: python update_investor_data.py")
    
    # Create basic carbon projects script
    create_basic_script()

def create_basic_script():
    """Create a script to create carbon projects without investor columns"""
    basic_script = """#!/usr/bin/env python3
\"\"\"
Script untuk membuat 4 project karbon tanpa kolom investor.
Setelah migration dijalankan manual, gunakan update_investor_data.py
\"\"\"

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

# Carbon projects data (without investor columns)
CARBON_PROJECTS = [
    {
        "kode_project": "PRJ-GMS-2026",
        "nama_project": "Gunung Mas Forest Carbon Project",
        "kabupaten": "Gunung Mas",
        "luas_total_ha": 72800.99,
        "unit_ps": 35,
        "status": "active",
        "standar_karbon": "VCS",
        "metodologi": "VM0007",
        "tanggal_mulai": "2024-01-01",
        "tanggal_selesai": "2034-01-01",
        "deskripsi": "Project karbon berbasis konservasi hutan di Kabupaten Gunung Mas, mencakup 35 unit PS dengan total luas 72.800,99 Ha."
    },
    {
        "kode_project": "PRJ-KPS-2026", 
        "nama_project": "Kapuas Basin Carbon Initiative",
        "kabupaten": "Kapuas",
        "luas_total_ha": 56771.0,
        "unit_ps": 25,
        "status": "active",
        "standar_karbon": "VCS",
        "metodologi": "VM0007",
        "tanggal_mulai": "2024-02-01",
        "tanggal_selesai": "2034-02-01",
        "deskripsi": "Inisiatif karbon terintegrasi di DAS Kapuas, mencakup 25 unit PS dengan total luas 56.771 Ha."
    },
    {
        "kode_project": "PRJ-KTG-2026",
        "nama_project": "Katingan Tropical Carbon Program",
        "kabupaten": "Katingan",
        "luas_total_ha": 29239.0,
        "unit_ps": 15,
        "status": "active",
        "standar_karbon": "VCS",
        "metodologi": "VM0007",
        "tanggal_mulai": "2024-03-01",
        "tanggal_selesai": "2034-03-01",
        "deskripsi": "Program karbon hutan tropis di Kabupaten Katingan, mencakup 15 unit PS dengan total luas 29.239 Ha."
    },
    {
        "kode_project": "PRJ-PLP-2026",
        "nama_project": "Pulang Pisau Peatland Carbon Project",
        "kabupaten": "Pulang Pisau",
        "luas_total_ha": 27876.0,
        "unit_ps": 17,
        "status": "active",
        "standar_karbon": "VCS",
        "metodologi": "VM0007",
        "tanggal_mulai": "2024-04-01",
        "tanggal_selesai": "2034-04-01",
        "deskripsi": "Project karbon lahan gambut di Kabupaten Pulang Pisau, mencakup 17 unit PS dengan total luas 27.876 Ha."
    }
]

def main():
    print("🚀 CREATING 4 BASIC CARBON PROJECTS")
    print("=" * 60)
    
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ ERROR: Missing Supabase configuration")
        sys.exit(1)
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        print(f"✅ Connected to Supabase")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        sys.exit(1)
    
    # Check existing projects
    try:
        response = supabase.table("carbon_projects").select("id", count="exact").execute()
        existing_count = response.count if hasattr(response, 'count') else len(response.data)
        print(f"📊 Existing carbon projects: {existing_count}")
    except:
        existing_count = 0
    
    if existing_count >= 4:
        print("✅ Carbon projects already exist.")
        return
    
    print("\n📋 CREATING 4 CARBON PROJECTS:")
    print("-" * 60)
    
    created = 0
    for project in CARBON_PROJECTS:
        print(f"\\n🔹 {project['nama_project']}")
        print(f"   Kabupaten: {project['kabupaten']}")
        print(f"   Luas: {project['luas_total_ha']:,.2f} Ha ({project['unit_ps']} Unit PS)")
        
        try:
            response = supabase.table("carbon_projects").insert(project).execute()
            if response.data:
                created += 1
                print(f"   ✅ Created successfully!")
            else:
                print(f"   ❌ Failed to create")
        except Exception as e:
            print(f"   ❌ Error: {str(e)[:100]}")
    
    print(f"\\n📊 Created {created} out of 4 projects")
    print("\\n📋 NEXT STEPS:")
    print("1. Run migration manually in Supabase Dashboard")
    print("2. Then run: python update_investor_data.py")

if __name__ == "__main__":
    main()
"""
    
    script_path = "create_carbon_projects_basic.py"
    with open(script_path, 'w') as f:
        f.write(basic_script)
    
    print(f"\n✅ Created basic script: {script_path}")
    
    # Create update investor data script
    update_script = """#!/usr/bin/env python3
\"\"\"
Script untuk update data investor setelah migration dijalankan.
\"\"\"

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')

def calculate_investor_data(luas_ha):
    investment = luas_ha * 5000000  # Rp 5 juta per hektar
    roi = 18.0  # 18% ROI
    carbon_seq = luas_ha * 100 * 10  # 100 ton/ha/year × 10 years
    
    if roi >= 20:
        performance_rating = "excellent"
    elif roi >= 15:
        performance_rating = "good"
    elif roi >= 10:
        performance_rating = "average"
    else:
        performance_rating = "poor"
    
    return {
        "investment_amount": investment,
        "roi_percentage": roi,
        "carbon_sequestration_estimated": carbon_seq,
        "project_period_years": 10,
        "performance_rating": performance_rating,
        "investor_notes": f"Project berbasis {luas_ha:,.0f} Ha dengan estimasi ROI {roi}%"
    }

def main():
    print("🔄 UPDATING INVESTOR DATA FOR CARBON PROJECTS")
    print("=" * 60)
    
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ ERROR: Missing Supabase configuration")
        sys.exit(1)
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        print(f"✅ Connected to Supabase")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        sys.exit(1)
    
    # Get all carbon projects
    try:
        response = supabase.table("carbon_projects").select("*").execute()
        projects = response.data
        print(f"📊 Found {len(projects)} carbon projects")
    except Exception as e:
        print(f"❌ Failed to get projects: {e}")
        sys.exit(1)
    
    if not projects:
        print("❌ No carbon projects found")
        return
    
    print("\n📋 UPDATING PROJECTS:")
    print("-" * 60)
    
    updated = 0
    for project in projects:
        print(f"\\n🔹 {project.get('nama_project', 'Unknown')}")
        print(f"   ID: {project.get('id')}")
        print(f"   Luas: {project.get('luas_total_ha', 0):,.2f} Ha")
        
        luas = project.get('luas_total_ha', 0)
        if not luas:
            print("   ⚠️  Skipping: No luas data")
            continue
        
        investor_data = calculate_investor_data(luas)
        
        try:
            response = supabase.table("carbon_projects").update(investor_data).eq("id", project["id"]).execute()
            if response.data:
                updated += 1
                print(f"   ✅ Updated investor data")
                print(f"   💰 Investment: Rp {investor_data['investment_amount']:,.0f}")
                print(f"   📈 ROI: {investor_data['roi_percentage']}%")
                print(f"   🌳 Carbon: {investor_data['carbon_sequestration_estimated']:,.0f} tons")
            else:
                print(f"   ❌ Failed to update")
        except Exception as e:
            print(f"   ❌ Error: {str(e)[:100]}")
    
    print(f"\\n📊 Updated {updated} out of {len(projects)} projects")
    print("\\n✅ INVESTOR DATA UPDATE COMPLETE!")
    print("\\n📋 NEXT STEPS:")
    print("1. Check investor dashboard: http://localhost:3000/id/dashboard/investor")
    print("2. Verify data source shows 'database_views' or 'database_direct'")

if __name__ == "__main__":
    main()
"""
    
    update_path = "update_investor_data.py"
    with open(update_path, 'w') as f:
        f.write(update_script)
    
    print(f"✅ Created update script: {update_path}")
    
    print("\n📋 COMPLETE WORKFLOW:")
    print("1. python create_carbon_projects_basic.py")
    print("2. Run migration manually in Supabase Dashboard")
    print("3. python update_investor_data.py")
    print("4. python verify_investor_dashboard.py")

if __name__ == "__main__":
    main()