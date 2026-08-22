import os
import sys

# main.py imports its siblings by bare module name
# (`from helmod_factory import HelmodFactory`), so the package directory
# needs to be on sys.path regardless of the pytest invocation's cwd.
PACKAGE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PACKAGE_DIR not in sys.path:
    sys.path.insert(0, PACKAGE_DIR)
