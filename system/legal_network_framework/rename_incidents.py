"""
rename_incidents.py — DEPRECATED & DISABLED (do not use)
========================================================
This script renamed the synthetic `incident-auto-N` IDs produced by the old
generate_100_incidents.py into realistic-looking slugs (e.g. pn-sidoarjo-2025).
In effect it DISGUISED randomly-generated records as authentic incidents, which
compounded the data-integrity problem.

The incident dataset is now built by build_incident_dataset.py (in the project
root), which assigns descriptive IDs to REAL, sourced incidents directly. No
renaming step is needed or wanted.

Disabled to prevent accidental use.
"""

import sys

if __name__ == "__main__":
    sys.exit(
        "ERROR: rename_incidents.py is deprecated and disabled.\n"
        "It disguised synthetic incident IDs as real ones. The dataset is now\n"
        "built directly by: python build_incident_dataset.py"
    )
