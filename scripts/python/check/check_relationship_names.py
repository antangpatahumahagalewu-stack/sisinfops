#!/usr/bin/env python3
"""Check exact relationship names in Supabase"""
import requests
import os

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

def main():
    print("🔍 CHECKING SUPABASE RELATIONSHIP NAMES")
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
    
    # Test different relationship name patterns
    print("\n📋 Testing different relationship queries...")
    
    patterns = [
        'verra_project_registrations',  # Plural (what frontend uses)
        'verra_project_registration',   # Singular
        'verra_registration',           # Based on column name
        'verra_registrations',          # Plural of column name
        'verra_project_registrations!inner',  # With join type
        'verra_project_registrations(*)',     # With wildcard
    ]
    
    for pattern in patterns:
        endpoint = f"{base_url}/rest/v1/vvb_engagements?select=*,{pattern}(*)&limit=1"
        print(f"\n🔍 Testing: {pattern}")
        print(f"   URL: {endpoint.split('?')[0]}")
        
        try:
            response = requests.get(endpoint, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Success: {len(data)} result(s)")
                if data:
                    keys = list(data[0].keys())
                    print(f"   Keys: {keys}")
                    if pattern.replace('(*)', '').replace('!inner', '') in str(keys):
                        print(f"   ✅ Relationship '{pattern}' found!")
                    else:
                        print(f"   ❌ Relationship '{pattern}' not in response")
            else:
                print(f"❌ Failed: {response.status_code}")
                print(f"   Error: {response.text[:100]}")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    # Test what Supabase actually returns for schema
    print("\n" + "=" * 60)
    print("📊 CHECKING SUPABASE SCHEMA METADATA")
    print("=" * 60)
    
    # Try to get table schema info
    try:
        # Get a single record with all relationships
        endpoint = f"{base_url}/rest/v1/vvb_engagements?select=*&limit=1"
        response = requests.get(endpoint, headers=headers, timeout=10)
        if response.status_code == 200:
            print("✅ Basic vvb_engagements query works")
        
        # Try to get with vvb_organizations (we know this works)
        endpoint = f"{base_url}/rest/v1/vvb_engagements?select=*,vvb_organizations(*)&limit=1"
        response = requests.get(endpoint, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ vvb_organizations relationship works: {len(data)} result(s)")
            if data and 'vvb_organizations' in data[0]:
                print(f"   vvb_organizations data: {len(data[0]['vvb_organizations'])} record(s)")
        
        # Try the problematic one
        endpoint = f"{base_url}/rest/v1/vvb_engagements?select=*,verra_project_registrations!inner(*)&limit=1"
        response = requests.get(endpoint, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ verra_project_registrations!inner works")
        else:
            print(f"❌ verra_project_registrations!inner failed: {response.status_code}")
            print(f"   Error: {response.text[:200]}")
    
    except Exception as e:
        print(f"❌ Error checking schema: {e}")
    
    print("\n" + "=" * 60)
    print("💡 RECOMMENDATIONS")
    print("=" * 60)
    print("\nBased on the tests above:")
    print("1. Check which relationship name actually works")
    print("2. Update frontend to use correct relationship name")
    print("3. Or fix database relationship naming")
    print("\nTry these frontend query options:")
    print("• .select(`*, verra_project_registrations (*)`)")
    print("• .select(`*, verra_project_registrations!inner (*)`)")
    print("• .select(`*, verra_registration (*)`)")
    print("\nOr check Supabase Dashboard → Database → Tables → vvb_engagements")
    print("→ Look for 'Relationships' section")

if __name__ == "__main__":
    main()