import runpy
import sys
from pathlib import Path

target = Path(__file__).resolve().parent / "optimization" / "railway_dashboard_v30_operator_ready.py"
runpy.run_path(str(target), run_name="__main__")
