#!/usr/bin/env python3
"""
axionax DevTools - Test Runner
Runs all unit and integration tests
"""

import sys
import os
from pathlib import Path

# Add tests directory to path
tests_dir = Path(__file__).parent / "tests"
sys.path.insert(0, str(tests_dir))

# Import test modules
try:
    from tests import test_basic, test_integration, test_security, test_performance
except ImportError:
    import test_basic
    import test_integration
    import test_security
    import test_performance


def main():
    """Main test runner"""
    print("=" * 80)
    print(" " * 20 + "axionax DevTools - Test Suite")
    print("=" * 80)
    print()
    
    # Run basic tests
    print("\n" + "=" * 80)
    print("PHASE 1: Basic Unit Tests")
    print("=" * 80)
    basic_success = test_basic.run_tests()
    
    # Run integration tests
    print("\n" + "=" * 80)
    print("PHASE 2: Integration Tests")
    print("=" * 80)
    integration_success = test_integration.run_integration_tests()
    
    # Run security tests
    print("\n" + "=" * 80)
    print("PHASE 3: Security & Quality Tests")
    print("=" * 80)
    security_success = test_security.run_advanced_tests()
    
    # Run performance tests
    print("\n" + "=" * 80)
    print("PHASE 4: Performance & Build Tests")
    print("=" * 80)
    performance_success = test_performance.run_performance_tests()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Basic Tests:       {'✅ PASSED' if basic_success else '❌ FAILED'}")
    print(f"Integration Tests: {'✅ PASSED' if integration_success else '❌ FAILED'}")
    print(f"Security Tests:    {'✅ PASSED' if security_success else '❌ FAILED'}")
    print(f"Performance Tests: {'✅ PASSED' if performance_success else '❌ FAILED'}")
    print("=" * 80)
    
    # Calculate statistics
    total_tests = 4
    passed_tests = sum([basic_success, integration_success, security_success, performance_success])
    
    print(f"\nTotal: {passed_tests}/{total_tests} test suites passed")
    print(f"Success rate: {(passed_tests/total_tests)*100:.1f}%")
    
    # Exit with appropriate code
    if passed_tests == total_tests:
        print("\n🎉 All tests PASSED!")
        return 0
    else:
        print(f"\n⚠️  Found errors in {total_tests - passed_tests} suites!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
