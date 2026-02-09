"""
SQL Execution Engine for Supabase SQL Runner
Handles executing SQL files and statements with proper error handling
"""
import time
import re
from typing import List, Tuple, Optional, Dict, Any
from dataclasses import dataclass
from contextlib import contextmanager

import psycopg2
from psycopg2 import sql as psql
from psycopg2.extensions import connection, cursor
from rich.console import Console
from rich.table import Table
from rich.syntax import Syntax
from rich.panel import Panel
from rich.live import Live
from rich.spinner import Spinner
from rich.text import Text

from config import SupabaseConfig, get_config

console = Console()


@dataclass
class ExecutionResult:
    """Result of SQL execution"""
    success: bool
    execution_time: float
    row_count: Optional[int] = None
    message: Optional[str] = None
    error: Optional[str] = None
    error_position: Optional[int] = None
    affected_rows: Optional[int] = None
    query_type: Optional[str] = None


@dataclass
class StatementResult:
    """Result of a single SQL statement"""
    statement: str
    result: ExecutionResult
    line_number: int


class SQLError(Exception):
    """Custom SQL execution error"""
    def __init__(self, message: str, position: Optional[int] = None, 
                 sql_state: Optional[str] = None):
        self.message = message
        self.position = position
        self.sql_state = sql_state
        super().__init__(self.message)


class SQLExecutor:
    """Main SQL executor class"""
    
    def __init__(self, config: SupabaseConfig):
        self.config = config
        self.connection: Optional[connection] = None
        self._connect()
    
    def _connect(self):
        """Establish database connection"""
        try:
            conn_params = self.config.get_direct_connection_params()
            console.print(f"🔌 Connecting to [bold cyan]{self.config.database_host}[/bold cyan]...")
            
            self.connection = psycopg2.connect(**conn_params)
            self.connection.autocommit = False
            
            # Test connection
            with self.connection.cursor() as cur:
                cur.execute("SELECT version();")
                version = cur.fetchone()[0]
                console.print(f"✅ Connected to PostgreSQL: [dim]{version.split(',')[0]}[/dim]")
                
        except psycopg2.Error as e:
            console.print(f"[red]❌ Database connection failed: {e}[/red]")
            raise
    
    @contextmanager
    def get_cursor(self):
        """Context manager for database cursor"""
        if not self.connection or self.connection.closed:
            self._connect()
        
        cur = self.connection.cursor()
        try:
            yield cur
        finally:
            cur.close()
    
    def execute_sql(self, sql: str, params: Optional[tuple] = None) -> ExecutionResult:
        """
        Execute a single SQL statement
        """
        start_time = time.time()
        result = ExecutionResult(success=False, execution_time=0)
        
        try:
            with self.get_cursor() as cur:
                # Determine query type for better reporting
                query_type = self._get_query_type(sql)
                result.query_type = query_type
                
                # Execute the query
                cur.execute(sql, params)
                self.connection.commit()
                
                # Calculate execution time
                execution_time = time.time() - start_time
                result.execution_time = execution_time
                
                # Set result based on query type
                if query_type in ("SELECT", "WITH"):
                    rows = cur.fetchall()
                    result.row_count = len(rows)
                    result.message = f"Returned {result.row_count} row(s)"
                    result.success = True
                elif query_type in ("INSERT", "UPDATE", "DELETE", "CREATE", "ALTER", "DROP"):
                    result.affected_rows = cur.rowcount
                    result.message = f"Affected {result.affected_rows} row(s)"
                    result.success = True
                else:
                    result.message = "Query executed successfully"
                    result.success = True
                
                return result
                
        except psycopg2.Error as e:
            self.connection.rollback()
            execution_time = time.time() - start_time
            result.execution_time = execution_time
            result.error = str(e)
            result.success = False
            
            # Extract error position if available
            try:
                if hasattr(e, 'diag') and e.diag:
                    # Access the position attribute from diagnostics
                    if hasattr(e.diag, 'position'):
                        result.error_position = e.diag.position
                    elif hasattr(e.diag, 'get'):
                        result.error_position = e.diag.get('position')
            except (AttributeError, TypeError):
                pass  # Ignore if we can't access position
            
            return result
    
    def _get_query_type(self, sql: str) -> str:
        """Determine the type of SQL query"""
        sql_upper = sql.strip().upper()
        
        if sql_upper.startswith("SELECT"):
            return "SELECT"
        elif sql_upper.startswith("INSERT"):
            return "INSERT"
        elif sql_upper.startswith("UPDATE"):
            return "UPDATE"
        elif sql_upper.startswith("DELETE"):
            return "DELETE"
        elif sql_upper.startswith("CREATE"):
            return "CREATE"
        elif sql_upper.startswith("ALTER"):
            return "ALTER"
        elif sql_upper.startswith("DROP"):
            return "DROP"
        elif sql_upper.startswith("WITH"):
            return "WITH"
        else:
            return "OTHER"
    
    def split_sql_file(self, content: str) -> List[Tuple[str, int]]:
        """
        Split SQL file into individual statements
        Returns list of (statement, line_number) tuples
        """
        statements = []
        current_statement = []
        in_string = False
        string_char = None
        in_comment = False
        comment_type = None  # '--' or '/*'
        line_number = 1
        statement_start_line = 1
        
        i = 0
        while i < len(content):
            char = content[i]
            
            # Track line numbers
            if char == '\n':
                line_number += 1
            
            # Handle string literals
            if not in_comment and char in ("'", '"'):
                if not in_string:
                    in_string = True
                    string_char = char
                elif string_char == char:
                    # Check if it's escaped
                    if i > 0 and content[i-1] == '\\':
                        pass  # Escaped quote, continue string
                    else:
                        in_string = False
                        string_char = None
            
            # Handle comments
            elif not in_string:
                if not in_comment and i + 1 < len(content):
                    two_chars = content[i:i+2]
                    if two_chars == '--':
                        in_comment = True
                        comment_type = '--'
                        i += 1  # Skip next char
                    elif two_chars == '/*':
                        in_comment = True
                        comment_type = '/*'
                        i += 1  # Skip next char
                    elif in_comment and comment_type == '--' and char == '\n':
                        in_comment = False
                        comment_type = None
                    elif in_comment and comment_type == '/*' and i + 1 < len(content):
                        if content[i:i+2] == '*/':
                            in_comment = False
                            comment_type = None
                            i += 1  # Skip next char
            
            # If not in comment or string, look for statement end
            if not in_string and not in_comment:
                if char == ';':
                    # End of statement
                    current_statement.append(char)
                    statement_text = ''.join(current_statement).strip()
                    if statement_text and not statement_text.isspace():
                        statements.append((statement_text, statement_start_line))
                    current_statement = []
                    statement_start_line = line_number + 1  # Next statement starts on next line
                else:
                    current_statement.append(char)
            else:
                current_statement.append(char)
            
            i += 1
        
        # Handle last statement without semicolon
        if current_statement:
            statement_text = ''.join(current_statement).strip()
            if statement_text and not statement_text.isspace():
                statements.append((statement_text, statement_start_line))
        
        return statements
    
    def execute_file(self, file_path: str, stop_on_error: bool = True) -> List[StatementResult]:
        """
        Execute SQL statements from a file
        """
        console.print(f"\n📄 [bold]Executing SQL file:[/bold] {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            console.print(f"[red]❌ Failed to read file: {e}[/red]")
            return []
        
        # Split into statements
        statements = self.split_sql_file(content)
        console.print(f"📋 Found [bold]{len(statements)}[/bold] SQL statement(s)")
        
        results = []
        for i, (stmt, line_num) in enumerate(statements, 1):
            console.print(f"\n[dim]{'─' * 60}[/dim]")
            console.print(f"🚀 [bold]Statement {i}/{len(statements)}[/bold] (Line {line_num})")
            
            # Display statement preview
            stmt_preview = stmt[:200] + "..." if len(stmt) > 200 else stmt
            console.print(Panel(stmt_preview, title="SQL Preview", border_style="dim"))
            
            # Execute statement
            with Live(Spinner("dots", text="Executing..."), console=console, refresh_per_second=10):
                result = self.execute_sql(stmt)
            
            # Create statement result
            stmt_result = StatementResult(
                statement=stmt,
                result=result,
                line_number=line_num
            )
            results.append(stmt_result)
            
            # Display result
            self._display_statement_result(stmt_result, i)
            
            # Check if we should stop on error
            if not result.success and stop_on_error:
                console.print(f"\n[red]⏹️  Stopping execution due to error (stop_on_error=True)[/red]")
                break
        
        # Display summary
        self._display_execution_summary(results)
        
        return results
    
    def _display_statement_result(self, stmt_result: StatementResult, statement_num: int):
        """Display result of a single statement execution"""
        result = stmt_result.result
        
        if result.success:
            status_text = Text("✅ SUCCESS", style="bold green")
            
            info_parts = []
            if result.message:
                info_parts.append(result.message)
            if result.execution_time:
                info_parts.append(f"({result.execution_time:.3f}s)")
            
            if info_parts:
                console.print(f"{status_text} {', '.join(info_parts)}")
            else:
                console.print(status_text)
                
            # Show sample data for SELECT queries
            if result.query_type == "SELECT" and result.row_count and result.row_count > 0:
                if result.row_count <= 10:
                    console.print(f"   📊 Showing all {result.row_count} row(s)")
                else:
                    console.print(f"   📊 Showing first 10 of {result.row_count} row(s)")
        else:
            status_text = Text("❌ ERROR", style="bold red")
            console.print(f"{status_text} {result.error}")
            
            # Show error context if we have position
            if result.error_position:
                self._display_error_context(
                    stmt_result.statement, 
                    result.error_position,
                    stmt_result.line_number
                )
    
    def _display_error_context(self, sql: str, position: int, line_offset: int):
        """Display context around SQL error"""
        if position <= 0 or position > len(sql):
            return
        
        # Find the line containing the error
        lines = sql[:position].split('\n')
        error_line_num = len(lines) - 1
        error_line = lines[-1] if lines else ""
        
        # Get the character position in the line
        char_pos = len(error_line)
        
        # Get the full line with context
        all_lines = sql.split('\n')
        actual_line_num = line_offset + error_line_num - 1
        
        console.print(f"\n[dim]Error at line {actual_line_num}, position {char_pos}:[/dim]")
        
        # Show 2 lines before and after
        start_line = max(0, error_line_num - 2)
        end_line = min(len(all_lines), error_line_num + 3)
        
        for i in range(start_line, end_line):
            line_content = all_lines[i]
            line_num = line_offset + i
            
            if i == error_line_num:
                # Error line with pointer
                pointer = " " * (char_pos) + "^"
                console.print(f"[red]{line_num:4d} | {line_content}[/red]")
                console.print(f"[red]     | {pointer}[/red]")
            else:
                console.print(f"[dim]{line_num:4d} | {line_content}[/dim]")
    
    def _display_execution_summary(self, results: List[StatementResult]):
        """Display summary of execution results"""
        console.print(f"\n[bold]{'='*60}[/bold]")
        console.print("[bold]📊 EXECUTION SUMMARY[/bold]")
        
        total = len(results)
        successful = sum(1 for r in results if r.result.success)
        failed = total - successful
        
        # Create summary table
        table = Table(show_header=True, header_style="bold")
        table.add_column("Status", style="bold")
        table.add_column("Count")
        table.add_column("Percentage")
        
        table.add_row(
            "[green]Successful[/green]",
            str(successful),
            f"{(successful/total*100):.1f}%" if total > 0 else "0%"
        )
        
        if failed > 0:
            table.add_row(
                "[red]Failed[/red]",
                str(failed),
                f"{(failed/total*100):.1f}%" if total > 0 else "0%"
            )
        
        table.add_row(
            "[bold]Total[/bold]",
            str(total),
            "100%"
        )
        
        console.print(table)
        
        # Show timing information
        total_time = sum(r.result.execution_time for r in results)
        avg_time = total_time / total if total > 0 else 0
        
        console.print(f"\n⏱️  [bold]Timing:[/bold]")
        console.print(f"   Total execution time: {total_time:.3f}s")
        console.print(f"   Average per statement: {avg_time:.3f}s")
        
        if failed == 0:
            console.print("\n🎉 [bold green]All statements executed successfully![/bold green]")
        else:
            console.print(f"\n⚠️  [bold yellow]{failed} statement(s) failed[/bold yellow]")
    
    def close(self):
        """Close database connection"""
        if self.connection and not self.connection.closed:
            self.connection.close()
            console.print("[dim]Database connection closed[/dim]")
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


def execute_sql_file(file_path: str, config: Optional[SupabaseConfig] = None) -> bool:
    """
    Convenience function to execute a SQL file
    """
    if not config:
        config = get_config()
        if not config:
            return False
    
    try:
        with SQLExecutor(config) as executor:
            results = executor.execute_file(file_path)
            return all(r.result.success for r in results)
    except Exception as e:
        console.print(f"[red]❌ Execution failed: {e}[/red]")
        return False


if __name__ == "__main__":
    # Test the executor
    config = get_config()
    if config:
        test_sql = "SELECT NOW(); SELECT * FROM non_existent_table;"
        with SQLExecutor(config) as executor:
            result = executor.execute_sql("SELECT NOW();")
            print(f"Test result: {result.success}, Message: {result.message}")
    else:
        print("Failed to load configuration")