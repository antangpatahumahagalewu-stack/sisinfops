#!/usr/bin/env python3
"""
Test mapping logic between carbon_projects.kabupaten and kabupaten.nama
"""
import json

# Simulate data from API (kabupaten data)
all_kabupaten = [
    {"id": "1", "nama": "Kabupaten Gunung Mas", "luas_total_ha": 72800.99, "has_carbon_project": True},
    {"id": "2", "nama": "Kabupaten Kapuas", "luas_total_ha": 56771.00, "has_carbon_project": True},
    {"id": "3", "nama": "Kabupaten Katingan", "luas_total_ha": 29239.00, "has_carbon_project": True},
    {"id": "4", "nama": "Kabupaten Pulang Pisau", "luas_total_ha": 27876.00, "has_carbon_project": True},
    {"id": "5", "nama": "Kotamadya Palangka Raya", "luas_total_ha": 3046.00, "has_carbon_project": False}
]

# Simulate data from carbon_projects table
carbon_projects = [
    {"id": "a", "nama_project": "Gunung Mas Forest Carbon Project", "kabupaten": "Gunung Mas", "kode_project": "PRJ-GMS-2026"},
    {"id": "b", "nama_project": "Pulang Pisau Peatland Carbon Project", "kabupaten": "Pulang Pisau", "kode_project": "PRJ-PLP-2026"},
    {"id": "c", "nama_project": "Kapuas Basin Carbon Initiative", "kabupaten": "Kapuas", "kode_project": "PRJ-KPS-2026"},
    {"id": "d", "nama_project": "Katingan Tropical Carbon Program", "kabupaten": "Katingan", "kode_project": "PRJ-KTG-2026"}
]

def normalize_kabupaten_name(name: str) -> str:
    if not name:
        return ''
    return name \
        .replace('Kabupaten ', '') \
        .replace('Kotamadya ', '') \
        .replace('Kotamdya ', '') \
        .replace('Kota ', '') \
        .strip() \
        .lower()

def test_mapping():
    print("🔍 Testing kabupaten mapping logic")
    print("-" * 60)
    
    # Create map of normalized kabupaten names to kabupaten data
    kabupaten_map = {}
    for kab in all_kabupaten:
        normalized = normalize_kabupaten_name(kab["nama"])
        kabupaten_map[normalized] = kab
        # Also add without "kabupaten" prefix for matching
        simple_name = kab["nama"].replace('Kabupaten ', '').replace('Kotamadya ', '').strip()
        kabupaten_map[simple_name.lower()] = kab
    
    print(f"Kabupaten map keys: {list(kabupaten_map.keys())}")
    print()
    
    results = []
    
    for project in carbon_projects:
        print(f"\nProcessing project: {project['nama_project']}")
        print(f"  kabupaten from DB: {project['kabupaten']}")
        
        kabupaten_nama = None
        kabupaten_luas = None
        
        if project['kabupaten']:
            clean_project_kabupaten = project['kabupaten'].strip()
            normalized_project_kab = normalize_kabupaten_name(clean_project_kabupaten)
            
            print(f"  normalized: '{normalized_project_kab}'")
            
            # Try exact match first
            matched_kab = kabupaten_map.get(normalized_project_kab)
            
            if matched_kab:
                kabupaten_nama = matched_kab["nama"]
                kabupaten_luas = matched_kab["luas_total_ha"]
                print(f"  ✓ Exact match: {clean_project_kabupaten} -> {matched_kab['nama']} ({matched_kab['luas_total_ha']} ha)")
            else:
                # Try partial match
                for normalized_key, kab_data in kabupaten_map.items():
                    if normalized_key in normalized_project_kab or normalized_project_kab in normalized_key:
                        kabupaten_nama = kab_data["nama"]
                        kabupaten_luas = kab_data["luas_total_ha"]
                        print(f"  ✓ Partial match: {clean_project_kabupaten} -> {kab_data['nama']}")
                        break
        
        # If still no match, try to extract from project name
        if not kabupaten_nama:
            name = project["nama_project"] or ""
            desc = ""
            search_text = (name + " " + desc).lower()
            
            possible_matches = [
                {"search": "gunung mas", "kabupaten_name": "Kabupaten Gunung Mas"},
                {"search": "pulang pisau", "kabupaten_name": "Kabupaten Pulang Pisau"},
                {"search": "kapuas", "kabupaten_name": "Kabupaten Kapuas"},
                {"search": "katingan", "kabupaten_name": "Kabupaten Katingan"},
                {"search": "kotawaringin", "kabupaten_name": "Kabupaten Kotawaringin Timur"}
            ]
            
            for match in possible_matches:
                if match["search"] in search_text:
                    found_kab = next((k for k in all_kabupaten if k["nama"] == match["kabupaten_name"]), None)
                    if found_kab:
                        kabupaten_nama = found_kab["nama"]
                        kabupaten_luas = found_kab["luas_total_ha"]
                        print(f"  ✓ Extracted from project name: {match['search']} -> {found_kab['nama']}")
                        break
        
        if not kabupaten_nama:
            print(f"  ✗ No kabupaten match found")
        
        results.append({
            "project": project["nama_project"],
            "kabupaten_from_db": project["kabupaten"],
            "matched_kabupaten": kabupaten_nama,
            "luas": kabupaten_luas
        })
    
    print("\n" + "=" * 60)
    print("📊 MAPPING RESULTS")
    print("=" * 60)
    
    success_count = 0
    for result in results:
        if result["matched_kabupaten"]:
            success_count += 1
            print(f"✅ {result['project']}")
            print(f"   DB kabupaten: {result['kabupaten_from_db']}")
            print(f"   Matched to: {result['matched_kabupaten']}")
            print(f"   Luas: {result['luas']:,.2f} ha")
        else:
            print(f"❌ {result['project']}")
            print(f"   DB kabupaten: {result['kabupaten_from_db']}")
            print(f"   No match found")
        print()
    
    print(f"Success rate: {success_count}/{len(results)} ({success_count/len(results)*100:.0f}%)")
    
    return success_count == len(results)

if __name__ == "__main__":
    success = test_mapping()
    if success:
        print("\n🎉 All mappings successful!")
    else:
        print("\n⚠️ Some mappings failed!")
    exit(0 if success else 1)