#!/usr/bin/env python3
"""Test Supabase query to understand relationship structure"""
import requests
import os
import json

def get_supabase_config():
    """Get Supabase configuration from .env.local"""
    env_path = '.env.local'
    if not os.path.exists(env_path):
        print(f"❌ {env_path} not found")
        return None
    
    env_vars = {}
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key] = value.strip().strip('"\'')
    
    supabase_url = env_vars.get('NEXT_PUBLIC_SUPABASE_URL')
    supabase_anon_key = env_vars.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_anon_key:
        print("❌ Missing Supabase URL or Anon Key")
        return None
    
    return {
        'url': supabase_url,
        'anon_key': supabase_anon_key
    }

def test_frontend_query_pattern():
    """Test the exact query pattern used in frontend"""
    print("=" * 60)
    print("🔍 TESTING FRONTEND QUERY PATTERN")
    print("=" * 60)
    
    config = get_supabase_config()
    if not config:
        return
    
    base_url = config['url']
    anon_key = config['anon_key']
    headers = {
        'apikey': anon_key,
        'Authorization': f'Bearer {anon_key}',
        'Content-Type': 'application/json'
    }
    
    # Test 1: Exact frontend query
    print("\n📋 TEST 1: Exact frontend query pattern")
    query = """
        *,
        verra_project_registrations (
            carbon_project_id
        ),
        vvb_organizations (
            organization_name
        )
    """
    
    endpoint = f"{base_url}/rest/v1/vvb_engagements?select={query}&limit=1"
    
    try:
        response = requests.get(endpoint, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! {len(data)} result(s)")
            print(f"Response keys: {list(data[0].keys()) if data else 'No data'}")
            
            if data and len(data) > 0:
                item = data[0]
                print(f"\n📊 First item structure:")
                for key in ['id', 'contract_number', 'verra_registration_id', 'project_id']:
                    if key in item:
                        print(f"  {key}: {item[key]}")
                
                if 'verra_project_registrations' in item:
                    verra_data = item['verra_project_registrations']
                    print(f"  verra_project_registrations: {len(verra_data)} item(s)")
                    if verra_data:
                        print(f"    First: {verra_data[0]}")
                else:
                    print("  verra_project_registrations: NOT IN RESPONSE")
                    
                if 'vvb_organizations' in item:
                    vvb_data = item['vvb_organizations']
                    print(f"  vvb_organizations: {len(vvb_data)} item(s)")
                    if vvb_data:
                        print(f"    First: {vvb_data[0]}")
                else:
                    print("  vvb_organizations: NOT IN RESPONSE")
        else:
            print(f"❌ Failed: {response.text[:200]}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 2: Alternative query pattern
    print("\n📋 TEST 2: Alternative query pattern (with !inner)")
    query2 = """
        *,
        verra_project_registrations!inner (
            carbon_project_id
        ),
        vvb_organizations!inner (
            organization_name
        )
    """
    
    endpoint2 = f"{base_url}/rest/v1/vvb_engagements?select={query2}&limit=1"
    
    try:
        response = requests.get(endpoint2, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! {len(data)} result(s)")
        else:
            print(f"❌ Failed: {response.text[:200]}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Simple query to check structure
    print("\n📋 TEST 3: Check database structure")
    
    # Check vvb_engagements columns
    try:
        endpoint3 = f"{base_url}/rest/v1/vvb_engagements?select=*&limit=0"
        response = requests.get(endpoint3, headers=headers, timeout=10)
        
        if response.status_code == 200:
            # Check content-range header for column info
            print(f"✅ vvb_engagements accessible")
            
            # Try to get one full record
            endpoint4 = f"{base_url}/rest/v1/vvb_engagements?select=*&limit=1"
            response4 = requests.get(endpoint4, headers=headers, timeout=10)
            
            if response4.status_code == 200:
                data = response4.json()
                if data:
                    item = data[0]
                    print(f"\n📊 vvb_engagements columns: {list(item.keys())}")
                    
                    # Check foreign keys
                    for key in ['verra_registration_id', 'project_id', 'vvb_id']:
                        if key in item:
                            print(f"  {key}: {item[key]}")
                    
    except Exception as e:
        print(f"❌ Error: {e}")

def test_direct_relationship():
    """Test relationship directly"""
    print("\n" + "=" * 60)
    print("🔗 TESTING DIRECT RELATIONSHIP")
    print("=" * 60)
    
    config = get_supabase_config()
    if not config:
        return
    
    base_url = config['url']
    anon_key = config['anon_key']
    headers = {
        'apikey': anon_key,
        'Authorization': f'Bearer {anon_key}',
        'Content-Type': 'application/json'
    }
    
    # Try to join via verra_registration_id
    print("\n📋 Testing via verra_registration_id...")
    
    # Get a vvb_engagement with verra_registration_id
    endpoint = f"{base_url}/rest/v1/vvb_engagements?select=id,verra_registration_id&verra_registration_id=not.is.null&limit=1"
    
    try:
        response = requests.get(endpoint, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                engagement = data[0]
                print(f"✅ Found engagement with verra_registration_id: {engagement['id']}")
                print(f"   verra_registration_id: {engagement['verra_registration_id']}")
                
                # Now get the verra registration
                verra_id = engagement['verra_registration_id']
                endpoint2 = f"{base_url}/rest/v1/verra_project_registrations?id=eq.{verra_id}&select=*"
                
                response2 = requests.get(endpoint2, headers=headers, timeout=10)
                if response2.status_code == 200:
                    verra_data = response2.json()
                    print(f"✅ Found verra registration: {len(verra_data)} record(s)")
                    if verra_data:
                        print(f"   Verra Project ID: {verra_data[0].get('verra_project_id')}")
                else:
                    print(f"❌ Cannot fetch verra registration: {response2.text[:100]}")
            else:
                print("ℹ️ No engagements with verra_registration_id")
        else:
            print(f"❌ Failed: {response.text[:100]}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    print("🚀 SUPABASE RELATIONSHIP DIAGNOSTICS")
    print("\nThis script tests the exact relationship queries to diagnose")
    print("the 'Could not find a relationship' error in frontend.")
    print("=" * 60)
    
    # Test frontend query pattern
    test_frontend_query_pattern()
    
    # Test direct relationship
    test_direct_relationship()
    
    print("\n" + "=" * 60)
    print("📋 DIAGNOSIS RESULTS")
    print("=" * 60)
    print("\nPossible issues:")
    print("1. Supabase schema cache not refreshed (wait 1-2 minutes)")
    print("2. Frontend query syntax issue")
    print("3. Relationship name mismatch")
    print("4. Permission/RLS issues")
    print("\n💡 Solutions:")
    print("• Wait for schema cache refresh")
    print("• Try different query pattern: verra_project_registrations!inner")
    print("• Check Supabase Dashboard for relationship names")
    print("• Clear browser cache and restart Next.js")

if __name__ == "__main__":
    main()