import PyPDF2
import re

def test_extract(pdf_path):
    try:
        with open(pdf_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            # just read first 10 pages for test
            for i in range(min(10, len(reader.pages))):
                text += reader.pages[i].extract_text() + "\n"
                
            # Regex to find Pasal
            pasals = re.findall(r"(Pasal\s+\d+)", text, re.IGNORECASE)
            print(f"File: {pdf_path}")
            print(f"Found pasals: {set(pasals)}")
    except Exception as e:
        print(e)

test_extract("../../data/regulations/indonesia/a_binding_national_regulation/UU_PDP_No27_2022.pdf")
test_extract("../../data/regulations/indonesia/a_binding_national_regulation/UU_ITE_No1_2024.pdf")
