#!/usr/bin/env python3
"""
Supabase SQL Runner - CLI Tool
Execute SQL files against Supabase PostgreSQL database with detailed error reporting
"""
import os
import sys
from pathlib import Path

import click
from rich.console import Console

from config import get_config
from executor import SQLExecutor, execute_sql_file

console = Console()


@click.group()
def cli():
    """Supabase SQL Runner - Execute SQL files against Supabase database"""
    pass


@cli.command()
@click.argument('sql_file', type=click.Path(exists=True))
@click.option('--stop-on-error/--no-stop-on-error', default=True,
              help='Stop execution when an error occurs')
@click.option('--verbose', '-v', is_flag=True, help='Verbose output')
def run(sql_file, stop_on_error, verbose):
    """Execute a SQL file against Supabase database"""
    if not os.path.exists(sql_file):
        console.print(f"[red]❌ File not found: {sql_file}[/red]")
        sys.exit(1)
    
    console.print(f"[bold green]🚀 Supabase SQL Runner[/bold green]")
    console.print(f"   File: [cyan]{sql_file}[/cyan]")
    console.print(f"   Stop on error: {'Yes' if stop_on_error else 'No'}")
    console.print()
    
    # Load configuration
    config = get_config()
    if not config:
        console.print("[red]❌ Failed to load Supabase configuration[/red]")
        console.print("   Make sure .env.local exists with SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    
    # Execute the SQL file
    try:
        with SQLExecutor(config) as executor:
            results = executor.execute_file(sql_file, stop_on_error=stop_on_error)
            
            # Determine exit code
            all_success = all(r.result.success for r in results)
            if all_success:
                console.print("\n[bold green]✅ All statements executed successfully![/bold green]")
                sys.exit(0)
            else:
                console.print("\n[bold yellow]⚠️  Some statements failed[/bold yellow]")
                sys.exit(1)
                
    except Exception as e:
        console.print(f"[red]❌ Execution failed: {e}[/red]")
        sys.exit(1)


@cli.command()
def test():
    """Test database connection"""
    console.print("[bold green]🔧 Testing Supabase Connection[/bold green]")
    
    config = get_config()
    if not config:
        console.print("[red]❌ Failed to load configuration[/red]")
        sys.exit(1)
    
    try:
        with SQLExecutor(config) as executor:
            # Connection is established in __init__
            console.print("[green]✅ Database connection successful![/green]")
            
            # Test a simple query
            result = executor.execute_sql("SELECT NOW() as current_time, version() as pg_version;")
            if result.success:
                console.print("[green]✅ Test query executed successfully[/green]")
                console.print(f"   PostgreSQL Version: {result.message}")
            else:
                console.print(f"[red]❌ Test query failed: {result.error}[/red]")
                
    except Exception as e:
        console.print(f"[red]❌ Connection test failed: {e}[/red]")
        sys.exit(1)


@cli.command()
@click.argument('sql', required=False)
def query(sql):
    """Execute a single SQL query"""
    if not sql:
        console.print("[yellow]⚠️  No SQL provided. Please provide a SQL query.[/yellow]")
        console.print("   Example: python run.py query 'SELECT NOW();'")
        return
    
    console.print(f"[bold green]🔍 Executing SQL Query[/bold green]")
    console.print(f"   Query: [cyan]{sql[:100]}...[/cyan]" if len(sql) > 100 else f"   Query: [cyan]{sql}[/cyan]")
    console.print()
    
    config = get_config()
    if not config:
        console.print("[red]❌ Failed to load configuration[/red]")
        sys.exit(1)
    
    try:
        with SQLExecutor(config) as executor:
            result = executor.execute_sql(sql)
            
            if result.success:
                console.print(f"[green]✅ Query executed successfully[/green]")
                console.print(f"   {result.message}")
                if result.execution_time:
                    console.print(f"   Execution time: {result.execution_time:.3f}s")
            else:
                console.print(f"[red]❌ Query failed: {result.error}[/red]")
                sys.exit(1)
                
    except Exception as e:
        console.print(f"[red]❌ Execution failed: {e}[/red]")
        sys.exit(1)


@cli.command()
def config():
    """Show current configuration"""
    console.print("[bold green]⚙️  Current Configuration[/bold green]")
    
    config = get_config()
    if not config:
        console.print("[red]❌ Failed to load configuration[/red]")
        sys.exit(1)
    
    from rich.table import Table
    
    table = Table(show_header=False, box=None)
    table.add_column("Key", style="bold cyan")
    table.add_column("Value", style="white")
    
    table.add_row("Project Reference", config.project_ref)
    table.add_row("Supabase URL", config.supabase_url)
    table.add_row("Database Host", config.database_host or "[yellow]Not configured[/yellow]")
    table.add_row("Database Port", str(config.database_port))
    table.add_row("Database Name", config.database_name)
    table.add_row("Database User", f"{config.database_user}.{config.project_ref}")
    table.add_row("Region", config.region or "[yellow]Unknown[/yellow]")
    
    if config.database_host and config.database_password:
        conn_str = config.get_connection_string()
        if conn_str:
            # Hide password in display
            safe_conn_str = conn_str.replace(config.database_password, "***")
            table.add_row("Connection String", safe_conn_str)
    
    console.print(table)
    
    # Test connection
    console.print("\n[bold]🔧 Testing connection...[/bold]")
    try:
        with SQLExecutor(config) as executor:
            console.print("[green]✅ Connection successful![/green]")
    except Exception as e:
        console.print(f"[red]❌ Connection failed: {e}[/red]")


@cli.command()
@click.argument('migration_dir', type=click.Path(exists=True), 
                default='supabase/migrations')
def migrations(migration_dir):
    """List and manage database migrations"""
    console.print(f"[bold green]📋 Database Migrations[/bold green]")
    console.print(f"   Directory: [cyan]{migration_dir}[/cyan]")
    console.print()
    
    # Find all SQL files in the migration directory
    migration_path = Path(migration_dir)
    sql_files = list(migration_path.glob('*.sql'))
    
    if not sql_files:
        console.print("[yellow]⚠️  No SQL migration files found[/yellow]")
        return
    
    # Sort by filename (which should include timestamp)
    sql_files.sort(key=lambda x: x.name)
    
    from rich.table import Table
    
    table = Table(show_header=True, header_style="bold")
    table.add_column("File", style="cyan")
    table.add_column("Size", style="dim")
    table.add_column("Last Modified")
    
    for sql_file in sql_files:
        stat = sql_file.stat()
        size_kb = stat.st_size / 1024
        from datetime import datetime
        mod_time = datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M')
        
        table.add_row(
            sql_file.name,
            f"{size_kb:.1f} KB",
            mod_time
        )
    
    console.print(table)
    console.print(f"\nTotal: [bold]{len(sql_files)}[/bold] migration files")
    
    # Check if we can execute them
    config = get_config()
    if config:
        console.print("\n[bold]💡 Tip:[/bold] Run a migration with:")
        console.print(f"   python run.py run {migration_dir}/20260136_fix_security_definer_views.sql")


@cli.command()
@click.argument('migration_dir', type=click.Path(exists=True), 
                default='supabase/migrations')
def run_all(migrations_dir):
    """Run all migrations in order (use with caution!)"""
    console.print(f"[bold yellow]⚠️  WARNING: Running all migrations[/bold yellow]")
    console.print(f"   Directory: [cyan]{migrations_dir}[/cyan]")
    console.print()
    console.print("[yellow]This will execute ALL SQL files in the migration directory.")
    console.print("Make sure you have backups and know what you're doing![/yellow]")
    
    if not click.confirm("\nDo you want to continue?"):
        console.print("[red]❌ Operation cancelled[/red]")
        return
    
    migration_path = Path(migrations_dir)
    sql_files = list(migration_path.glob('*.sql'))
    sql_files.sort(key=lambda x: x.name)
    
    config = get_config()
    if not config:
        console.print("[red]❌ Failed to load configuration[/red]")
        sys.exit(1)
    
    all_success = True
    failed_files = []
    
    for sql_file in sql_files:
        console.print(f"\n{'='*60}")
        console.print(f"[bold]Executing:[/bold] {sql_file.name}")
        
        try:
            with SQLExecutor(config) as executor:
                results = executor.execute_file(str(sql_file), stop_on_error=True)
                
                file_success = all(r.result.success for r in results)
                if not file_success:
                    all_success = False
                    failed_files.append(sql_file.name)
                    
        except Exception as e:
            console.print(f"[red]❌ Failed to execute {sql_file.name}: {e}[/red]")
            all_success = False
            failed_files.append(sql_file.name)
    
    # Summary
    console.print(f"\n{'='*60}")
    console.print("[bold]📊 Migration Summary[/bold]")
    console.print(f"   Total files: {len(sql_files)}")
    console.print(f"   Successful: {len(sql_files) - len(failed_files)}")
    console.print(f"   Failed: {len(failed_files)}")
    
    if failed_files:
        console.print(f"\n[red]❌ Failed migrations:[/red]")
        for f in failed_files:
            console.print(f"   - {f}")
        sys.exit(1)
    else:
        console.print("\n[bold green]✅ All migrations executed successfully![/bold green]")
        sys.exit(0)


if __name__ == "__main__":
    cli()