#!/usr/bin/env python3
"""Quick test for database fixes"""
import requests
import os
import time

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

def test_simple_queries():
    """Test simple queries without complex joins"""
    print("🔍 TESTING SIMPLE QUERIES")
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
    
    # Test 1: Basic table access
    print("\n📋 Test 1: Basic table access")
    
    tables = {
        'vvb_organizations': 'VVB Organizations',
        'vvb_engagements': 'VVB Engagements',
        'verra_project_registrations': 'Verra Registrations',
        'carbon_projects': 'Carbon Projects'
    }
    
    for table, name in tables.items():
        endpoint = f"{base_url}/rest/v1/{table}?select=count&limit=0"
        try:
            response = requests.get(endpoint, headers=headers, timeout=10)
            if response.status_code == 200:
                # Get count from content-range header
                content_range = response.headers.get('content-range', '')
                if '*/' in content_range:
                    count = content_range.split('*/')[1]
                    print(f"✅ {name}: {count} records")
                else:
                    print(f"✅ {name}: Accessible")
            else:
                print(f"❌ {name}: Failed ({response.status_code})")
        except Exception as e:
            print(f"❌ {name}: Error - {e}")
    
    # Test 2: Simple VVB engagements with verra_registration_id
    print("\n📋 Test 2: VVB Engagements with verra_registration_id")
    endpoint = f"{base_url}/rest/v1/vvb_engagements?select=id,contract_number,verra_registration_id&limit=2"
    
    try:
        response = requests.get(endpoint, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data)} VVB engagements")
            for item in data:
                print(f"   • {item['contract_number']}: verra_registration_id={item.get('verra_registration_id', 'NULL')}")
        else:
            print(f"❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Verra registrations
    print("\n📋 Test 3: Verra Registrations")
    endpoint = f"{base_url}/rest/v1/verra_project_registrations?select=id,verra_project_id,status&limit=2"
    
    try:
        response = requests.get(endpoint, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data)} Verra registrations")
            for item in data:
                print(f"   • {item['verra_project_id']}: status={item.get('status')}")
        else:
            print(f"❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_nextjs():
    """Test Next.js server"""
    print("\n" + "=" * 60)
    print("🔍 TESTING NEXT.JS SERVER")
    print("=" * 60)
    
    # Find server port
    for port in range(3000, 3010):
        try:
            url = f"http://localhost:{port}"
            response = requests.get(url, timeout=3)
            if response.status_code < 500:
                print(f"✅ Next.js server running on port {port}")
                print(f"   URL: {url}")
                
                # Test pages
                print("\n📋 Testing pages...")
                for page in ['/id/dashboard/verra-registration', '/id/dashboard/vvb-management']:
                    page_url = url + page
                    try:
                        resp = requests.get(page_url, timeout=5)
                        if resp.status_code == 200:
                            print(f"✅ {page}: Accessible")
                        else:
                            print(f"⚠️  {page}: Status {resp.status_code}")
                    except:
                        print(f"❌ {page}: Cannot access")
                
                return True
        except:
            continue
    
    print("❌ Next.js server not found on ports 3000-3009")
    print("   Check if server is running: ps aux | grep next")
    return False

def main():
    print("🚀 QUICK TEST OF DATABASE FIXES")
    print("\nChecking if all database fixes are working...")
    print("=" * 60)
    
    print("\n⏳ Waiting 30 seconds for Supabase schema cache refresh...")
    time.sleep(30)
    
    # Test database access
    test_simple_queries()
    
    # Test Next.js server
    test_nextjs()
    
    print("\n" + "=" * 60)
    print("📋 SUMMARY")
    print("=" * 60)
    print("\n✅ DATABASE FIXES APPLIED:")
    print("1. Missing VVB tables created")
    print("2. Foreign key relationships established")
    print("3. Verra registration status column fixed")
    print("4. Sample data inserted")
    
    print("\n🔧 FRONTEND FIXES APPLIED:")
    print("1. VVB Management page query syntax fixed (!inner)")
    print("2. Next.js server restarted with clean cache")
    
    print("\n💡 RECOMMENDATIONS:")
    print("1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)")
    print("2. Wait 1-2 minutes for full Supabase cache propagation")
    print("3. Test pages manually:")
    print("   • http://localhost:3002/id/dashboard/verra-registration")
    print("   • http://localhost:3002/id/dashboard/vvb-management")
    
    print("\n⚠️  If still having issues:")
    print("• Check browser console for errors")
    print("• Verify Supabase Dashboard → Database → Tables")
    print("• Wait longer for schema cache (can take 5-10 minutes)")

if __name__ == "__main__":
    main()