#!/usr/bin/env python3
"""
Browser Console Issues Capture - Script Bantuan
================================================
Script untuk membantu capture console warnings dari browser dan generate
prompt untuk Cline Plan Mode.

Karena browser console warnings tidak bisa diakses secara otomatis dari terminal,
script ini memberikan instruksi manual untuk:
1. Capture console warnings
2. Save screenshot
3. Generate Cline prompt

Cara pakai:
    python3 capture_browser_issues.py
    python3 capture_browser_issues.py --auto-check
"""

import os
import sys
import argparse
import subprocess
from datetime import datetime

def main():
    parser = argparse.ArgumentParser(
        description="Browser Console Issues Capture Helper"
    )
    
    parser.add_argument(
        "--auto-check",
        action="store_true",
        help="Check for common issues automatically"
    )
    
    args = parser.parse_args()
    
    print("""
╔══════════════════════════════════════════════════════╗
║     BROWSER CONSOLE ISSUES CAPTURE HELPER           ║
║     For Next.js Development                         ║
╚══════════════════════════════════════════════════════╝
    """)
    
    # Create output directory
    output_dir = ".browser_issues"
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"📁 Output directory: {output_dir}")
    print()
    
    if args.auto_check:
        auto_check_issues()
    else:
        show_manual_instructions(output_dir)

def auto_check_issues():
    """Check for common issues automatically"""
    print("🔍 Auto-checking for common issues...")
    print()
    
    issues_found = []
    
    # Check if Next.js server is running
    print("1. Checking Next.js dev server status...")
    try:
        result = subprocess.run(
            ["lsof", "-i:3000"], 
            capture_output=True, 
            text=True
        )
        if result.returncode == 0:
            print("   ✅ Next.js server is running on port 3000")
        else:
            print("   ❌ Next.js server NOT running on port 3000")
            issues_found.append("Next.js server not running")
    except:
        print("   ⚠️  Could not check server status")
    
    # Check for common log files
    print("\n2. Checking for error logs...")
    log_files = [
        ("nextjs.log", "Next.js log file"),
        ("npm-debug.log", "NPM debug log"),
        (".next/server/logs", "Next.js server logs"),
    ]
    
    for filepath, description in log_files:
        if os.path.exists(filepath):
            print(f"   ✅ Found: {description} ({filepath})")
            # Count lines with warnings/errors
            try:
                with open(filepath, 'r') as f:
                    content = f.read()
                    warnings = content.count("Warning:")
                    errors = content.count("Error:")
                    if warnings > 0 or errors > 0:
                        print(f"      Contains: {warnings} warnings, {errors} errors")
                        issues_found.append(f"{description} has {warnings} warnings, {errors} errors")
            except:
                pass
        else:
            print(f"   ❌ Not found: {description}")
    
    # Check git status for uncommitted changes
    print("\n3. Checking git status...")
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True,
            text=True,
            cwd=os.getcwd()
        )
        if result.stdout.strip():
            print("   ⚠️  There are uncommitted changes")
            issues_found.append("Uncommitted changes")
        else:
            print("   ✅ No uncommitted changes")
    except:
        print("   ⚠️  Could not check git status")
    
    # Generate summary
    print("\n" + "="*60)
    print("📊 AUTO-CHECK SUMMARY")
    print("="*60)
    
    if issues_found:
        print("🚨 Issues found:")
        for i, issue in enumerate(issues_found, 1):
            print(f"   {i}. {issue}")
        
        # Generate prompt for Cline
        generate_cline_prompt(issues_found)
    else:
        print("✅ No issues found automatically")
        print("\n💡 If you're seeing browser console warnings, please use")
        print("   the manual capture instructions below.")

def show_manual_instructions(output_dir):
    """Show manual instructions for capturing browser issues"""
    print("📋 MANUAL CAPTURE INSTRUCTIONS")
    print("="*60)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print(f"\n🚨 Jika Anda melihat console warnings di browser (misal: 6 issues):")
    print()
    
    print("1. 📸 CAPTURE SCREENSHOT")
    print("   - Buka browser DevTools (F12 atau Ctrl+Shift+I)")
    print("   - Pilih tab 'Console'")
    print("   - Screenshot semua warnings/errors")
    print("   - Save screenshot di folder: browser_issues/")
    print()
    
    print("2. 📝 COPY CONSOLE TEXT")
    print("   - Select semua text di console")
    print("   - Copy (Ctrl+C)")
    print("   - Paste ke file: console_warnings.txt")
    print()
    
    print("3. 🔍 IDENTIFY ISSUE TYPES")
    print("   Cek jenis warnings yang muncul:")
    print("   - React warnings (Warning: ...)")
    print("   - Deprecation warnings (DeprecationWarning: ...)")
    print("   - Network errors (Failed to fetch)")
    print("   - Console warnings (console.warn)")
    print("   - TypeScript/ESLint issues")
    print()
    
    print("4. 🎯 GENERATE CLINE PROMPT")
    print("   Berikut template prompt untuk Cline:")
    print("   (Copy dan paste ke Cline Plan Mode)")
    print()
    
    # Generate template prompt
    generate_template_prompt(output_dir, timestamp)
    
    print("="*60)
    print("💡 Tips:")
    print("- Screenshot lebih baik dari text karena menunjukkan UI context")
    print("- Include URL di screenshot (address bar browser)")
    print("- Capture React component stack traces jika ada")
    print("- Save semua screenshots dengan timestamp")
    print()

def generate_template_prompt(output_dir, timestamp):
    """Generate template prompt for Cline"""
    template = f"""# [PLAN MODE REQUEST] - BROWSER CONSOLE ISSUES ANALYSIS
## Task: Fix browser console warnings in Social Forestry Information System (sisinfops)

## 🔴 ISSUE DETAILS
**Timestamp**: {timestamp}
**Environment**: Development (Next.js dev server)
**Browser**: [Your browser: Chrome/Firefox/etc]
**URL**: http://localhost:3000/[page-where-issues-occur]
**Number of Issues**: [e.g., 6 console warnings]

## 📸 SCREENSHOTS & LOGS
**Screenshot saved at**: {output_dir}/[screenshot-filename].png
**Console log saved at**: {output_dir}/console_warnings.txt

## 📋 CONSOLE WARNINGS SUMMARY
[Paste console warnings here or describe them]
Example:
1. Warning: React warning about key props
2. Warning: Deprecated API usage
3. Error: Network request failed
4. Warning: Performance issue detected
5. Warning: Memory leak detected
6. Warning: ESLint/TypeScript issue

## 🎯 EXPECTED BEHAVIOR
No console warnings in browser during development.

## 🚨 CURRENT BEHAVIOR
Multiple console warnings appear when accessing the application.

## 🔍 FILES TO CHECK
1. Check React components mentioned in warnings
2. Check API calls that might be failing
3. Check imports and dependencies
4. Check TypeScript configuration
5. Check recent changes to the codebase

## 🛠️ REQUESTED ANALYSIS
Please analyze:
1. What are the root causes of these console warnings?
2. Which specific files need to be fixed?
3. Step-by-step instructions to resolve each warning
4. Any potential side effects of the fixes

## 📁 PROJECT STRUCTURE
- Next.js application with TypeScript
- Supabase for database
- Social Forestry Information System (sisinfops)
- Located at: {os.getcwd()}

## 🚀 MODE: Plan Mode
Please provide a comprehensive plan to fix all console warnings.
"""
    
    # Save template to file
    template_file = os.path.join(output_dir, "cline_prompt_template.txt")
    with open(template_file, 'w', encoding='utf-8') as f:
        f.write(template)
    
    print(template)
    print(f"\n📝 Template saved to: {template_file}")
    print("   Copy the above text and paste into Cline Plan Mode")

def generate_cline_prompt(issues_found):
    """Generate Cline prompt from auto-check issues"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    prompt = f"""# [PLAN MODE REQUEST] - AUTO-DETECTED ISSUES ANALYSIS
## Task: Fix issues detected in Social Forestry Information System (sisinfops)

## 🔴 AUTO-DETECTED ISSUES ({timestamp})
"""
    
    for i, issue in enumerate(issues_found, 1):
        prompt += f"{i}. {issue}\n"
    
    prompt += f"""
## 📊 PROJECT STATUS
**Project**: {os.path.basename(os.getcwd())}
**Time**: {timestamp}
**Issues Found**: {len(issues_found)}

## 🎯 REQUESTED ANALYSIS
Please analyze:
1. What could be causing these issues?
2. How to investigate each issue systematically?
3. Priority order for fixing issues
4. Step-by-step resolution plan

## 📁 PROJECT STRUCTURE
- Next.js application with TypeScript
- Supabase for database
- Social Forestry Information System
- Located at: {os.getcwd()}

## 🚀 MODE: Plan Mode
Please provide a comprehensive analysis and fix plan.
"""
    
    # Save prompt to file
    prompt_dir = ".cline_prompts"
    os.makedirs(prompt_dir, exist_ok=True)
    
    prompt_file = os.path.join(prompt_dir, f"auto_issues_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
    with open(prompt_file, 'w', encoding='utf-8') as f:
        f.write(prompt)
    
    print(f"\n📝 Auto-generated prompt saved to: {prompt_file}")
    print("   Copy and paste this into Cline Plan Mode for analysis")

if __name__ == "__main__":
    main()