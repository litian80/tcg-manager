import os
import xml.etree.ElementTree as ET
import sys

root_dir = r"C:\Users\litia\.gemini\antigravity\tcg-manager\TOMfiles"
output_file = r"C:\Users\litia\.gemini\antigravity\tcg-manager\final_list.txt"

target_modes = ['TCG1DAY', 'LEAGUECHALLENGE']
# We assume stage 5 is final. 

matches = []

with open(output_file, 'w', encoding='utf-8') as f:
    f.write("Checking files...\n")
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

    f.write(f"Found {len(matches)} files:\n")
    for m in matches:
        f.write(m + "\n")

print(f"Written to {output_file}")
