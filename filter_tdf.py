import os
import xml.etree.ElementTree as ET
import sys

# Set stdout to utf-8
sys.stdout.reconfigure(encoding='utf-8')

root_dir = r"C:\Users\litia\.gemini\antigravity\tcg-manager\TOMfiles"

target_modes = ['TCG1DAY', 'LEAGUECHALLENGE']
# We assume stage 5 is final. 

matches = []

print("Searching for Final TDF files (Stage 5, TCG1DAY/LEAGUECHALLENGE)...")

for dirpath, dirnames, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.lower().endswith('.tdf'):
            full_path = os.path.join(dirpath, filename)
            try:
                tree = ET.parse(full_path)
                root = tree.getroot()
                
                mode = root.get('mode', 'N/A')
                stage = root.get('stage', 'N/A')
                
                if mode in target_modes and stage == '5':
                    matches.append(full_path)
                    
            except Exception as e:
                pass

print(f"Found {len(matches)} files:")
for m in matches:
    print(m)
