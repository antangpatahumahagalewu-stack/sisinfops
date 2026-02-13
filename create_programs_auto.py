#!/usr/bin/env python3
"""
Script otomatis untuk membuat program untuk carbon projects tanpa interaksi user
"""
import os
import sys
import json
import requests
from datetime import datetime
import psycopg2
from dotenv import load_dotenv
import time

# Load environment
load_dotenv('.env.local')

class AutoProgramCreator:
    def __init__(self):
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
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
    
    def get_basic_data(self):
        """Get basic data needed for programs"""
        print("📊 Mengambil data dasar...")
        
        # 1. Carbon projects
        query = """
            SELECT id, kode_project, nama_project, kabupaten, luas_total_ha
            FROM carbon_projects 
            ORDER BY kode_project
            LIMIT 4
        """
        projects = self.fetch_from_db(query)
        print(f"   ✅ Carbon projects: {len(projects)}")
        
        # 2. Perhutanan sosial
        query = """
            SELECT id, pemegang_izin, desa, kecamatan, luas_ha
            FROM perhutanan_sosial 
            WHERE pemegang_izin IS NOT NULL
            ORDER BY pemegang_izin
            LIMIT 12
        """
        ps_list = self.fetch_from_db(query)
        print(f"   ✅ Perhutanan sosial: {len(ps_list)}")
        
        # 3. Aksi mitigasi
        query = """
            SELECT id, kode, nama_aksi, kelompok
            FROM master_aksi_mitigasi 
            ORDER BY kode
        """
        aksi_list = self.fetch_from_db(query)
        print(f"   ✅ Aksi mitigasi: {len(aksi_list)}")
        
        # 4. Price list
        query = """
            SELECT id, item_code, item_name, unit, unit_price, category
            FROM price_list 
            WHERE is_active = true
            ORDER BY category, item_name
            LIMIT 20
        """
        price_items = self.fetch_from_db(query)
        print(f"   ✅ Price list items: {len(price_items)}")
        
        return {
            "projects": projects,
            "ps_list": ps_list,
            "aksi_list": aksi_list,
            "price_items": price_items
        }
    
    def create_simple_program(self, project, ps, program_type, program_num):
        """Create a simple program"""
        kode_project = project['kode_project']
        nama_project = project['nama_project']
        kabupaten = project['kabupaten']
        
        # Determine program type details
        if program_type == "perlindungan":
            kode = f"PRG-PROT-{kode_project}-{program_num:02d}"
            nama = f"Program Perlindungan Hutan {nama_project}"
            jenis = "KARBON"
            kategori = "GAMBUT" if "PULANG PISAU" in kabupaten.upper() else "MINERAL"
        elif program_type == "restorasi":
            kode = f"PRG-REST-{kode_project}-{program_num:02d}"
            nama = f"Program Restorasi Ekosistem {nama_project}"
            jenis = "KARBON"
            kategori = "GAMBUT" if "PULANG PISAU" in kabupaten.upper() else "MINERAL"
        else:  # kapasitas
            kode = f"PRG-CAPA-{kode_project}-{program_num:02d}"
            nama = f"Program Penguatan Kapasitas {nama_project}"
            jenis = "KAPASITAS"
            kategori = None
        
        program_data = {
            "kode_program": kode,
            "nama_program": nama,
            "jenis_program": jenis,
            "kategori_hutan": kategori,
            "tujuan": f"Program {program_type} untuk {kabupaten}",
            "lokasi_spesifik": f"Lokasi di {kabupaten}",
            "target": "Target program",
            "risiko": "Risiko program",
            "carbon_project_id": project['id'],
            "perhutanan_sosial_id": ps['id'],
            "status": "draft",
            "total_budget": 100000000,
            "budget_status": "draft",
            "budget_notes": "Catatan anggaran"
        }
        
        return program_data
    
    def create_program_via_api(self, program_data):
        """Create program via API"""
        if not self.supabase_url or not self.supabase_key:
            print("❌ Supabase credentials missing")
            return None
        
        url = f"{self.supabase_url}/rest/v1/programs"
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        try:
            response = requests.post(url, headers=headers, json=program_data)
            if response.status_code in [200, 201]:
                result = response.json()
                program_id = result[0]['id'] if isinstance(result, list) else result.get('id')
                print(f"   ✅ Program '{program_data.get('nama_program')}' created")
                return program_id
            else:
                print(f"❌ Failed to create program: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ API error: {e}")
            return None
    
    def run(self):
        """Main execution"""
        print("=" * 80)
        print("AUTO PROGRAM CREATOR")
        print("=" * 80)
        
        # Get data
        data = self.get_basic_data()
        
        if len(data['projects']) < 4 or len(data['ps_list']) < 4:
            print("❌ Tidak cukup data untuk membuat program")
            return
        
        # Create programs
        program_types = ["perlindungan", "restorasi", "kapasitas"]
        created_programs = []
        
        print(f"\n📋 Membuat {len(data['projects'])} projects × {len(program_types)} types = {len(data['projects']) * len(program_types)} programs")
        
        for i, project in enumerate(data['projects'][:4]):  # Max 4 projects
            print(f"\n--- Project {i+1}: {project['kode_project']} ---")
            
            for j, prog_type in enumerate(program_types):
                # Select PS (round robin)
                ps_index = (i * len(program_types) + j) % len(data['ps_list'])
                ps = data['ps_list'][ps_index]
                
                # Create program
                program_data = self.create_simple_program(project, ps, prog_type, j+1)
                
                print(f"   Creating {program_data['kode_program']}...")
                program_id = self.create_program_via_api(program_data)
                
                if program_id:
                    created_programs.append({
                        "id": program_id,
                        "kode": program_data['kode_program'],
                        "nama": program_data['nama_program'],
                        "project": project['kode_project'],
                        "type": prog_type
                    })
                
                # Small delay
                time.sleep(0.3)
        
        # Summary
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"\n✅ Berhasil dibuat: {len(created_programs)} program")
        
        if created_programs:
            print("\n📊 Program yang dibuat:")
            for prog in created_programs:
                print(f"   • {prog['kode']}: {prog['nama']}")
            
            # Save report
            report_data = {
                "timestamp": datetime.now().isoformat(),
                "created_count": len(created_programs),
                "programs": created_programs
            }
            
            report_file = "auto_program_report.json"
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n📄 Report saved to: {report_file}")
        
        print("\n🚀 NEXT STEPS:")
        print("   1. Buka http://localhost:3000/id/dashboard/programs")
        print("   2. Verifikasi program telah dibuat")
        print("   3. Buka http://localhost:3000/id/dashboard/programs/new untuk test form")

if __name__ == "__main__":
    creator = AutoProgramCreator()
    creator.run()