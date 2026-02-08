# deai/bridge_test.py — PyO3 bridge test

def test_rust_bridge():
    """Test that the Rust bridge is importable and get_version works."""
    import pytest

    print("--- Testing Rust-Python Bridge ---")
    try:
        import axionax_bridge
    except ImportError:
        print("axionax_bridge not found (Rust bridge not built or not in PYTHONPATH).")
        pytest.skip("Rust bridge not available")

    print("Successfully imported 'axionax_bridge' module.")
    version = axionax_bridge.get_version()
    print(f"Rust Core Version: {version}")
    assert version is not None
    assert isinstance(version, str)
    print("--- Bridge Test Passed! ---")


if __name__ == "__main__":
    import sys
    import pytest
    sys.exit(pytest.main([__file__, "-v", "-s"]))
