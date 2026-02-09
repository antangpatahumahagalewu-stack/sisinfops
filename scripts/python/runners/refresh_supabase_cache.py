#!/usr/bin/env python3
"""Refresh Supabase schema cache to fix relationship errors"""
import requests
import os
import json

def refresh_schema_cache():
    """Call Supabase API to refresh schema cache"""
    print("🔄 Refreshing Supabase schema cache...")
    
    # Read environment variables
    env_path = '.env.local'
    if not os.path.exists(env_path):
        print(f"❌ {env_path} not found")
        return False
    
    env_vars = {}
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key] = value.strip().strip('"\'')

    supabase_url = env_vars.get('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = env_vars.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase URL or service role key")
        return False
    
    # Extract project reference
    import re
    match = re.search(r'https://([a-zA-Z0-9]+)\.supabase\.co', supabase_url)
    if not match:
        print(f"❌ Could not parse URL: {supabase_url}")
        return False
    
    project_ref = match.group(1)
    print(f"✅ Project: {project_ref}")
    
    # Supabase Management API endpoint for schema cache
    url = f"https://api.supabase.com/v1/projects/{project_ref}/database/schema-cache"
    
    headers = {
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    
    try:
        # First, check current status
        print("📊 Checking current cache status...")
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            cache_info = response.json()
            print(f"✅ Current cache status: {cache_info.get('status', 'unknown')}")
            print(f"✅ Last refreshed: {cache_info.get('last_refreshed_at', 'never')}")
        else:
            print(f"⚠️ Could not get cache status: {response.status_code}")
            print(f"Response: {response.text[:200]}")
        
        # Try to refresh
        print("\n🔄 Attempting to refresh schema cache...")
        response = requests.post(url, headers=headers, timeout=60)
        
        if response.status_code == 200:
            print("✅ Schema cache refresh initiated successfully!")
            result = response.json()
            print(f"✅ Status: {result.get('status', 'unknown')}")
            print(f"✅ Message: {result.get('message', 'Refresh started')}")
            return True
        elif response.status_code == 202:
            print("✅ Schema cache refresh accepted (async)")
            return True
        else:
            print(f"❌ Failed to refresh schema cache: {response.status_code}")
            print(f"Response: {response.text[:200]}")
            
            # Try alternative approach - call a dummy query to trigger cache rebuild
            print("\n🔄 Trying alternative: trigger cache via query...")
            return trigger_cache_via_query(supabase_url, supabase_key)
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request error: {e}")
        return False

def trigger_cache_via_query(supabase_url, supabase_key):
    """Trigger schema cache refresh by making various queries"""
    print("📊 Triggering cache via queries...")
    
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    
    # Make queries to tables with relationships
    queries = [
        f"{supabase_url}/rest/v1/vvb_engagements?select=*,verra_project_registrations!inner(*)&limit=1",
        f"{supabase_url}/rest/v1/carbon_projects?select=*,verra_project_registrations!inner(*)&limit=1",
        f"{supabase_url}/rest/v1/carbon_credits?select=*,verra_project_registrations!inner(*)&limit=1",
        f"{supabase_url}/rest/v1/verra_project_registrations?select=*,carbon_projects!inner(*)&limit=1"
    ]
    
    success_count = 0
    for query_url in queries:
        try:
            response = requests.get(query_url, headers=headers, timeout=10)
            if response.status_code == 200:
                print(f"✅ Query successful: {query_url.split('/')[-2]}")
                success_count += 1
            else:
                print(f"⚠️ Query failed ({response.status_code}): {query_url.split('/')[-2]}")
                # Log the error for debugging
                if response.status_code == 400:
                    error_data = response.json()
                    print(f"   Error: {error_data.get('message', 'Unknown')}")
        except Exception as e:
            print(f"❌ Query exception: {e}")
    
    print(f"\n📊 Query results: {success_count}/{len(queries)} successful")
    
    if success_count > 0:
        print("✅ Some queries succeeded - cache may be rebuilding")
        return True
    else:
        print("❌ All queries failed")
        return False

def test_relationships():
    """Test if relationships are working after refresh"""
    print("\n🔍 Testing relationships after refresh...")
    
    # Simple test using curl
    import subprocess
    
    # Read environment variables
    env_vars = {}
    with open('.env.local', 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key] = value.strip().strip('"\'')
    
    supabase_url = env_vars.get('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = env_vars.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing environment variables")
        return
    
    # Test vvb_engagements relationship
    test_url = f"{supabase_url}/rest/v1/vvb_engagements?select=*,verra_project_registrations!inner(carbon_project_id)&limit=1"
    
    curl_cmd = [
        "curl", "-s", "-X", "GET",
        test_url,
        "-H", f"apikey: {supabase_key}",
        "-H", "Authorization: Bearer {supabase_key}",
        "-H", "Content-Type: application/json"
    ]
    
    try:
        result = subprocess.run(curl_cmd, capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ REST API test successful")
            try:
                data = json.loads(result.stdout)
                if isinstance(data, list) and len(data) > 0:
                    print(f"✅ Found {len(data)} records")
                    if 'verra_project_registrations' in data[0]:
                        print("✅ Relationship data included in response")
                    else:
                        print("⚠️ Relationship data not in response")
                else:
                    print("⚠️ No data returned")
            except json.JSONDecodeError:
                print("❌ Invalid JSON response")
                print(f"Response: {result.stdout[:200]}")
        else:
            print(f"❌ cURL failed: {result.stderr}")
    except Exception as e:
        print(f"❌ Test failed: {e}")

def main():
    print("🚀 SUPABASE SCHEMA CACHE REFRESH")
    print("=" * 60)
    print("\nThis script will attempt to refresh Supabase's schema cache.")
    print("This can fix 'Could not find a relationship' errors.")
    print("=" * 60)
    
    if refresh_schema_cache():
        print("\n✅ Refresh process completed")
        print("\n📋 NEXT STEPS:")
        print("1. Wait 1-2 minutes for cache to rebuild")
        print("2. Restart Next.js dev server")
        print("3. Test the problematic pages")
        
        # Wait a bit and test
        import time
        print("\n⏳ Waiting 30 seconds for cache to update...")
        time.sleep(30)
        
        test_relationships()
    else:
        print("\n❌ Could not refresh schema cache")
        print("\n📋 ALTERNATIVE SOLUTIONS:")
        print("1. Wait 5-10 minutes - Supabase auto-refreshes periodically")
        print("2. Restart Next.js dev server")
        print("3. Use manual joins in your queries (like the VVB page does)")
        print("4. Contact Supabase support if issue persists")

if __name__ == "__main__":
    main()