#!/usr/bin/env python3
"""
Check JWT token expiry from Supabase keys
"""
import json
import base64
import sys

def decode_jwt(token):
    """Decode JWT token without verification"""
    try:
        # Split JWT into parts
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        # Decode payload (second part)
        payload = parts[1]
        # Add padding if needed
        payload += '=' * (4 - len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload)
        return json.loads(decoded)
    except Exception as e:
        print(f"Error decoding JWT: {e}")
        return None

def check_keys():
    """Check the keys provided by user"""
    anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NTU4NDUsImV4cCI6MjA4MzIzMTg0NX0.6FU748Mff9v4tWLRLvXnD4xRCdcpSh14icYvtr2-OLs"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmhla2pkaGRodGttc3dqZ3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY1NTg0NSwiZXhwIjoyMDgzMjMxODQ1fQ.Ffd7Ozwrtx0Mvkr8iXQLBDsBA4OvF1e6lVfNPBuDmE0"
    
    print("🔐 JWT TOKEN ANALYSIS")
    print("=" * 60)
    
    # Decode anon key
    print("\n📡 ANON KEY:")
    anon_payload = decode_jwt(anon_key)
    if anon_payload:
        print(f"   Issuer: {anon_payload.get('iss', 'N/A')}")
        print(f"   Role: {anon_payload.get('role', 'N/A')}")
        print(f"   Issued At (iat): {anon_payload.get('iat', 'N/A')}")
        print(f"   Expires (exp): {anon_payload.get('exp', 'N/A')}")
        
        # Convert timestamp to readable date
        import datetime
        iat = anon_payload.get('iat')
        exp = anon_payload.get('exp')
        
        if iat:
            issued = datetime.datetime.fromtimestamp(iat)
            print(f"   Issued At: {issued}")
        
        if exp:
            expires = datetime.datetime.fromtimestamp(exp)
            now = datetime.datetime.now()
            print(f"   Expires At: {expires}")
            
            # Check if expired
            if now > expires:
                print(f"   ❌ TOKEN EXPIRED! ({now - expires} ago)")
            else:
                print(f"   ✅ Token valid for {expires - now} more")
    
    # Decode service key
    print("\n🔧 SERVICE ROLE KEY:")
    service_payload = decode_jwt(service_key)
    if service_payload:
        print(f"   Issuer: {service_payload.get('iss', 'N/A')}")
        print(f"   Role: {service_payload.get('role', 'N/A')}")
        print(f"   Issued At (iat): {service_payload.get('iat', 'N/A')}")
        print(f"   Expires (exp): {service_payload.get('exp', 'N/A')}")
        
        # Convert timestamp to readable date
        import datetime
        iat = service_payload.get('iat')
        exp = service_payload.get('exp')
        
        if iat:
            issued = datetime.datetime.fromtimestamp(iat)
            print(f"   Issued At: {issued}")
        
        if exp:
            expires = datetime.datetime.fromtimestamp(exp)
            now = datetime.datetime.now()
            print(f"   Expires At: {expires}")
            
            # Check if expired
            if now > expires:
                print(f"   ❌ TOKEN EXPIRED! ({now - expires} ago)")
            else:
                print(f"   ✅ Token valid for {expires - now} more")
    
    print("\n" + "=" * 60)
    print("🎯 RECOMMENDATION:")
    
    # Check if tokens are same as in .env.local
    import os
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            content = f.read()
        
        if anon_key in content and service_key in content:
            print("✅ Keys match .env.local")
            print("\n🔴 ISSUE: These keys are NOT working (401 errors)")
            print("   Most likely: Tokens expired or project configuration issue")
            print("\n🚀 SOLUTION:")
            print("   1. REGENERATE keys in Supabase dashboard")
            print("   2. If still failing, check project status")
            print("   3. Consider creating new Supabase project")
        else:
            print("⚠️  Keys don't match .env.local")
            print("   Update .env.local with these keys")
    else:
        print("❌ .env.local not found")

if __name__ == "__main__":
    check_keys()