import sys
import os

try:
    import PyPDF2
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyPDF2"])
    import PyPDF2

def extract_text(pdf_path):
    print(f"Extracting: {pdf_path}")
    text = ""
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    
    out_path = pdf_path + ".txt"
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Saved to: {out_path}")

docs = [
    r"c:\Users\litia\.gemini\antigravity\tcg-manager\docs\play-pokemon-penalty-guidelines-en20260407.pdf",
    r"c:\Users\litia\.gemini\antigravity\tcg-manager\docs\play-pokemon-tcg-tournament-handbook-en 20260407.pdf",
    r"c:\Users\litia\.gemini\antigravity\tcg-manager\docs\play-pokemon-tournament-rules-handbook-en 20260407.pdf"
]

for doc in docs:
    extract_text(doc)
