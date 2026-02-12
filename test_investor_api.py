#!/usr/bin/env python3
"""
Simple test untuk investor dashboard API
"""

import requests
import json

def test_investor_api():
    print("🧪 TESTING INVESTOR DASHBOARD API")
    print("=" * 50)
    
    # Test 1: Fallback mode (should work without auth)
    print("\n📋 Test 1: Fallback mode API")
    try:
        response = requests.get("http://localhost:3000/api/investor/dashboard-data?fallback=true")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Status: {response.status_code}")
            print(f"   ✅ Success: {data.get('success', False)}")
            print(f"   ✅ Data source: {data.get('data', {}).get('dataSource', 'unknown')}")
            print(f"   ✅ Message: {data.get('message', 'No message')}")
        else:
            print(f"   ❌ Failed: {response.status_code}")
            print(f"   ❌ Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Check if server is running
    print("\n📋 Test 2: Server health")
    try:
        response = requests.get("http://localhost:3000", allow_redirects=False)
        print(f"   ✅ Server responding: {response.status_code}")
        if response.status_code == 302:
            print(f"   ✅ Redirect location: {response.headers.get('Location', 'unknown')}")
    except Exception as e:
        print(f"   ❌ Server not responding: {e}")
    
    # Test 3: Check API structure
    print("\n📋 Test 3: API response structure")
    try:
        response = requests.get("http://localhost:3000/api/investor/dashboard-data?fallback=true")
        if response.status_code == 200:
            data = response.json()
            
            required_keys = ["success", "data", "message"]
            missing = [k for k in required_keys if k not in data]
            
            if missing:
                print(f"   ❌ Missing keys: {missing}")
            else:
                print(f"   ✅ All required keys present")
            
            # Check data structure
            if "data" in data:
                data_keys = ["summary", "projectPerformance", "financialSummary", 
                            "impactMetrics", "lastUpdated", "dataSource"]
                data_missing = [k for k in data_keys if k not in data["data"]]
                
                if data_missing:
                    print(f"   ⚠️  Missing data keys: {data_missing}")
                else:
                    print(f"   ✅ All data keys present")
                    
                    # Show summary
                    summary = data["data"]["summary"]
                    print(f"\n   📊 Summary data:")
                    print(f"      Total projects: {summary.get('totalCarbonProjects', 0)}")
                    print(f"      Total area: {summary.get('totalAreaHectares', 0):,} ha")
                    print(f"      Total investment: Rp {summary.get('totalInvestment', 0):,.0f}")
                    print(f"      Average ROI: {summary.get('averageROI', 0):.1f}%")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("📈 TEST COMPLETE")
    print("=" * 50)
    print("\n📋 RECOMMENDATIONS:")
    print("1. Check that fallback API works (Test 1)")
    print("2. Verify the server is running (Test 2)")
    print("3. Review API structure (Test 3)")
    print("\n🔧 If fallback works but real data doesn't:")
    print("   - Check database migration status")
    print("   - Verify Supabase connection")
    print("   - Run the investor migration script")

if __name__ == "__main__":
    test_investor_api()