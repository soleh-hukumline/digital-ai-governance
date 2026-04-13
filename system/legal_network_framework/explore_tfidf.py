import os
import re
import PyPDF2
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import glob

def test_extraction(pdf_path):
    try:
        with open(pdf_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            full_text = ""
            for i in range(min(50, len(reader.pages))):
                pt = reader.pages[i].extract_text()
                if pt: full_text += pt + "\n"
                
            # Regex for everything: Article, Principle, Section, Paragraph, Recommendation
            pattern = r"((?:Article|Principle|Section|Paragraph|Recommendation|Guideline)\s+\d+)"
            chunks = re.split(pattern, full_text, flags=re.IGNORECASE)
            
            # if split failed, just chunk by paragraphs loosely
            if len(chunks) <= 1:
                chunks = re.split(r"(\n\n\d+\.\s+)", full_text)
                
            extracted = []
            if len(chunks) > 1:
                for i in range(1, len(chunks)-1, 2):
                    title = " ".join(chunks[i].split()).strip()
                    content = chunks[i+1][:2000].strip()
                    if len(content) > 50:
                        extracted.append((title, content))
            return extracted
    except Exception as e:
        # print("Error reading", pdf_path, e)
        return []

intl_base = "../../data/regulations/international"
intl_pdfs = glob.glob(os.path.join(intl_base, "**", "*.pdf"), recursive=True)

all_provisions = {}
stats = {}

for pdf in intl_pdfs:
    name = os.path.basename(pdf).replace(".pdf", "")[:15]
    ext = test_extraction(pdf)
    stats[name] = len(ext)
    for title, text in ext:
        all_provisions[f"{name}_{title}"] = text

print("=== EXTRACTION STATS ===")
for k,v in stats.items():
    print(f"{k}: {v} provisions found.")

print("\n=== TF-IDF CALCULATION ===")
docs = list(all_provisions.values())
keys = list(all_provisions.keys())

if docs:
    vec = TfidfVectorizer(stop_words='english')
    matrix = vec.fit_transform(docs)
    sim = cosine_similarity(matrix, matrix)
    
    thresholds = [0.05, 0.08, 0.1, 0.15, 0.2]
    for thr in thresholds:
        count = 0
        for i in range(len(keys)):
            for j in range(i+1, len(keys)):
                if sim[i][j] > thr and keys[i].split("_")[0] != keys[j].split("_")[0]:
                    count += 1
        print(f"Threshold > {thr}: found {count} cross-document edges")
