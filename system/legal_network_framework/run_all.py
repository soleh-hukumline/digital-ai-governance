"""
run_all.py — Master Pipeline Runner
====================================
Runs the full LNA pipeline in correct order:
  1. builder.py  → Generates legal_graph.json (master graph)
  2. analyzer.py → Generates laporan_hasil_lna.md
  3. intl_analyzer.py → Generates intl_graph.json + laporan
  4. natl_analyzer.py → Generates natl_graph.json + laporan
  5. cross_analyzer.py → Generates cross_graph.json + laporan
  6. incident_analyzer.py → Generates incident_graph.json + laporan
  7. gap_analyzer.py → Generates gap_graph.json + laporan

Usage:
  cd system/legal_network_framework/
  python3 run_all.py
"""

import time
import sys

def run_step(step_name, module_func):
    print(f'\n{"="*60}')
    print(f'  STEP: {step_name}')
    print(f'{"="*60}')
    start = time.time()
    try:
        module_func()
        elapsed = time.time() - start
        print(f'  ✅ {step_name} selesai ({elapsed:.1f}s)')
    except Exception as e:
        elapsed = time.time() - start
        print(f'  ❌ {step_name} GAGAL ({elapsed:.1f}s): {e}')
        import traceback
        traceback.print_exc()

def main():
    total_start = time.time()
    print('╔' + '═'*58 + '╗')
    print('║  DEEP MULTILINGUAL LEGAL NETWORK ANALYSIS — FULL PIPELINE ║')
    print('╚' + '═'*58 + '╝')

    # Step 1: Build master graph
    from builder import build_deep_network
    run_step('1. Build Master Graph (Multilingual Embeddings)', build_deep_network)

    # Step 2: Master LNA report
    from analyzer import analyze_network
    run_step('2. Generate Master LNA Report', analyze_network)

    # Step 3: International sub-graph
    from intl_analyzer import analyze_intl_only
    run_step('3. International Sub-Graph + Report', analyze_intl_only)

    # Step 4: National sub-graph
    from natl_analyzer import analyze_natl_only
    run_step('4. National Sub-Graph + Report', analyze_natl_only)

    # Step 5: Cross-jurisdiction sub-graph
    from cross_analyzer import analyze_cross_only
    run_step('5. Cross-Jurisdiction Sub-Graph + Report', analyze_cross_only)

    # Step 6: Incident sub-graph
    from incident_analyzer import analyze_incidents
    run_step('6. Incident Analysis Sub-Graph + Report', analyze_incidents)

    # Step 7: Gap analysis
    from gap_analyzer import analyze_gap
    run_step('7. Gap Analysis Sub-Graph + Report', analyze_gap)

    total_elapsed = time.time() - total_start
    print(f'\n{"═"*60}')
    print(f'  ✅ SEMUA PIPELINE SELESAI — Total: {total_elapsed:.1f}s')
    print(f'{"═"*60}')

    # Verification
    import json, os
    graph_files = [
        '../../data/network/legal_graph.json',
        '../../data/network/intl_graph.json',
        '../../data/network/natl_graph.json',
        '../../data/network/cross_graph.json',
        '../../data/network/incident_graph.json',
        '../../data/network/gap_graph.json',
    ]
    print('\n📊 VERIFICATION:')
    for gf in graph_files:
        if os.path.exists(gf):
            with open(gf) as f:
                data = json.load(f)
            n = len(data.get('nodes', []))
            e = len(data.get('edges', []))
            size_kb = os.path.getsize(gf) / 1024
            print(f'   ✅ {os.path.basename(gf)}: {n} nodes, {e} edges ({size_kb:.0f} KB)')
        else:
            print(f'   ❌ {os.path.basename(gf)}: MISSING')

    report_files = [
        'laporan_hasil_lna.md',
        'laporan_khusus_internasional.md',
        'laporan_khusus_nasional.md',
        'laporan_khusus_transnasional.md',
        'laporan_khusus_insiden.md',
        'laporan_gap_analysis.md',
    ]
    for rf in report_files:
        status = '✅' if os.path.exists(rf) else '❌'
        print(f'   {status} {rf}')


if __name__ == '__main__':
    main()
