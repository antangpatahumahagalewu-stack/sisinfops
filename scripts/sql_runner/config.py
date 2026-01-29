"""
Configuration loader for Supabase SQL Runner
Loads environment variables and builds database connection configuration
"""
import os
import re
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

import requests


@dataclass
class SupabaseConfig:
    """Supabase configuration data class"""
    project_ref: str
    supabase_url: str
    service_role_key: str
    database_host: Optional[str] = None
    database_password: Optional[str] = None
    database_user: str = "postgres"
    database_name: str = "postgres"
    database_port: int = 6543
    region: Optional[str] = None
    
    def get_connection_string(self) -> Optional[str]:
        """Build PostgreSQL connection string"""
        if not self.database_host or not self.database_password:
            return None
        
        return (
            f"postgresql://postgres:"
            f"{self.database_password}@{self.database_host}:"
            f"5432/{self.database_name}"
        )
    
    def get_direct_connection_params(self) -> dict:
        """Get connection parameters for psycopg2"""
        # Correct Supabase connection format
        # User is just "postgres", not "postgres.project_ref"
        # Port is 5432 for direct connection, 6543 for connection pooling
        return {
            "host": self.database_host,
            "port": 5432,  # Direct connection port
            "database": self.database_name,
            "user": "postgres",  # Simple postgres user
            "password": self.database_password,
            "sslmode": "require",
        }


def load_env_config() -> Optional[SupabaseConfig]:
    """
    Load Supabase configuration from .env.local file
    """
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
    
    if not os.path.exists(env_path):
        print(f"❌ .env.local file not found at: {env_path}")
        return None
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Parse environment variables
    supabase_url = None
    service_role_key = None
    
    for line in content.split('\n'):
        line = line.strip()
        if line.startswith('#') or not line:
            continue
        
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            supabase_url = line.split('=', 1)[1].strip().strip('"\'')
        elif line.startswith('SUPABASE_SERVICE_ROLE_KEY=') and not line.startswith('SUPABASE_SERVICE_ROLE_KEY=#'):
            service_role_key = line.split('=', 1)[1].strip().strip('"\'')

    if not supabase_url or not service_role_key:
        print("❌ Missing required environment variables")
        print(f"   supabase_url: {'Found' if supabase_url else 'Missing'}")
        print(f"   service_role_key: {'Found' if service_role_key else 'Missing'}")
        return None
    
    # Extract project reference from URL
    # Format: https://rrvhekjdhdhtkmswjgwk.supabase.co
    try:
        parsed_url = urlparse(supabase_url)
        project_ref = parsed_url.hostname.split('.')[0] if parsed_url.hostname else None
    except Exception as e:
        print(f"❌ Failed to parse Supabase URL: {e}")
        return None
    
    if not project_ref:
        print("❌ Could not extract project reference from URL")
        return None
    
    return SupabaseConfig(
        project_ref=project_ref,
        supabase_url=supabase_url,
        service_role_key=service_role_key,
    )


def fetch_database_info(config: SupabaseConfig) -> bool:
    """
    Fetch database connection info from Supabase Management API
    """
    api_url = f"https://api.supabase.com/v1/projects/{config.project_ref}"
    
    headers = {
        "Authorization": f"Bearer {config.service_role_key}",
        "Content-Type": "application/json",
    }
    
    try:
        response = requests.get(api_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Extract database connection info
            db_info = data.get("database", {})
            config.database_host = db_info.get("host")
            config.database_password = data.get("db_pass")
            config.region = data.get("region")
            
            if config.database_host and config.database_password:
                print(f"✅ Successfully fetched database info for project: {config.project_ref}")
                print(f"   Region: {config.region}")
                print(f"   Host: {config.database_host}")
                return True
            else:
                print("⚠️  API response missing database connection details")
                return False
        else:
            print(f"❌ API request failed with status {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to fetch database info: {e}")
        return False


def prompt_for_connection_info(config: SupabaseConfig) -> bool:
    """
    Prompt user for manual database connection info
    """
    print("\n🔧 Manual Database Configuration Required")
    print("=" * 50)
    print("To connect directly to Supabase PostgreSQL, we need:")
    print("1. Database Host (e.g., aws-0-ap-southeast-1.pooler.supabase.com)")
    print("2. Database Password (from Supabase Dashboard)")
    print("\nYou can find this information in Supabase Dashboard:")
    print("1. Go to: https://supabase.com/dashboard")
    print("2. Select your project")
    print("3. Go to Settings → Database")
    print("4. Find 'Connection string' or 'Host' and 'Password'")
    print("=" * 50)
    
    # Auto-fill with known credentials from user
    host = "db.rrvhekjdhdhtkmswjgwk.supabase.co"
    password = "CiTagF5HA/a%jU."
    
    print(f"Auto-filled Host: {host}")
    print(f"Auto-filled Password: [hidden]")
    
    config.database_host = host
    config.database_password = password
    return True


def get_config() -> Optional[SupabaseConfig]:
    """
    Main function to get Supabase configuration
    Tries automatic fetch first, falls back to manual input
    """
    # Load basic config from .env.local
    config = load_env_config()
    if not config:
        return None
    
    print(f"✅ Loaded config for project: {config.project_ref}")
    
    # Try to fetch database info automatically
    print("\n🔄 Attempting to fetch database connection info...")
    if fetch_database_info(config):
        return config
    
    # Fall back to manual configuration
    print("\n⚠️  Automatic configuration failed")
    if prompt_for_connection_info(config):
        return config
    
    return None


if __name__ == "__main__":
    # Test the configuration loader
    config = get_config()
    if config and config.get_connection_string():
        print(f"\n✅ Configuration successful!")
        print(f"   Connection string: {config.get_connection_string()[:60]}...")
    else:
        print("\n❌ Failed to load configuration")