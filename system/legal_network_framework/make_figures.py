"""
make_figures.py — reproducible figures for the LNA report
=========================================================
Regenerates the two report figures DIRECTLY from the real network graph, so they
can never drift from the data again (previously the PNGs existed in the repo with
no generator and reflected the old synthetic dataset).

Outputs (overwrites) into app/assets/report_images/:
  master_metrics.png  — key quantitative metrics (node mix, coverage/vacuum,
                        top regulation hubs by degree centrality).
  master_lna.png      — the legal network, spring layout, coloured by class.

Run:  python make_figures.py   (needs matplotlib + networkx)
"""

import json
import os

import matplotlib
matplotlib.use('Agg')  # headless
import matplotlib.pyplot as plt
import networkx as nx

GRAPH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network', 'legal_graph.json')
IMG_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'assets', 'report_images')

COLORS = {
    'Intl': '#2563eb',      # blue
    'Natl': '#16a34a',      # green
    'Insiden': '#dc2626',   # red
    'Other': '#9ca3af',
}


def class_of(cls, group):
    s = str(cls or group or '')
    if s.startswith('Intl'):
        return 'Intl'
    if s.startswith('Natl'):
        return 'Natl'
    if 'Insiden' in s:
        return 'Insiden'
    return 'Other'


def load_graph():
    with open(GRAPH, encoding='utf-8') as f:
        data = json.load(f)
    G = nx.Graph()
    for n in data['nodes']:
        G.add_node(n['id'], label=n.get('label', n['id']),
                   group=n.get('group', ''), classification=n.get('classification', ''))
    for e in data['edges']:
        G.add_edge(e['from'], e['to'], label=e.get('label', ''))
    return G


def fig_metrics(G):
    intl = [n for n, d in G.nodes(data=True) if class_of(d.get('classification'), d.get('group')) == 'Intl']
    natl = [n for n, d in G.nodes(data=True) if class_of(d.get('classification'), d.get('group')) == 'Natl']
    inc = [n for n, d in G.nodes(data=True) if class_of(d.get('classification'), d.get('group')) == 'Insiden']
    connected_inc = [n for n in inc if G.degree(n) > 0]
    coverage = len(connected_inc) / max(len(inc), 1) * 100
    vacuum = 100 - coverage

    deg_c = nx.degree_centrality(G)
    top = sorted(((n, deg_c[n]) for n in (intl + natl)), key=lambda x: x[1], reverse=True)[:8]

    fig, axes = plt.subplots(1, 3, figsize=(16, 5))
    fig.suptitle('Legal Network Analysis — Key Quantitative Metrics (real, sourced incidents)',
                 fontsize=13, fontweight='bold')

    # (a) node mix
    axes[0].bar(['International', 'National', 'Incidents'],
                [len(intl), len(natl), len(inc)],
                color=[COLORS['Intl'], COLORS['Natl'], COLORS['Insiden']])
    axes[0].set_title('(a) Node composition')
    axes[0].set_ylabel('Number of nodes')
    for i, v in enumerate([len(intl), len(natl), len(inc)]):
        axes[0].text(i, v, str(v), ha='center', va='bottom', fontweight='bold')

    # (b) coverage vs vacuum
    axes[1].bar(['Covered\n(≥1 warrant)', 'Vacuum\n(0 warrant)'],
                [coverage, vacuum], color=['#16a34a', '#dc2626'])
    axes[1].set_title(f'(b) Incident coverage  (n={len(inc)})')
    axes[1].set_ylabel('% of incidents')
    axes[1].set_ylim(0, 100)
    for i, v in enumerate([coverage, vacuum]):
        axes[1].text(i, v, f'{v:.1f}%', ha='center', va='bottom', fontweight='bold')

    # (c) top regulation hubs
    labels = [G.nodes[n]['label'][:28] for n, _ in top][::-1]
    vals = [s for _, s in top][::-1]
    cols = [COLORS[class_of(G.nodes[n].get('classification'), G.nodes[n].get('group'))]
            for n, _ in top][::-1]
    axes[2].barh(labels, vals, color=cols)
    axes[2].set_title('(c) Top regulation hubs (degree centrality)')
    axes[2].set_xlabel('Degree centrality')
    axes[2].tick_params(axis='y', labelsize=7)

    plt.tight_layout(rect=[0, 0, 1, 0.95])
    out = os.path.join(IMG_DIR, 'master_metrics.png')
    plt.savefig(out, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f'  ✅ {os.path.basename(out)}  (coverage={coverage:.1f}%, vacuum={vacuum:.1f}%)')


def fig_network(G):
    fig, ax = plt.subplots(figsize=(13, 10))
    pos = nx.spring_layout(G, k=0.25, iterations=50, seed=42)
    node_color = [COLORS[class_of(d.get('classification'), d.get('group'))]
                  for _, d in G.nodes(data=True)]
    node_size = [40 + 22 * G.degree(n) for n in G.nodes()]
    nx.draw_networkx_edges(G, pos, alpha=0.12, width=0.5, ax=ax)
    nx.draw_networkx_nodes(G, pos, node_color=node_color, node_size=node_size,
                           linewidths=0.3, edgecolors='white', ax=ax)
    # label only the incident nodes (the analytical focus)
    inc_labels = {n: G.nodes[n]['label'].split(' - ')[0].replace('CASE_', '')
                  for n, d in G.nodes(data=True)
                  if class_of(d.get('classification'), d.get('group')) == 'Insiden' and G.degree(n) > 0}
    nx.draw_networkx_labels(G, pos, labels=inc_labels, font_size=5, ax=ax)

    handles = [plt.Line2D([0], [0], marker='o', color='w', markerfacecolor=c,
                          markersize=10, label=l)
               for l, c in [('International regulation', COLORS['Intl']),
                            ('National regulation', COLORS['Natl']),
                            ('Cyber/AI incident', COLORS['Insiden'])]]
    ax.legend(handles=handles, loc='lower left', fontsize=9)
    ax.set_title('Legal Network Analysis — Indonesia AI/Cyber Governance\n'
                 '(node size ∝ degree; incident labels shown where connected)',
                 fontsize=12, fontweight='bold')
    ax.axis('off')
    out = os.path.join(IMG_DIR, 'master_lna.png')
    plt.savefig(out, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f'  ✅ {os.path.basename(out)}')


def main():
    os.makedirs(IMG_DIR, exist_ok=True)
    G = load_graph()
    print(f'Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges')
    fig_metrics(G)
    fig_network(G)
    print('Figures regenerated from real data.')


if __name__ == '__main__':
    main()
