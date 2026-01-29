#!/usr/bin/env python3
"""
Wrapper script for Supabase SQL Runner
Execute this script from the project root directory
"""
import os
import sys

# Add the sql-runner directory to Python path
sql_runner_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sql-runner")
sys.path.insert(0, sql_runner_dir)

# Now import and run the CLI
try:
    from run import cli
except ImportError as e:
    print(f"Import error: {e}")
    print(f"sys.path: {sys.path}")
    sys.exit(1)

if __name__ == "__main__":
    cli()