#!/usr/bin/env python3
"""
Supabase SQL Runner - Standalone Script
Execute SQL files against Supabase PostgreSQL database
Run this script from the project root directory.
"""
import os
import sys

# Add the scripts/sql_runner directory to Python path
sql_runner_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scripts", "sql_runner")
if sql_runner_dir not in sys.path:
    sys.path.insert(0, sql_runner_dir)

# Also add current directory for relative imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Now import and run the CLI
try:
    # Import from sql_runner module
    from run import cli
except ImportError as e:
    print(f"Import error: {e}")
    print(f"Python path: {sys.path}")
    print(f"Looking for module in: {sql_runner_dir}")
    # List files in sql_runner_dir
    if os.path.exists(sql_runner_dir):
        print(f"Files in sql_runner_dir: {os.listdir(sql_runner_dir)}")
    sys.exit(1)

if __name__ == "__main__":
    cli()