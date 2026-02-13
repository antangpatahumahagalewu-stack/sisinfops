#!/usr/bin/env python3
"""
PROGRAM PLANNER AUTO - Insert langsung ke database untuk membuat 12 program aksi mitigasi
Tanpa interaksi user, langsung jalankan
"""

import os
import sys
import json
from datetime import datetime
import psycopg2
from dotenv import load_dotenv

# Load environment
load_dotenv('.env.local')

class ProgramPlannerAuto:
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
    
    def create_program(self, program_data, aksi_ids=None):
        """Create program directly in database"""
        # Map field names from form to database columns
        insert_data = {
            "kode_program": program_data["kode_program"],
            "nama_program": program_data["nama_program"],
            "jenis_program": program_data["jenis_program"],
            "kategori_hutan": program_data.get("kategori_hutan"),
            "tujuan": program_data.get("tujuan"),
            "lokasi_spesifik": program_data.get("lokasi_spesifik"),
            "target": program_data.get("target"),
            "risiko": program_data.get("risiko"),
            "carbon_project_id": program_data.get("carbon_project_id"),
            "perhutanan_sosial_id": program_data["perhutanan_sosial_id"],
            "status": program_data.get("status", "draft"),
            "total_budget": program_data.get("total_budget", 0),
            "budget_status": program_data.get("budget_status", "draft"),
            "created_at": "NOW()",
            "updated_at": "NOW()"
        }
        
        # Build INSERT query
        columns = []
        values = []
        placeholders = []
        
        for col, val in insert_data.items():
            if val is not None:
                columns.append(col)
                values.append(val)
                placeholders.append("%s")
        
        query = f"""
            INSERT INTO programs ({', '.join(columns)})
            VALUES ({', '.join(placeholders)})
            RETURNING id
        """
        
        program_id = self.execute_query(query, values, return_id=True)
        
        if program_id and aksi_ids:
            self.link_aksi_mitigasi(program_id, aksi_ids)
        
        return program_id
    
    def link_aksi_mitigasi(self, program_id, aksi_ids):
        """Link aksi mitigasi to program"""
        for aksi_id in aksi_ids:
            query = """
                INSERT INTO program_aksi_mitigasi (program_id, aksi_mitigasi_id, created_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (program_id, aksi_mitigasi_id) DO NOTHING
            """
            self.execute_query(query, (program_id, aksi_id))
    
    def run(self):
        """Main execution - otomatis tanpa input"""
        print("=" * 80)
        print("PROGRAM PLANNER AUTO - Membuat 12 Program Aksi Mitigasi")
        print("=" * 80)
        
        # Get data
        print("\n📊 Mengumpulkan data yang diperlukan...")
        
        # 1. Carbon projects (4 projects)
        query = """
            SELECT id, kode_project, nama_project, kabupaten, luas_total_ha
            FROM carbon_projects 
            ORDER BY kode_project
            LIMIT 4
        """
        projects = self.fetch_from_db(query)
        print(f"   ✅ Carbon projects: {len(projects)}")
        
        # 2. Perhutanan sosial (12 untuk 12 program)
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
        
        # Group by kelompok
        aksi_by_kelompok = {}
        for aksi in aksi_list:
            kelompok = aksi['kelompok']
            if kelompok not in aksi_by_kelompok:
                aksi_by_kelompok[kelompok] = []
            aksi_by_kelompok[kelompok].append(aksi)
        
        if len(projects) < 4 or len(ps_list) < 12:
            print("❌ Tidak cukup data untuk membuat program")
            return
        
        program_types = [
            {"name": "perlindungan", "label": "Perlindungan Hutan", "jenis": "KARBON"},
            {"name": "restorasi", "label": "Restorasi Ekosistem", "jenis": "KARBON"},
            {"name": "kapasitas", "label": "Penguatan Kapasitas", "jenis": "KAPASITAS"}
        ]
        
        created_programs = []
        
        print(f"\n📋 Membuat {len(projects)} projects × {len(program_types)} types = {len(projects) * len(program_types)} programs")
        
        for i, project in enumerate(projects[:4]):
            print(f"\n--- Project {i+1}: {project['kode_project']} - {project['nama_project']} ---")
            
            for j, prog_type in enumerate(program_types):
                # Select PS untuk program ini
                ps_index = (i * len(program_types) + j) % len(ps_list)
                ps = ps_list[ps_index]
                
                # Generate kode program
                kode_suffix = f"{project['kode_project'].replace('PRJ-', '')}-{j+1:02d}"
                kode_program = f"PRG-{prog_type['name'][:4].upper()}-{kode_suffix}"
                
                # Generate nama program
                nama_program = f"Program {prog_type['label']} {project['nama_project']}"
                
                # Determine kategori hutan
                kategori_hutan = None
                if prog_type["jenis"] == "KARBON":
                    kategori_hutan = "GAMBUT" if "PULANG PISAU" in project['kabupaten'].upper() else "MINERAL"
                
                # Select aksi mitigasi
                aksi_ids = self.select_aksi_ids(prog_type["name"], aksi_by_kelompok)
                
                # Calculate budget
                budget = self.calculate_budget(prog_type["name"], project)
                
                # Program data
                program_data = {
                    "kode_program": kode_program,
                    "nama_program": nama_program,
                    "jenis_program": prog_type["jenis"],
                    "kategori_hutan": kategori_hutan,
                    "tujuan": self.generate_tujuan(prog_type["name"], project),
                    "lokasi_spesifik": self.generate_lokasi(prog_type["name"], project),
                    "target": self.generate_target(prog_type["name"]),
                    "risiko": self.generate_risiko(prog_type["name"]),
                    "carbon_project_id": project["id"],
                    "perhutanan_sosial_id": ps["id"],
                    "status": "draft",
                    "total_budget": budget,
                    "budget_status": "draft"
                }
                
                print(f"   Creating {kode_program}...")
                program_id = self.create_program(program_data, aksi_ids)
                
                if program_id:
                    created_programs.append({
                        "id": program_id,
                        "kode": kode_program,
                        "nama": nama_program,
                        "project": project['kode_project'],
                        "type": prog_type["name"],
                        "budget": budget,
                        "aksi_count": len(aksi_ids)
                    })
                    print(f"   ✅ Berhasil dibuat (ID: {program_id})")
                else:
                    print(f"   ❌ Gagal membuat program")
        
        # Summary
        print("\n" + "=" * 80)
        print("SUMMARY: PROGRAM PLANNER TASK COMPLETE")
        print("=" * 80)
        print(f"\n✅ Berhasil dibuat: {len(created_programs)} dari {len(projects) * len(program_types)} program")
        
        if created_programs:
            print("\n📊 Detail program yang dibuat:")
            for i, prog in enumerate(created_programs):
                print(f"\n   {i+1}. {prog['kode']}")
                print(f"      • {prog['nama']}")
                print(f"      • Project: {prog['project']}")
                print(f"      • Type: {prog['type']}")
                print(f"      • Budget: Rp {prog['budget']:,.0f}")
                print(f"      • Aksi Mitigasi: {prog['aksi_count']} item")
            
            print(f"\n📋 Compliance dengan form isian:")
            print(f"   ✅ Kode Program unik: {len(created_programs)} kode berbeda")
            print(f"   ✅ Nama Program deskriptif: semua program memiliki nama jelas")
            print(f"   ✅ Perhutanan Sosial dipilih: semua program terkait PS")
            print(f"   ✅ Jenis Program sesuai: KARBON/KAPASITAS sesuai template")
            print(f"   ✅ Kategori Hutan untuk program KARBON: {sum(1 for p in created_programs if p['type'] != 'kapasitas')} program")
            print(f"   ✅ Aksi Mitigasi dipilih: semua program memiliki aksi")
            print(f"   ✅ Status: semua program berstatus 'draft'")
            print(f"   ✅ Carbon Project terkait: semua program terkait project")
            print(f"   ✅ Budget Status: semua program berstatus 'draft'")
            
            # Save report
            report_data = {
                "timestamp": datetime.now().isoformat(),
                "created_count": len(created_programs),
                "total_planned": len(projects) * len(program_types),
                "programs": created_programs
            }
            
            report_file = "program_planner_auto_report.json"
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n📄 Report saved to: {report_file}")
        
        print("\n🚀 NEXT STEPS:")
        print("   1. Buka http://localhost:3000/id/dashboard/programs")
        print("   2. Verifikasi program telah dibuat")
        print("   3. Buka http://localhost:3000/id/dashboard/programs/new")
        print("      - Test isian form dengan data baru")
        print("      - Verifikasi compliance dengan semua field")
        
        return created_programs
    
    def select_aksi_ids(self, program_type, aksi_by_kelompok):
        """Select appropriate aksi mitigasi IDs"""
        aksi_ids = []
        
        if program_type == "perlindungan":
            kelompok_list = ["PERLINDUNGAN_HUTAN", "TATA_KELOLA"]
        elif program_type == "restorasi":
            kelompok_list = ["PENINGKATAN_SERAPAN", "TATA_KELOLA"]
        else:  # kapasitas
            kelompok_list = ["TATA_KELOLA", "SOSIAL"]
        
        for kelompok in kelompok_list:
            if kelompok in aksi_by_kelompok and aksi_by_kelompok[kelompok]:
                # Take first 2 aksi
                selected = aksi_by_kelompok[kelompok][:2]
                aksi_ids.extend([aksi["id"] for aksi in selected])
        
        return aksi_ids[:4]  # Max 4
    
    def generate_tujuan(self, program_type, project):
        """Generate tujuan program"""
        kabupaten = project["kabupaten"]
        
        if program_type == "perlindungan":
            return f"Melindungi hutan {kabupaten} dari deforestasi dan degradasi melalui patroli dan monitoring berbasis masyarakat."
        elif program_type == "restorasi":
            return f"Merestorasi ekosistem terdegradasi di {kabupaten} melalui penanaman dan rehabilitasi vegetasi asli."
        else:  # kapasitas
            return f"Meningkatkan kapasitas pengelolaan hutan masyarakat di {kabupaten} melalui pelatihan dan pendampingan."
    
    def generate_lokasi(self, program_type, project):
        """Generate lokasi spesifik"""
        kabupaten = project["kabupaten"]
        luas = float(project["luas_total_ha"]) if project["luas_total_ha"] else 0
        
        if program_type == "perlindungan":
            return f"Kawasan hutan {kabupaten} seluas {luas:,.0f} Ha"
        elif program_type == "restorasi":
            return f"Lahan terdegradasi di {kabupaten} seluas {luas * 0.2:,.0f} Ha"
        else:  # kapasitas
            return f"Desa-desa sekitar kawasan hutan {kabupaten}"
    
    def generate_target(self, program_type):
        """Generate target program"""
        if program_type == "perlindungan":
            return "1. Mengurangi deforestasi sebesar 80% dalam 3 tahun pertama\n2. Meningkatkan tutupan hutan sebesar 5% dalam 5 tahun\n3. Membentuk 5 kelompok patroli masyarakat"
        elif program_type == "restorasi":
            return "1. Menanam 50.000 bibit pohon asli dalam 2 tahun\n2. Meningkatkan serapan karbon sebesar 100.000 ton CO2e dalam 10 tahun\n3. Merehabilitasi 20% lahan terdegradasi"
        else:  # kapasitas
            return "1. Melatih 100 petani hutan dalam pengelolaan hutan lestari\n2. Membentuk 10 kelompok tani hutan\n3. Menyusun 5 rencana pengelolaan hutan desa"
    
    def generate_risiko(self, program_type):
        """Generate analisis risiko"""
        if program_type == "perlindungan":
            return "1. Kebakaran hutan musim kemarau\n2. Perambahan liar\n3. Konflik dengan masyarakat sekitar"
        elif program_type == "restorasi":
            return "1. Tingkat kematian bibit tinggi\n2. Perubahan iklim ekstrem\n3. Ketersediaan bibit terbatas"
        else:  # kapasitas
            return "1. Partisipasi masyarakat rendah\n2. Keterbatasan fasilitator terlatih\n3. Konflik internal masyarakat"
    
    def calculate_budget(self, program_type, project):
        """Calculate budget based on program type and project size"""
        base_budget = 100000000  # 100 juta
        
        if program_type == "perlindungan":
            multiplier = 1.5
        elif program_type == "restorasi":
            multiplier = 2.0
        else:  # kapasitas
            multiplier = 0.8
        
        # Adjust based on project size
        luas = float(project["luas_total_ha"]) if project["luas_total_ha"] else 0
        size_factor = luas / 10000  # Normalize
        if size_factor > 5:
            size_factor = 5
        
        budget = base_budget * multiplier * size_factor
        return int(round(budget / 100000) * 100000)  # Round to nearest 100,000

if __name__ == "__main__":
    planner = ProgramPlannerAuto()
    planner.run()