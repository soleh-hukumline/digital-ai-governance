"""
rename_incidents.py — Auto-rename generic incident IDs to descriptive names.
Pattern: {TYPE}-{INSTANSI}-{YEAR}
"""
import json, re, os

INC_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'incidents', 'indonesia_incidents.json')

TYPE_MAP = {
    'data_breach': 'DB',
    'ransomware': 'RW',
    'ai_fraud': 'AF',
    'ai_misuse': 'AM',
}

# Regex to extract institution name from kronologi text
INST_PATTERNS = [
    r'milik instansi\s+(.+?)(?:\.|$)',
    r'melumpuhkan layanan internal milik instansi\s+(.+?)(?:\.|$)',
    r'milik instansi\s+(.+?)(?:\.|$)',
]

def extract_institution(text):
    """Extract institution name from kronologi text."""
    for pattern in INST_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            name = m.group(1).strip().rstrip('.')
            return name
    return None

def abbreviate(name):
    """Convert institution name to short code."""
    # Remove common prefixes
    name = name.strip()
    
    # Map common institution types
    replacements = {
        'Dinas Kesehatan': 'DINKES',
        'Dinas Pendidikan': 'DINDIK',
        'Pengadilan Negeri': 'PN',
        'Pemkot': 'PEMKOT',
        'Pemkab': 'PEMKAB',
        'Universitas': 'UNIV',
        'RSUD': 'RSUD',
        'BUMD': 'BUMD',
        'DPRD': 'DPRD',
        'BPR': 'BPR',
    }
    
    for full, short in replacements.items():
        if name.startswith(full):
            city = name.replace(full, '').strip()
            # Abbreviate city name (take first 3-6 chars or common abbreviation)
            city_abbr = abbreviate_city(city)
            return f"{short}-{city_abbr}"
    
    # Fallback: take first word
    words = name.split()
    return '-'.join(w[:5].upper() for w in words[:2])

def abbreviate_city(city):
    """Abbreviate city names."""
    city_map = {
        'Tulungagung': 'TLGAGUNG',
        'Sidoarjo': 'SIDOARJO',
        'Magetan': 'MAGETAN',
        'Tuban': 'TUBAN',
        'Bangkalan': 'BANGKALAN',
        'Yogyakarta': 'YOGYA',
        'Blitar': 'BLITAR',
        'Ponorogo': 'PONOROGO',
        'Pasuruan': 'PASURUAN',
        'Jember': 'JEMBER',
        'Trenggalek': 'TRENGGALEK',
        'Madiun': 'MADIUN',
        'Ngawi': 'NGAWI',
        'Pacitan': 'PACITAN',
        'Pamekasan': 'PAMEKASAN',
        'Probolinggo': 'PROBOLINGGO',
        'Bojonegoro': 'BOJONGORO',
        'Semarang': 'SEMARANG',
        'Lamongan': 'LAMONGAN',
        'Nganjuk': 'NGANJUK',
        'Malang': 'MALANG',
        'Banyuwangi': 'BANYUWANGI',
        'Jombang': 'JOMBANG',
        'Surabaya': 'SURABAYA',
        'Kediri': 'KEDIRI',
        'Mojokerto': 'MOJOKERTO',
        'Gresik': 'GRESIK',
        'Situbondo': 'SITUBONDO',
        'Bondowoso': 'BONDOWOSO',
        'Lumajang': 'LUMAJANG',
        'Madiun': 'MADIUN',
        'Sampang': 'SAMPANG',
        'Sumenep': 'SUMENEP',
        'Bangil': 'BANGIL',
    }
    
    for full_name, abbr in city_map.items():
        if city.strip().lower() == full_name.lower():
            return abbr
    
    # Fallback
    return city.strip().upper()[:8] if city.strip() else 'UNK'


def main():
    with open(INC_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    rename_count = 0
    used_ids = set()
    
    for inc in data['incidents']:
        old_id = inc['id']
        
        # Only rename incident-auto-* IDs
        if not old_id.startswith('incident-auto-'):
            used_ids.add(old_id)
            continue
        
        inc_type = TYPE_MAP.get(inc.get('type', ''), 'XX')
        year = inc.get('year', 2024)
        kronologi = inc.get('peristiwa_hukum_kronologi', '')
        
        institution = extract_institution(kronologi)
        if institution:
            inst_code = abbreviate(institution)
        else:
            inst_code = f"AUTO-{old_id.split('-')[-1]}"
        
        new_id = f"{inst_code}-{year}".lower()
        
        # Deduplicate
        if new_id in used_ids:
            suffix = 2
            while f"{new_id}-{suffix}" in used_ids:
                suffix += 1
            new_id = f"{new_id}-{suffix}"
        
        used_ids.add(new_id)
        inc['id'] = new_id
        rename_count += 1
        print(f"  {old_id:25s} → {new_id}")
    
    # Save
    with open(INC_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Renamed {rename_count} incidents.")

if __name__ == '__main__':
    main()
