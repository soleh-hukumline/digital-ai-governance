"""
generate_100_incidents.py — DEPRECATED & DISABLED (do not use)
==============================================================
This script previously fabricated 95 of 100 "incidents" by randomly combining
institution types, city names and attack templates with random.choice(). The
output was NOT empirical data: all 95 generated records shared a single identical
`nexus_kausalitas` sentence, and a companion script (rename_incidents.py) then
renamed them (incident-auto-N -> e.g. pn-sidoarjo-2025) so the synthetic rows
looked authentic.

Presenting that output as "100 empirical cyber incidents" was a misrepresentation
and the real root cause of the reviewer's "lack of empirical validation /
reproducibility" critique.

It has been REPLACED by:
    build_incident_dataset.py   -> data/incidents/indonesia_incidents.json
which contains only REAL, individually-cited incidents (each with >=1 source,
a confidence rating, and a verification note).

This file is kept only as a record of what was removed, and is intentionally
disabled to prevent accidental regeneration of synthetic data.
"""

import sys

if __name__ == "__main__":
    sys.exit(
        "ERROR: generate_100_incidents.py is deprecated and disabled.\n"
        "It fabricated synthetic incidents via random.choice(). Use\n"
        "    python build_incident_dataset.py\n"
        "to rebuild the real, sourced dataset instead."
    )
