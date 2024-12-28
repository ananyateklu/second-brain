def test_basic():
    """Basic test to ensure pytest is working"""
    assert 2 + 2 == 4

def test_python_version():
    """Test that we're using Python 3"""
    import sys
    assert sys.version_info.major == 3 