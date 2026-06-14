#!/usr/bin/env python3
"""Run the Vanguard MAT/CSV upgrade pipeline."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent

STEPS = [
    ("Phase 1 - MAT feature extraction", "extract_mat_features.py"),
    ("Phase 2 - CSV incident generation", "generate_csv_incidents.py"),
    ("Phase 3 - ChromaDB expansion", "expand_chromadb.py"),
    ("Final report", "generate_final_report.py"),
]


def main() -> None:
    for label, script in STEPS:
        print(f"\n{'=' * 60}\n{label}\n{'=' * 60}")
        result = subprocess.run(
            [sys.executable, str(SCRIPTS / script)],
            cwd=str(SCRIPTS),
        )
        if result.returncode != 0:
            sys.exit(f"Pipeline failed during: {label}")


if __name__ == "__main__":
    main()
