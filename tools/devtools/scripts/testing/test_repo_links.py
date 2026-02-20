#!/usr/bin/env python3
"""
Test Repository Direct Links
Tests direct linking between repositories
without using workspace or contributors
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

# ANSI Colors
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'

class RepoLinkTester:
    def __init__(self, workspace_root: str):
        self.workspace_root = Path(workspace_root)
        self.repos = {
            'axionax-core': {
                'path': self.workspace_root / 'axionax-core',
                'type': 'rust',
                'dependencies': []
            },
            'axionax-sdk-ts': {
                'path': self.workspace_root / 'axionax-sdk-ts',
                'type': 'typescript',
                'dependencies': []
            },
            'axionax-web': {
                'path': self.workspace_root / 'axionax-web',
                'type': 'typescript',
                'dependencies': ['@axionax/sdk']
            },
            'axionax-marketplace': {
                'path': self.workspace_root / 'axionax-marketplace',
                'type': 'typescript',
                'dependencies': ['@axionax/sdk']
            },
            'axionax-docs': {
                'path': self.workspace_root / 'axionax-docs',
                'type': 'documentation',
                'dependencies': []
            },
            'axionax-deploy': {
                'path': self.workspace_root / 'axionax-deploy',
                'type': 'deployment',
                'dependencies': ['@axionax/sdk']
            },
            'axionax-devtools': {
                'path': self.workspace_root / 'axionax-devtools',
                'type': 'tools',
                'dependencies': []
            }
        }
        self.results = []
        self.summary = {
            'total_tests': 0,
            'passed': 0,
            'failed': 0,
            'warnings': 0
        }

    def print_header(self):
        """Print report header"""
        print(f"\n{BOLD}{'='*80}{RESET}")
        print(f"{BOLD}{BLUE}AXIONAX REPOSITORY DIRECT LINK TEST{RESET}")
        print(f"{BOLD}{'='*80}{RESET}")
        print(f"Test time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Workspace: {self.workspace_root}")
        print(f"{BOLD}{'='*80}{RESET}\n")

    def test_package_json_links(self, repo_name: str, repo_info: dict) -> dict:
        """Test links in package.json"""
        test_name = f"{repo_name}: Package.json Dependencies"
        package_json_path = repo_info['path'] / 'package.json'
        
        if not package_json_path.exists():
            return {
                'test': test_name,
                'status': 'skip',
                'message': 'No package.json',
                'details': {}
            }
        
        try:
            with open(package_json_path, 'r', encoding='utf-8') as f:
                package_data = json.load(f)
            
            dependencies = package_data.get('dependencies', {})
            dev_dependencies = package_data.get('devDependencies', {})
            all_deps = {**dependencies, **dev_dependencies}
            
            # Check @axionax/sdk dependencies
            axionax_deps = {k: v for k, v in all_deps.items() if '@axionax' in k}
            
            if not axionax_deps:
                return {
                    'test': test_name,
                    'status': 'skip',
                    'message': 'No @axionax dependencies',
                    'details': {}
                }
            
            link_results = []
            has_workspace_link = False
            has_npm_link = False
            has_file_link = False
            
            for dep_name, dep_version in axionax_deps.items():
                link_type = 'unknown'
                is_valid = False
                target_repo = None
                
                if dep_version.startswith('workspace:'):
                    link_type = 'workspace'
                    has_workspace_link = True
                    is_valid = False  # workspace link not desired
                    
                elif dep_version.startswith('file:'):
                    link_type = 'file'
                    has_file_link = True
                    # Check if the path points to an actual repo
                    target_path = dep_version.replace('file:', '')
                    full_path = (repo_info['path'] / target_path).resolve()
                    
                    # Find the referenced repo
                    for rname, rinfo in self.repos.items():
                        if rinfo['path'].resolve() == full_path:
                            target_repo = rname
                            # Check if that repo has package.json
                            target_pkg = rinfo['path'] / 'package.json'
                            if target_pkg.exists():
                                is_valid = True
                            break
                    
                elif dep_version.startswith('http://') or dep_version.startswith('https://'):
                    link_type = 'github'
                    has_npm_link = True
                    is_valid = True  # GitHub link considered valid
                    
                elif dep_version.startswith('git+'):
                    link_type = 'git'
                    has_npm_link = True
                    is_valid = True
                    
                else:
                    # Version number (from npm registry)
                    link_type = 'npm'
                    has_npm_link = True
                    is_valid = False  # @axionax/sdk not yet published on npm
                
                link_results.append({
                    'dependency': dep_name,
                    'version': dep_version,
                    'link_type': link_type,
                    'is_valid': is_valid,
                    'target_repo': target_repo
                })
            
            # Evaluate results
            all_valid = all(lr['is_valid'] for lr in link_results)
            
            if all_valid and has_file_link and not has_workspace_link:
                status = 'pass'
                message = f'✓ Using file: link to repo directly ({len(link_results)} dependencies)'
            elif has_workspace_link:
                status = 'fail'
                message = '✗ Using workspace: link (should not be used)'
            elif has_npm_link and not has_file_link:
                status = 'warn'
                message = '⚠ Using npm/github link instead of file: link'
            elif not all_valid:
                status = 'fail'
                message = '✗ Has dependencies with incorrect links'
            else:
                status = 'warn'
                message = '⚠ No clear dependencies'
            
            return {
                'test': test_name,
                'status': status,
                'message': message,
                'details': {
                    'total_deps': len(link_results),
                    'valid_links': sum(1 for lr in link_results if lr['is_valid']),
                    'has_workspace_link': has_workspace_link,
                    'has_file_link': has_file_link,
                    'has_npm_link': has_npm_link,
                    'links': link_results
                }
            }
            
        except Exception as e:
            return {
                'test': test_name,
                'status': 'fail',
                'message': f'✗ Error occurred: {str(e)}',
                'details': {}
            }

    def test_cargo_toml_links(self, repo_name: str, repo_info: dict) -> dict:
        """Test links in Cargo.toml"""
        test_name = f"{repo_name}: Cargo.toml Dependencies"
        cargo_toml_path = repo_info['path'] / 'Cargo.toml'
        
        if not cargo_toml_path.exists():
            return {
                'test': test_name,
                'status': 'skip',
                'message': 'No Cargo.toml',
                'details': {}
            }
        
        try:
            with open(cargo_toml_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if it's a workspace
            is_workspace = '[workspace]' in content
            
            if is_workspace:
                # Check workspace members
                import re
                members_match = re.search(r'\[workspace\]\s*members\s*=\s*\[(.*?)\]', content, re.DOTALL)
                
                if members_match:
                    members_str = members_match.group(1)
                    members = [m.strip().strip('"\'') for m in members_str.split(',') if m.strip()]
                    
                    # Check if all members actually exist
                    valid_members = []
                    invalid_members = []
                    
                    for member in members:
                        member_path = repo_info['path'] / member / 'Cargo.toml'
                        if member_path.exists():
                            valid_members.append(member)
                        else:
                            invalid_members.append(member)
                    
                    if invalid_members:
                        status = 'fail'
                        message = f'✗ Has workspace members that do not exist: {invalid_members}'
                    else:
                        status = 'pass'
                        message = f'✓ All workspace members are valid ({len(valid_members)} members)'
                    
                    return {
                        'test': test_name,
                        'status': status,
                        'message': message,
                        'details': {
                            'is_workspace': True,
                            'total_members': len(members),
                            'valid_members': valid_members,
                            'invalid_members': invalid_members
                        }
                    }
            
            # Check dependencies that use path
            import re
            path_deps = re.findall(r'(\w+)\s*=\s*\{[^}]*path\s*=\s*["\']([^"\']+)["\']', content)
            
            if not path_deps:
                return {
                    'test': test_name,
                    'status': 'skip',
                    'message': 'No path dependencies',
                    'details': {'is_workspace': is_workspace}
                }
            
            link_results = []
            for dep_name, dep_path in path_deps:
                full_path = (repo_info['path'] / dep_path).resolve()
                target_cargo = full_path / 'Cargo.toml'
                
                is_valid = target_cargo.exists()
                target_repo = None
                
                # Find the referenced repo
                for rname, rinfo in self.repos.items():
                    if str(full_path).startswith(str(rinfo['path'])):
                        target_repo = rname
                        break
                
                link_results.append({
                    'dependency': dep_name,
                    'path': dep_path,
                    'is_valid': is_valid,
                    'target_repo': target_repo
                })
            
            all_valid = all(lr['is_valid'] for lr in link_results)
            
            if all_valid:
                status = 'pass'
                message = f'✓ All path dependencies are valid ({len(link_results)} deps)'
            else:
                status = 'fail'
                invalid_deps = [lr['dependency'] for lr in link_results if not lr['is_valid']]
                message = f'✗ Has dependencies with incorrect links: {invalid_deps}'
            
            return {
                'test': test_name,
                'status': status,
                'message': message,
                'details': {
                    'is_workspace': is_workspace,
                    'total_deps': len(link_results),
                    'valid_links': sum(1 for lr in link_results if lr['is_valid']),
                    'links': link_results
                }
            }
            
        except Exception as e:
            return {
                'test': test_name,
                'status': 'fail',
                'message': f'✗ Error occurred: {str(e)}',
                'details': {}
            }

    def test_import_resolution(self, repo_name: str, repo_info: dict) -> dict:
        """Test that imports can be resolved directly without going through workspace"""
        test_name = f"{repo_name}: Import Resolution (Direct)"
        
        if repo_info['type'] not in ['typescript', 'rust']:
            return {
                'test': test_name,
                'status': 'skip',
                'message': 'Not a TypeScript/Rust repo',
                'details': {}
            }
        
        # For TypeScript repos
        if repo_info['type'] == 'typescript':
            # Check if it has its own node_modules
            node_modules = repo_info['path'] / 'node_modules'
            root_node_modules = self.workspace_root / 'node_modules'
            
            # Allow using node_modules from workspace root (for monorepo)
            if not node_modules.exists() and not root_node_modules.exists():
                # Check if it has dependencies
                package_json = repo_info['path'] / 'package.json'
                if package_json.exists():
                    with open(package_json, 'r', encoding='utf-8') as f:
                        pkg = json.load(f)
                    deps = pkg.get('dependencies', {})
                    if deps:
                        return {
                            'test': test_name,
                            'status': 'fail',
                            'message': '✗ Has dependencies but no node_modules (need npm install)',
                            'details': {'dependencies': list(deps.keys())}
                        }
            
            # If there's node_modules at root (workspace mode)
            if not node_modules.exists() and root_node_modules.exists():
                return {
                    'test': test_name,
                    'status': 'pass',
                    'message': '✓ Using node_modules from workspace root (monorepo pattern)',
                    'details': {
                        'uses_workspace_node_modules': True,
                        'workspace_node_modules': str(root_node_modules)
                    }
                }
            
            # Check if @axionax/sdk is in node_modules
            axionax_sdk = node_modules / '@axionax' / 'sdk'
            
            if axionax_sdk.exists():
                # Check if it's a symlink or actual directory
                is_symlink = axionax_sdk.is_symlink()
                
                if is_symlink:
                    real_path = axionax_sdk.resolve()
                    # Check if symlink points to the actual repo
                    is_valid = (real_path.parent.parent == self.workspace_root / 'axionax-sdk-ts')
                    
                    return {
                        'test': test_name,
                        'status': 'pass' if is_valid else 'warn',
                        'message': f'{"✓" if is_valid else "⚠"} @axionax/sdk is a symlink to {real_path.parent.parent.name}',
                        'details': {
                            'is_symlink': True,
                            'target': str(real_path),
                            'is_valid': is_valid
                        }
                    }
                else:
                    # Not a symlink but a directory
                    return {
                        'test': test_name,
                        'status': 'warn',
                        'message': '⚠ @axionax/sdk is a copied directory (not a link)',
                        'details': {'is_symlink': False}
                    }
            else:
                # No @axionax/sdk
                return {
                    'test': test_name,
                    'status': 'skip',
                    'message': 'No @axionax/sdk dependency',
                    'details': {}
                }
        
        return {
            'test': test_name,
            'status': 'skip',
            'message': 'This test type not yet supported',
            'details': {}
        }

    def run_all_tests(self):
        """Run all tests"""
        self.print_header()
        
        for repo_name, repo_info in self.repos.items():
            if not repo_info['path'].exists():
                print(f"{YELLOW}⚠ Skipping {repo_name}: directory not found{RESET}")
                continue
            
            print(f"\n{BOLD}{BLUE}Testing: {repo_name}{RESET}")
            print(f"{'─'*80}")
            
            # Test 1: Package.json links
            result1 = self.test_package_json_links(repo_name, repo_info)
            self.print_test_result(result1)
            self.results.append(result1)
            
            # Test 2: Cargo.toml links
            result2 = self.test_cargo_toml_links(repo_name, repo_info)
            self.print_test_result(result2)
            self.results.append(result2)
            
            # Test 3: Import resolution
            result3 = self.test_import_resolution(repo_name, repo_info)
            self.print_test_result(result3)
            self.results.append(result3)
            
            self.summary['total_tests'] += 3

    def print_test_result(self, result: dict):
        """Print test result"""
        status = result['status']
        
        if status == 'pass':
            color = GREEN
            self.summary['passed'] += 1
            icon = '✅'
        elif status == 'fail':
            color = RED
            self.summary['failed'] += 1
            icon = '❌'
        elif status == 'warn':
            color = YELLOW
            self.summary['warnings'] += 1
            icon = '⚠️'
        else:  # skip
            color = RESET
            icon = '⏭️'
        
        print(f"  {icon} {result['test']}")
        print(f"     {color}{result['message']}{RESET}")
        
        if result['details']:
            # Print important details
            details = result['details']
            
            if 'links' in details:
                for link in details['links']:
                    link_status = '✓' if link.get('is_valid') else '✗'
                    target = f" → {link.get('target_repo', 'unknown')}" if link.get('target_repo') else ''
                    print(f"       {link_status} {link['dependency']}: {link.get('version', link.get('path', 'N/A'))}{target}")
            
            if 'valid_members' in details:
                print(f"       Members: {', '.join(details['valid_members'])}")
            
            if 'invalid_members' in details and details['invalid_members']:
                print(f"       {RED}Invalid: {', '.join(details['invalid_members'])}{RESET}")

    def print_summary(self):
        """Print summary"""
        print(f"\n{BOLD}{'='*80}{RESET}")
        print(f"{BOLD}📊 Test Summary{RESET}")
        print(f"{BOLD}{'='*80}{RESET}")
        print(f"Total Tests: {self.summary['total_tests']}")
        print(f"{GREEN}✅ Passed: {self.summary['passed']}{RESET}")
        print(f"{YELLOW}⚠️  Warnings: {self.summary['warnings']}{RESET}")
        print(f"{RED}❌ Failed: {self.summary['failed']}{RESET}")
        
        # Calculate pass rate
        if self.summary['total_tests'] > 0:
            pass_rate = (self.summary['passed'] / self.summary['total_tests']) * 100
            print(f"\n{BOLD}Pass Rate: {pass_rate:.1f}%{RESET}")
        
        print(f"{BOLD}{'='*80}{RESET}\n")
        
        # Recommend fixes
        if self.summary['failed'] > 0 or self.summary['warnings'] > 0:
            print(f"\n{BOLD}💡 Fix Recommendations:{RESET}")
            print("─"*80)
            
            for result in self.results:
                if result['status'] in ['fail', 'warn']:
                    print(f"\n{result['test']}:")
                    print(f"  Status: {result['status'].upper()}")
                    print(f"  Message: {result['message']}")
                    
                    # Recommend fixes
                    details = result['details']
                    if details.get('has_workspace_link'):
                        print(f"  {YELLOW}→ Should change from 'workspace:*' to 'file:../repo-name'{RESET}")
                    
                    if not details.get('has_file_link') and details.get('total_deps', 0) > 0:
                        print(f"  {YELLOW}→ Should use 'file:../axionax-sdk-ts' for direct linking{RESET}")
                    
                    if 'invalid_members' in details and details['invalid_members']:
                        print(f"  {YELLOW}→ Remove non-existent members from Cargo.toml{RESET}")

    def save_report(self):
        """Save report"""
        report_file = self.workspace_root / 'REPO_LINK_TEST_REPORT.txt'
        
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write("="*80 + "\n")
            f.write("AXIONAX REPOSITORY DIRECT LINK TEST REPORT\n")
            f.write("="*80 + "\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("📊 SUMMARY\n")
            f.write("-"*80 + "\n")
            f.write(f"Total Tests: {self.summary['total_tests']}\n")
            f.write(f"✅ Passed: {self.summary['passed']}\n")
            f.write(f"⚠️  Warnings: {self.summary['warnings']}\n")
            f.write(f"❌ Failed: {self.summary['failed']}\n")
            
            if self.summary['total_tests'] > 0:
                pass_rate = (self.summary['passed'] / self.summary['total_tests']) * 100
                f.write(f"Pass Rate: {pass_rate:.1f}%\n")
            
            f.write("\n" + "="*80 + "\n")
            f.write("DETAILED RESULTS\n")
            f.write("="*80 + "\n\n")
            
            current_repo = None
            for result in self.results:
                repo_name = result['test'].split(':')[0]
                if repo_name != current_repo:
                    current_repo = repo_name
                    f.write(f"\n### {repo_name}\n")
                    f.write("-"*80 + "\n\n")
                
                status_symbol = {
                    'pass': '✅',
                    'fail': '❌',
                    'warn': '⚠️',
                    'skip': '⏭️'
                }.get(result['status'], '?')
                
                f.write(f"{status_symbol} {result['test']}\n")
                f.write(f"   {result['message']}\n")
                
                if result['details']:
                    f.write(f"   Details: {json.dumps(result['details'], indent=6)}\n")
                f.write("\n")
            
            f.write("="*80 + "\n")
            f.write("END OF REPORT\n")
            f.write("="*80 + "\n")
        
        print(f"{GREEN}✓ Report saved to: {report_file}{RESET}")

def main():
    workspace = os.getcwd()
    
    print(f"{BOLD}🔍 Repository Direct Link Tester{RESET}")
    print(f"Workspace: {workspace}\n")
    
    tester = RepoLinkTester(workspace)
    tester.run_all_tests()
    tester.print_summary()
    tester.save_report()
    
    # Return exit code
    if tester.summary['failed'] > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == '__main__':
    main()
