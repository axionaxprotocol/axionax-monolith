#!/usr/bin/env python3
"""
Axionax Protocol Code Refactoring and Cleaning Tool
Tool for refactoring and cleaning code across the entire protocol
"""

import os
import sys
import re
import json
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Set

# ANSI Colors
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BLUE = '\033[94m'
MAGENTA = '\033[95m'
CYAN = '\033[96m'
RESET = '\033[0m'
BOLD = '\033[1m'

class CodeRefactorCleaner:
    def __init__(self, workspace_root: str):
        self.workspace_root = Path(workspace_root)
        self.repos = {
            'axionax-core': {'type': 'rust', 'path': self.workspace_root / 'axionax-core'},
            'axionax-sdk-ts': {'type': 'typescript', 'path': self.workspace_root / 'axionax-sdk-ts'},
            'axionax-web': {'type': 'typescript', 'path': self.workspace_root / 'axionax-web'},
            'axionax-marketplace': {'type': 'typescript', 'path': self.workspace_root / 'axionax-marketplace'},
            'axionax-docs': {'type': 'documentation', 'path': self.workspace_root / 'axionax-docs'},
            'axionax-deploy': {'type': 'deployment', 'path': self.workspace_root / 'axionax-deploy'},
            'axionax-devtools': {'type': 'tools', 'path': self.workspace_root / 'axionax-devtools'}
        }
        self.changes = []
        self.errors = []

    def print_header(self):
        print(f"\n{BOLD}{'='*80}{RESET}")
        print(f"{BOLD}{MAGENTA}🔧 AXIONAX PROTOCOL CODE REFACTOR & CLEAN{RESET}")
        print(f"{BOLD}{'='*80}{RESET}")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Workspace: {self.workspace_root}")
        print(f"{BOLD}{'='*80}{RESET}\n")

    # ==================== GITIGNORE MANAGEMENT ====================
    
    def create_or_update_gitignore(self, repo_name: str, repo_info: dict):
        """Create or update .gitignore"""
        print(f"\n{CYAN}📝 Updating .gitignore for {repo_name}...{RESET}")
        
        gitignore_path = repo_info['path'] / '.gitignore'
        
        # Define patterns by type
        patterns = {
            'rust': [
                '# Rust',
                'target/',
                'Cargo.lock',
                '**/*.rs.bk',
                '*.pdb',
                '',
                '# IDE',
                '*.swp',
                '*.swo',
                '*~',
                '.vscode/',
                '.idea/',
                '',
                '# OS',
                '.DS_Store',
                'Thumbs.db',
                '',
                '# Node (for tools)',
                'node_modules/',
                'package-lock.json',
                '',
                '# Logs',
                '*.log',
                'npm-debug.log*',
                'yarn-debug.log*',
                'yarn-error.log*'
            ],
            'typescript': [
                '# Dependencies',
                'node_modules/',
                '',
                '# Build outputs',
                'dist/',
                'build/',
                '.next/',
                'out/',
                '',
                '# Environment',
                '.env',
                '.env.local',
                '.env.development.local',
                '.env.test.local',
                '.env.production.local',
                '',
                '# Logs',
                '*.log',
                'npm-debug.log*',
                'yarn-debug.log*',
                'yarn-error.log*',
                'lerna-debug.log*',
                '',
                '# IDE',
                '.vscode/',
                '.idea/',
                '*.swp',
                '*.swo',
                '*~',
                '',
                '# OS',
                '.DS_Store',
                'Thumbs.db',
                '',
                '# Testing',
                'coverage/',
                '.nyc_output/',
                '',
                '# Cache',
                '.cache/',
                '.parcel-cache/',
                '.eslintcache/'
            ],
            'documentation': [
                '# Python',
                '__pycache__/',
                '*.py[cod]',
                '*$py.class',
                '*.so',
                '.Python',
                '',
                '# Virtual Environment',
                'venv/',
                'env/',
                'ENV/',
                '.venv/',
                '',
                '# Build',
                'build/',
                'dist/',
                '_build/',
                '',
                '# IDE',
                '.vscode/',
                '.idea/',
                '*.swp',
                '*.swo',
                '',
                '# OS',
                '.DS_Store',
                'Thumbs.db',
                '',
                '# Logs',
                '*.log'
            ],
            'deployment': [
                '# Dependencies',
                'node_modules/',
                '',
                '# Environment',
                '.env',
                '.env.local',
                '.env.*.local',
                '',
                '# Logs',
                '*.log',
                'npm-debug.log*',
                '',
                '# Docker',
                '*.pid',
                '',
                '# IDE',
                '.vscode/',
                '.idea/',
                '',
                '# OS',
                '.DS_Store',
                'Thumbs.db',
                '',
                '# Certificates',
                '*.pem',
                '*.key',
                '*.crt'
            ],
            'tools': [
                '# Python',
                '__pycache__/',
                '*.py[cod]',
                '.venv/',
                'venv/',
                '',
                '# Node',
                'node_modules/',
                '',
                '# Logs',
                '*.log',
                '',
                '# IDE',
                '.vscode/',
                '.idea/',
                '',
                '# OS',
                '.DS_Store',
                'Thumbs.db'
            ]
        }
        
        repo_type = repo_info['type']
        new_content = '\n'.join(patterns.get(repo_type, ['node_modules/', '*.log']))
        
        # Check if .gitignore already exists
        if gitignore_path.exists():
            with open(gitignore_path, 'r', encoding='utf-8') as f:
                old_content = f.read()
            
            if old_content.strip() == new_content.strip():
                print(f"  ⏭️  No changes needed")
                return
        
        # Write file
        with open(gitignore_path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(new_content)
        
        self.changes.append(f"{repo_name}: updated .gitignore")
        print(f"  {GREEN}✓{RESET} Updated .gitignore")

    # ==================== TYPESCRIPT/JAVASCRIPT CLEANING ====================
    
    def clean_typescript_code(self, repo_name: str, repo_info: dict):
        """Clean TypeScript/JavaScript code"""
        if repo_info['type'] != 'typescript':
            return
        
        print(f"\n{CYAN}🧹 Cleaning TypeScript code in {repo_name}...{RESET}")
        
        src_dir = repo_info['path'] / 'src'
        if not src_dir.exists():
            print(f"  ⏭️  No src directory")
            return
        
        changes_made = 0
        
        # Find all .ts and .tsx files
        ts_files = list(src_dir.glob('**/*.ts')) + list(src_dir.glob('**/*.tsx'))
        
        for file_path in ts_files:
            if file_path.name.endswith('.d.ts'):
                continue  # skip type definition files
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                
                # 1. Remove leftover console.log (but keep console.error and console.warn)
                content = re.sub(r'^(\s*)console\.log\([^)]*\);?\s*$', '', content, flags=re.MULTILINE)
                
                # 2. Remove debugger statements
                content = re.sub(r'^(\s*)debugger;?\s*$', '', content, flags=re.MULTILINE)
                
                # 3. Remove duplicate empty lines (more than 2 consecutive)
                content = re.sub(r'\n{3,}', '\n\n', content)
                
                # 4. Remove trailing whitespace
                content = re.sub(r'[ \t]+$', '', content, flags=re.MULTILINE)
                
                # 5. Check unused imports (basic check)
                # Note: accurate unused import checking requires an AST parser
                
                # 6. Ensure file ends with newline
                if content and not content.endswith('\n'):
                    content += '\n'
                
                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                        f.write(content)
                    changes_made += 1
                    
            except Exception as e:
                self.errors.append(f"{repo_name}/{file_path.name}: {str(e)}")
        
        if changes_made > 0:
            self.changes.append(f"{repo_name}: cleaned {changes_made} TypeScript files")
            print(f"  {GREEN}✓{RESET} Cleaned {changes_made} files")
        else:
            print(f"  ⏭️  No changes")

    # ==================== RUST CODE CLEANING ====================
    
    def clean_rust_code(self, repo_name: str, repo_info: dict):
        """Clean Rust code"""
        if repo_info['type'] != 'rust':
            return
        
        print(f"\n{CYAN}🧹 Cleaning Rust code in {repo_name}...{RESET}")
        
        # Find all .rs files
        rs_files = list(repo_info['path'].glob('**/*.rs'))
        
        changes_made = 0
        
        for file_path in rs_files:
            # Skip target directory
            if 'target' in str(file_path):
                continue
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                
                # 1. Remove debug println! (but keep error! and warn!)
                # Note: this is basic cleaning; proper logging should be used instead
                
                # 2. Remove duplicate empty lines (more than 2 consecutive)
                content = re.sub(r'\n{3,}', '\n\n', content)
                
                # 3. Remove trailing whitespace
                content = re.sub(r'[ \t]+$', '', content, flags=re.MULTILINE)
                
                # 4. Ensure file ends with newline
                if content and not content.endswith('\n'):
                    content += '\n'
                
                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                        f.write(content)
                    changes_made += 1
                    
            except Exception as e:
                self.errors.append(f"{repo_name}/{file_path.name}: {str(e)}")
        
        if changes_made > 0:
            self.changes.append(f"{repo_name}: cleaned {changes_made} Rust files")
            print(f"  {GREEN}✓{RESET} Cleaned {changes_made} files")
        else:
            print(f"  ⏭️  No changes")

    # ==================== FORMATTING ====================
    
    def run_prettier(self, repo_name: str, repo_info: dict):
        """Run Prettier for TypeScript repos"""
        if repo_info['type'] != 'typescript':
            return
        
        print(f"\n{CYAN}💅 Running Prettier on {repo_name}...{RESET}")
        
        package_json = repo_info['path'] / 'package.json'
        if not package_json.exists():
            print(f"  ⏭️  No package.json")
            return
        
        # Check if prettier is available
        try:
            with open(package_json, 'r', encoding='utf-8') as f:
                pkg = json.load(f)
            
            dev_deps = pkg.get('devDependencies', {})
            if 'prettier' not in dev_deps:
                print(f"  ⏭️  No Prettier in devDependencies")
                return
            
            # Run prettier
            result = subprocess.run(
                ['npx', 'prettier', '--write', 'src/**/*.{ts,tsx,js,jsx,json}'],
                cwd=repo_info['path'],
                capture_output=True,
                text=True,
                shell=True
            )
            
            if result.returncode == 0:
                self.changes.append(f"{repo_name}: ran Prettier")
                print(f"  {GREEN}✓{RESET} Ran Prettier successfully")
            else:
                print(f"  {YELLOW}⚠{RESET}  Prettier: {result.stderr[:100]}")
                
        except Exception as e:
            self.errors.append(f"{repo_name} Prettier: {str(e)}")
            print(f"  {RED}✗{RESET} Error occurred: {str(e)}")

    def run_rustfmt(self, repo_name: str, repo_info: dict):
        """Run rustfmt for Rust repos"""
        if repo_info['type'] != 'rust':
            return
        
        print(f"\n{CYAN}💅 Running rustfmt on {repo_name}...{RESET}")
        
        try:
            result = subprocess.run(
                ['cargo', 'fmt', '--all'],
                cwd=repo_info['path'],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                self.changes.append(f"{repo_name}: ran rustfmt")
                print(f"  {GREEN}✓{RESET} Ran rustfmt successfully")
            else:
                print(f"  {YELLOW}⚠{RESET}  rustfmt: {result.stderr[:100]}")
                
        except FileNotFoundError:
            print(f"  {YELLOW}⚠{RESET}  rustfmt not installed")
        except Exception as e:
            self.errors.append(f"{repo_name} rustfmt: {str(e)}")
            print(f"  {RED}✗{RESET} Error occurred: {str(e)}")

    # ==================== LINTING ====================
    
    def run_eslint_fix(self, repo_name: str, repo_info: dict):
        """Run ESLint --fix for TypeScript repos"""
        if repo_info['type'] != 'typescript':
            return
        
        print(f"\n{CYAN}🔍 Running ESLint --fix on {repo_name}...{RESET}")
        
        package_json = repo_info['path'] / 'package.json'
        if not package_json.exists():
            print(f"  ⏭️  No package.json")
            return
        
        try:
            # Run eslint --fix
            result = subprocess.run(
                ['npx', 'eslint', 'src', '--ext', '.ts,.tsx,.js,.jsx', '--fix'],
                cwd=repo_info['path'],
                capture_output=True,
                text=True,
                shell=True
            )
            
            # ESLint may return non-zero if errors remain after fix
            if "error" not in result.stdout.lower() or result.returncode == 0:
                self.changes.append(f"{repo_name}: ran ESLint --fix")
                print(f"  {GREEN}✓{RESET} Ran ESLint --fix successfully")
            else:
                print(f"  {YELLOW}⚠{RESET}  ESLint found some errors that cannot be auto-fixed")
                
        except Exception as e:
            print(f"  {YELLOW}⚠{RESET}  Skipping ESLint (may not be installed)")

    def run_clippy_fix(self, repo_name: str, repo_info: dict):
        """Run clippy --fix for Rust repos"""
        if repo_info['type'] != 'rust':
            return
        
        print(f"\n{CYAN}🔍 Running cargo clippy --fix on {repo_name}...{RESET}")
        
        try:
            result = subprocess.run(
                ['cargo', 'clippy', '--fix', '--allow-dirty', '--allow-staged'],
                cwd=repo_info['path'],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                self.changes.append(f"{repo_name}: ran clippy --fix")
                print(f"  {GREEN}✓{RESET} Ran clippy --fix successfully")
            else:
                print(f"  {YELLOW}⚠{RESET}  clippy: {result.stderr[:100]}")
                
        except FileNotFoundError:
            print(f"  {YELLOW}⚠{RESET}  cargo clippy not installed")
        except Exception as e:
            self.errors.append(f"{repo_name} clippy: {str(e)}")
            print(f"  {RED}✗{RESET} Error occurred: {str(e)}")

    # ==================== UNUSED CODE DETECTION ====================
    
    def detect_unused_files(self, repo_name: str, repo_info: dict):
        """Detect unused files"""
        print(f"\n{CYAN}🔎 Detecting unused files in {repo_name}...{RESET}")
        
        unused = []
        
        # Check for suspicious files
        suspicious_patterns = [
            '*.backup',
            '*.bak',
            '*.old',
            '*.tmp',
            '*~',
            '*.swp',
            '*.swo'
        ]
        
        for pattern in suspicious_patterns:
            for file_path in repo_info['path'].glob(f'**/{pattern}'):
                # Skip node_modules and target
                if 'node_modules' in str(file_path) or 'target' in str(file_path):
                    continue
                unused.append(file_path)
        
        if unused:
            print(f"  {YELLOW}⚠{RESET}  Found potentially unused files: {len(unused)} files")
            for file_path in unused[:5]:  # show first 5 files only
                print(f"     - {file_path.relative_to(repo_info['path'])}")
            if len(unused) > 5:
                print(f"     ... and {len(unused) - 5} files")
        else:
            print(f"  {GREEN}✓{RESET} No suspicious files found")

    # ==================== DOCUMENTATION ====================
    
    def check_documentation(self, repo_name: str, repo_info: dict):
        """Check documentation"""
        print(f"\n{CYAN}📚 Checking documentation in {repo_name}...{RESET}")
        
        readme = repo_info['path'] / 'README.md'
        issues = []
        
        if not readme.exists():
            issues.append("Missing README.md")
        else:
            with open(readme, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check for important sections
            required_sections = ['installation', 'usage', 'development']
            missing = [s for s in required_sections if s.lower() not in content.lower()]
            
            if missing:
                issues.append(f"Missing sections: {', '.join(missing)}")
            
            if len(content) < 200:
                issues.append("README.md is too short")
        
        if issues:
            print(f"  {YELLOW}⚠{RESET}  Issues found:")
            for issue in issues:
                print(f"     - {issue}")
        else:
            print(f"  {GREEN}✓{RESET} Documentation looks good")

    # ==================== MAIN EXECUTION ====================
    
    def run_all_refactoring(self, skip_formatting: bool = False, skip_linting: bool = False):
        """Run all refactoring and cleaning"""
        self.print_header()
        
        for repo_name, repo_info in self.repos.items():
            if not repo_info['path'].exists():
                print(f"{RED}⚠ Skipping {repo_name}: directory not found{RESET}")
                continue
            
            print(f"\n{BOLD}{BLUE}{'='*80}{RESET}")
            print(f"{BOLD}{BLUE}Processing: {repo_name}{RESET}")
            print(f"{BOLD}{BLUE}{'='*80}{RESET}")
            
            # 1. Update .gitignore
            self.create_or_update_gitignore(repo_name, repo_info)
            
            # 2. Clean code
            if repo_info['type'] == 'typescript':
                self.clean_typescript_code(repo_name, repo_info)
            elif repo_info['type'] == 'rust':
                self.clean_rust_code(repo_name, repo_info)
            
            # 3. Format code
            if not skip_formatting:
                if repo_info['type'] == 'typescript':
                    self.run_prettier(repo_name, repo_info)
                elif repo_info['type'] == 'rust':
                    self.run_rustfmt(repo_name, repo_info)
            
            # 4. Lint and fix
            if not skip_linting:
                if repo_info['type'] == 'typescript':
                    self.run_eslint_fix(repo_name, repo_info)
                elif repo_info['type'] == 'rust':
                    self.run_clippy_fix(repo_name, repo_info)
            
            # 5. Detect unused files
            self.detect_unused_files(repo_name, repo_info)
            
            # 6. Check documentation
            self.check_documentation(repo_name, repo_info)

    def print_summary(self):
        """Print summary"""
        print(f"\n{BOLD}{'='*80}{RESET}")
        print(f"{BOLD}📊 Refactor & Clean Summary{RESET}")
        print(f"{BOLD}{'='*80}{RESET}")
        
        if self.changes:
            print(f"\n{GREEN}✅ Changes ({len(self.changes)} items):{RESET}")
            for i, change in enumerate(self.changes, 1):
                print(f"  {i}. {change}")
        else:
            print(f"\n{YELLOW}⚠  No changes{RESET}")
        
        if self.errors:
            print(f"\n{RED}❌ Errors ({len(self.errors)} items):{RESET}")
            for i, error in enumerate(self.errors, 1):
                print(f"  {i}. {error}")
        
        print(f"\n{BOLD}{'='*80}{RESET}")
        print(f"{BOLD}💡 Next Recommendations:{RESET}")
        print(f"  1. Review changes with: git diff")
        print(f"  2. Test build: npm run build (TypeScript) or cargo build (Rust)")
        print(f"  3. Run tests: npm test or cargo test")
        print(f"  4. Commit Changes: git add -A && git commit -m 'refactor: clean and format code'")
        print(f"{BOLD}{'='*80}{RESET}\n")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Axionax Protocol Code Refactoring & Cleaning Tool')
    parser.add_argument('--skip-formatting', action='store_true', help='Skip code formatting')
    parser.add_argument('--skip-linting', action='store_true', help='Skip linting and fixing')
    parser.add_argument('--repo', type=str, help='Specify repo to refactor (if not specified, refactor all)')
    
    args = parser.parse_args()
    
    workspace = os.getcwd()
    
    print(f"{BOLD}{MAGENTA}🔧 Axionax Protocol Refactor & Clean Tool{RESET}")
    print(f"Workspace: {workspace}\n")
    
    cleaner = CodeRefactorCleaner(workspace)
    
    if args.repo:
        # Refactor only specified repo
        if args.repo in cleaner.repos:
            repo_info = cleaner.repos[args.repo]
            print(f"Refactoring only: {args.repo}")
            # TODO: Implement single repo refactoring
        else:
            print(f"{RED}Error: Repo not found '{args.repo}'{RESET}")
            sys.exit(1)
    else:
        # Refactor all
        cleaner.run_all_refactoring(
            skip_formatting=args.skip_formatting,
            skip_linting=args.skip_linting
        )
    
    cleaner.print_summary()

if __name__ == '__main__':
    main()
