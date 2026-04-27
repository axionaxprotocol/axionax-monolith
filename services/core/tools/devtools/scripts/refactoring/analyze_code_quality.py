#!/usr/bin/env python3
"""
Advanced Code Quality Analyzer
Analyze code quality and recommend refactoring
"""

import os
import sys
import re
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple

# ANSI Colors
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BLUE = '\033[94m'
MAGENTA = '\033[95m'
RESET = '\033[0m'
BOLD = '\033[1m'

class CodeQualityAnalyzer:
    def __init__(self, workspace_root: str):
        self.workspace_root = Path(workspace_root)
        self.issues = defaultdict(list)
        self.stats = defaultdict(dict)

    def analyze_typescript_file(self, file_path: Path) -> Dict:
        """Analyze TypeScript file"""
        issues = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
            
            # 1. Check function length
            function_pattern = r'(async\s+)?function\s+\w+|const\s+\w+\s*=\s*(async\s+)?\([^)]*\)\s*=>'
            functions = list(re.finditer(function_pattern, content))
            
            for match in functions:
                # Count function lines (estimation)
                start_pos = match.start()
                brace_count = 0
                func_lines = 0
                
                for i, char in enumerate(content[start_pos:]):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            func_lines = content[start_pos:start_pos+i].count('\n')
                            break
                
                if func_lines > 50:
                    issues.append(f"Function too long ({func_lines} lines) - should be split into smaller functions")
            
            # 2. Check for magic numbers
            magic_numbers = re.findall(r'\b\d{2,}\b', content)
            if len(magic_numbers) > 5:
                issues.append(f"Too many magic numbers ({len(magic_numbers)}) - should create constants")
            
            # 3. Check for nested if statements
            max_nesting = 0
            current_nesting = 0
            for line in lines:
                if re.search(r'\bif\s*\(', line):
                    current_nesting += 1
                    max_nesting = max(max_nesting, current_nesting)
                elif line.strip().startswith('}'):
                    current_nesting = max(0, current_nesting - 1)
            
            if max_nesting > 3:
                issues.append(f"Nested if too deep (level {max_nesting}) - should use early return or refactor")
            
            # 4. Check for TODO/FIXME comments
            todos = len(re.findall(r'//\s*TODO|//\s*FIXME|//\s*XXX', content, re.IGNORECASE))
            if todos > 0:
                issues.append(f"Has TODO/FIXME comments {todos} occurrences - should fix or create issues")
            
            # 5. Check for commented code
            commented_lines = [l for l in lines if re.match(r'^\s*//', l) and len(l.strip()) > 10]
            if len(commented_lines) > 10:
                issues.append(f"Too much commented code ({len(commented_lines)} lines) - should be removed")
            
            # 6. Check for any types
            any_count = len(re.findall(r':\s*any\b', content))
            if any_count > 0:
                issues.append(f"Using 'any' type {any_count} occurrences - should specify explicit types")
            
            # 7. Check for empty try-catch blocks
            empty_catch = len(re.findall(r'catch\s*\([^)]*\)\s*\{\s*\}', content))
            if empty_catch > 0:
                issues.append(f"Has empty catch blocks {empty_catch} occurrences - should handle errors")
            
            return {
                'lines': len(lines),
                'functions': len(functions),
                'issues': issues,
                'any_count': any_count,
                'todos': todos
            }
            
        except Exception as e:
            return {'error': str(e)}

    def analyze_rust_file(self, file_path: Path) -> Dict:
        """Analyze Rust file"""
        issues = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
            
            # 1. Check for unwrap() and expect()
            unwraps = len(re.findall(r'\.unwrap\(\)', content))
            expects = len(re.findall(r'\.expect\(', content))
            
            if unwraps > 5:
                issues.append(f"Excessive .unwrap() usage ({unwraps} occurrences) - should use ? operator or proper error handling")
            
            if expects > 5:
                issues.append(f"Excessive .expect() usage ({expects} occurrences) - consider better error handling")
            
            # 2. Check for excessive clone()
            clones = len(re.findall(r'\.clone\(\)', content))
            if clones > 10:
                issues.append(f"Excessive .clone() usage ({clones} occurrences) - consider using borrowing and lifetimes")
            
            # 3. Check for TODO comments
            todos = len(re.findall(r'//\s*TODO|//\s*FIXME', content, re.IGNORECASE))
            if todos > 0:
                issues.append(f"Has TODO/FIXME comments {todos} occurrences")
            
            # 4. Check for unsafe blocks
            unsafe_blocks = len(re.findall(r'\bunsafe\s*\{', content))
            if unsafe_blocks > 0:
                issues.append(f"Has unsafe blocks {unsafe_blocks} occurrences - verify necessity")
            
            # 5. Check for pub without documentation
            pub_items = re.findall(r'^pub\s+(fn|struct|enum|trait|mod)\s+\w+', content, re.MULTILINE)
            documented = len(re.findall(r'///[^\n]*\n\s*pub', content))
            
            if len(pub_items) > documented + 2:
                issues.append(f"Public items without documentation: {len(pub_items) - documented} items")
            
            return {
                'lines': len(lines),
                'unwraps': unwraps,
                'expects': expects,
                'clones': clones,
                'issues': issues,
                'todos': todos,
                'unsafe_blocks': unsafe_blocks
            }
            
        except Exception as e:
            return {'error': str(e)}

    def analyze_repository(self, repo_name: str, repo_path: Path, repo_type: str):
        """Analyze entire repository"""
        print(f"\n{BOLD}{BLUE}Analyzing {repo_name}...{RESET}")
        
        total_files = 0
        total_lines = 0
        all_issues = []
        
        if repo_type == 'typescript':
            # Analyze TypeScript files
            for file_path in repo_path.glob('src/**/*.ts'):
                if file_path.name.endswith('.d.ts'):
                    continue
                
                result = self.analyze_typescript_file(file_path)
                if 'error' not in result:
                    total_files += 1
                    total_lines += result['lines']
                    
                    if result['issues']:
                        for issue in result['issues']:
                            all_issues.append(f"{file_path.name}: {issue}")
            
            # Analyze TSX files
            for file_path in repo_path.glob('src/**/*.tsx'):
                result = self.analyze_typescript_file(file_path)
                if 'error' not in result:
                    total_files += 1
                    total_lines += result['lines']
                    
                    if result['issues']:
                        for issue in result['issues']:
                            all_issues.append(f"{file_path.name}: {issue}")
        
        elif repo_type == 'rust':
            # Analyze Rust files
            for file_path in repo_path.glob('**/*.rs'):
                if 'target' in str(file_path):
                    continue
                
                result = self.analyze_rust_file(file_path)
                if 'error' not in result:
                    total_files += 1
                    total_lines += result['lines']
                    
                    if result['issues']:
                        for issue in result['issues']:
                            all_issues.append(f"{file_path.name}: {issue}")
        
        # Save stats
        self.stats[repo_name] = {
            'files': total_files,
            'lines': total_lines,
            'issues': len(all_issues)
        }
        
        # Print results
        print(f"  📁 Files: {total_files}")
        print(f"  📝 Lines: {total_lines:,}")
        print(f"  {'🟢' if len(all_issues) == 0 else '🟡' if len(all_issues) < 10 else '🔴'} Issues: {len(all_issues)}")
        
        if all_issues:
            print(f"\n  {YELLOW}Issues found:{RESET}")
            for i, issue in enumerate(all_issues[:10], 1):  # show first 10 items only
                print(f"    {i}. {issue}")
            
            if len(all_issues) > 10:
                print(f"    ... and {len(all_issues) - 10} items")
            
            self.issues[repo_name] = all_issues

    def print_summary(self):
        """Print summary"""
        print(f"\n{BOLD}{'='*80}{RESET}")
        print(f"{BOLD}📊 Code Quality Summary{RESET}")
        print(f"{BOLD}{'='*80}{RESET}")
        
        total_files = sum(s['files'] for s in self.stats.values())
        total_lines = sum(s['lines'] for s in self.stats.values())
        total_issues = sum(s['issues'] for s in self.stats.values())
        
        print(f"\n{BOLD}Overall Statistics:{RESET}")
        print(f"  Total Repositories: {len(self.stats)}")
        print(f"  Total Files: {total_files}")
        print(f"  Total Lines: {total_lines:,}")
        print(f"  Total Issues: {total_issues}")
        
        if total_issues > 0:
            print(f"\n{BOLD}Top Issues by Repository:{RESET}")
            sorted_repos = sorted(self.stats.items(), key=lambda x: x[1]['issues'], reverse=True)
            
            for repo_name, stats in sorted_repos[:5]:
                if stats['issues'] > 0:
                    color = GREEN if stats['issues'] < 5 else YELLOW if stats['issues'] < 20 else RED
                    print(f"  {color}• {repo_name}: {stats['issues']} issues{RESET}")
        
        print(f"\n{BOLD}{'='*80}{RESET}")
        print(f"{BOLD}💡 Refactoring Priorities:{RESET}")
        print(f"  1. 🔴 High: Empty catch blocks, unsafe code, magic numbers")
        print(f"  2. 🟡 Medium: Long functions, deep nesting, excessive .clone()")
        print(f"  3. 🟢 Low: TODOs, commented code, missing docs")
        print(f"{BOLD}{'='*80}{RESET}\n")

def main():
    workspace = os.getcwd()
    
    print(f"{BOLD}{MAGENTA}🔍 Axionax Code Quality Analyzer{RESET}")
    print(f"Workspace: {workspace}\n")
    
    analyzer = CodeQualityAnalyzer(workspace)
    
    repos = {
        'axionax-core': {'type': 'rust', 'path': Path(workspace) / 'axionax-core'},
        'axionax-sdk-ts': {'type': 'typescript', 'path': Path(workspace) / 'axionax-sdk-ts'},
        'axionax-web': {'type': 'typescript', 'path': Path(workspace) / 'axionax-web'},
        'axionax-marketplace': {'type': 'typescript', 'path': Path(workspace) / 'axionax-marketplace'}
    }
    
    for repo_name, repo_info in repos.items():
        if repo_info['path'].exists():
            analyzer.analyze_repository(repo_name, repo_info['path'], repo_info['type'])
    
    analyzer.print_summary()

if __name__ == '__main__':
    main()
