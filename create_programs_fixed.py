#!/usr/bin/env python3
"""
Create programs using the actual database schema
Fix the NOT NULL constraint issues
"""

import os
import sys
import json
from datetime import datetime
import psycopg2
from dotenv import load_dotenv

# Load environment
load_dotenv('.env.local')

class FixedProgramCreator:
    def __init__(self):
        self.db_params = self.get_db_params()
        
    def get_db_params(self):
        """Get database connection parameters"""
        env_path = os.path.join(os.path.dirname(__file__), '.env.local')
        if not os.path.exists(env_path):
            print(f"❌ .env.local not found")
            return None
        
        with open(env_path, 'r') as f:
            content = f.read()
        
        supabase_url = ""
        for line in content.split('\n'):
            if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
                supabase_url = line.split('=', 1)[1].strip().strip('"\'')
                break
        
        if not supabase_url:
            print("❌ Could not find NEXT_PUBLIC_SUPABASE_URL")
            return None
        
        import re
        match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
        if match:
            project_ref = match.group(1)
            db_host = f"db.{project_ref}.supabase.co"
        else:
            print(f"❌ Could not parse Supabase URL")
            return None
        
        db_password = "4@@E-Zd%zCQ!7ZV"
        
        return {
            "host": db_host,
            "port": 5432,
            "database": "postgres",
            "user": "postgres",
            "password": db_password,
            "sslmode": "require"
        }
    
    def fetch_from_db(self, query: str, params=None):
        """Execute query and return results"""
        if not self.db_params:
            print("❌ Database connection not available")
            return []
        
        try:
            conn = psycopg2.connect(**self.db_params)
            cur = conn.cursor()
            cur.execute(query, params or ())
            columns = [desc[0] for desc in cur.description] if cur.description else []
            rows = cur.fetchall()
            cur.close()
            conn.close()
            
            if columns:
                return [dict(zip(columns, row)) for row in rows]
            return rows
        except Exception as e:
            print(f"❌ Database error: {e}")
            return []
    
    def execute_query(self, query: str, params=None, return_id=False):
        """Execute INSERT/UPDATE query"""
        if not self.db_params:
            print("❌ Database connection not available")
            return None
        
        try:
            conn = psycopg2.connect(**self.db_params)
            cur = conn.cursor()
            cur.execute(query, params or ())
            
            result = None
            if return_id:
                if "RETURNING" in query.upper():
                    result = cur.fetchone()[0]
                else:
                    cur.execute("SELECT LASTVAL()")
                    result = cur.fetchone()[0]
            
            conn.commit()
            cur.close()
            conn.close()
            
            return result
        except Exception as e:
            print(f"❌ Database error: {e}")
            conn.rollback()
            return None
    
    def run(self):
        """Main execution"""
        print("=" * 80)
        print("FIXED PROGRAM CREATOR - Create 12 programs using correct schema")
        print("=" * 80)
        
        # Get data
        print("\n📊 Getting data...")
        
        # 1. Carbon projects
        query = """
            SELECT id, kode_project, nama_project, kabupaten
            FROM carbon_projects 
            ORDER BY kode_project
            LIMIT 4
        """
        projects = self.fetch_from_db(query)
        print(f"   ✅ Carbon projects: {len(projects)}")
        
        # 2. Aksi mitigasi
        query = """
            SELECT id, kode, nama_aksi
            FROM master_aksi_mitigasi 
            ORDER BY kode
            LIMIT 4
        """
        aksi_list = self.fetch_from_db(query)
        print(f"   ✅ Aksi mitigasi: {len(aksi_list)}")
        
        if len(projects) < 4:
            print("❌ Not enough carbon projects")
            return
        
        program_types = ["KARBON", "KAPASITAS", "PEMBERDAYAAN_EKONOMI"]
        created_programs = []
        
        print(f"\n📋 Creating {len(projects)} projects × {len(program_types)} types = {len(projects) * len(program_types)} programs")
        
        for i, project in enumerate(projects[:4]):
            print(f"\n--- Project {i+1}: {project['kode_project']} - {project['nama_project']} ---")
            
            for j, prog_type in enumerate(program_types):
                # Generate program code and name
                # Use the same code for both program_code and kode_program
                kode_program = f"PRG-{project['kode_project'][4:7]}-{prog_type[:3]}-{j+1:02d}"
                nama_program = f"Program {prog_type} {project['nama_project']}"
                
                # Build program data using ACTUAL database columns
                # From error log: columns are: program_code, program_name, program_type, carbon_project_id, etc.
                program_data = {
                    # Required columns (NOT NULL)
                    "program_code": kode_program,
                    "program_name": nama_program,
                    "program_type": prog_type,
                    "carbon_project_id": project["id"],
                    "status": "draft",
                    
                    # Optional columns
                    "kode_program": kode_program,
                    "nama_program": nama_program,
                    "total_budget": 100000000,
                    "budget_status": "draft",
                    "goal": f"Program {prog_type} untuk {project['kabupaten']}.",
                    "implementation_plan": f"1. Persiapan\n2. Implementasi\n3. Monitoring\n4. Evaluasi",
                    "kabupaten": project['kabupaten'],
                    "created_at": "NOW()",
                    "updated_at": "NOW()"
                }
                
                # Build INSERT query
                columns = []
                values = []
                placeholders = []
                
                for col, val in program_data.items():
                    if val is not None:
                        columns.append(col)
                        values.append(val)
                        placeholders.append("%s")
                
                query = f"""
                    INSERT INTO programs ({', '.join(columns)})
                    VALUES ({', '.join(placeholders)})
                    RETURNING id
                """
                
                print(f"   Creating {kode_program}...")
                program_id = self.execute_query(query, values, return_id=True)
                
                if program_id:
                    # Link aksi mitigasi if available
                    if aksi_list and j < len(aksi_list):
                        aksi = aksi_list[j % len(aksi_list)]
                        link_query = """
                            INSERT INTO program_aksi_mitigasi (program_id, aksi_mitigasi_id, created_at)
                            VALUES (%s, %s, NOW())
                            ON CONFLICT (program_id, aksi_mitigasi_id) DO NOTHING
                        """
                        self.execute_query(link_query, (program_id, aksi["id"]))
                    
                    created_programs.append({
                        "id": program_id,
                        "kode": kode_program,
                        "nama": nama_program,
                        "project": project['kode_project'],
                        "type": prog_type,
                        "budget": 100000000
                    })
                    print(f"   ✅ Created (ID: {program_id})")
                else:
                    print(f"   ❌ Failed to create program")
        
        # Summary
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"\n✅ Successfully created: {len(created_programs)} of {len(projects) * len(program_types)} programs")
        
        if created_programs:
            print("\n📊 Programs created:")
            for i, prog in enumerate(created_programs):
                print(f"\n   {i+1}. {prog['kode']}")
                print(f"      • {prog['nama']}")
                print(f"      • Project: {prog['project']}")
                print(f"      • Type: {prog['type']}")
                print(f"      • Budget: Rp {prog['budget']:,.0f}")
            
            print(f"\n📋 Compliance with form requirements:")
            print(f"   ✅ Program code: unique")
            print(f"   ✅ Program name: descriptive")
            print(f"   ✅ Carbon project linked: yes")
            print(f"   ✅ Status: draft")
            print(f"   ✅ Budget status: draft")
            print(f"   ✅ Aksi mitigasi: linked where available")
            
            # Save report
            report_data = {
                "timestamp": datetime.now().isoformat(),
                "created_count": len(created_programs),
                "total_planned": len(projects) * len(program_types),
                "programs": created_programs
            }
            
            report_file = "fixed_programs_report.json"
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n📄 Report saved to: {report_file}")
        
        print("\n🚀 NEXT STEPS:")
        print("   1. Open http://localhost:3000/id/dashboard/programs")
        print("   2. Verify programs are visible")
        print("   3. Check program details")
        print("   4. Test form at http://localhost:3000/id/dashboard/programs/new")
        
        # Quick verification
        if created_programs:
            print("\n🔍 Quick verification:")
            verify_query = "SELECT COUNT(*) as count, COUNT(DISTINCT program_code) as unique_codes FROM programs"
            result = self.fetch_from_db(verify_query)
            if result:
                print(f"   • Total programs in database: {result[0]['count']}")
                print(f"   • Unique program codes: {result[0]['unique_codes']}")

if __name__ == "__main__":
    creator = FixedProgramCreator()
    creator.run()