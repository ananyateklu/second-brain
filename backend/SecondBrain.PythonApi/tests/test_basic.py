def test_basic():
    """Basic test to ensure pytest is working"""
    assert True

def test_python_version():
    """Test that we're using Python 3"""
    import sys
    assert sys.version_info.major == 3 