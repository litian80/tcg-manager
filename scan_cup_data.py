import os
import xml.etree.ElementTree as ET
import sys

# Set stdout to utf-8
sys.stdout.reconfigure(encoding='utf-8')

root_dir = r"C:\Users\litia\Desktop\Cup Data"
output_file = r"C:\Users\litia\.gemini\antigravity\tcg-manager\cup_data_scan_results.txt"

matches = []
processed_count = 0

print(f"Scanning {root_dir}...")

for dirpath, dirnames, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.lower().endswith('.tdf'):
            full_path = os.path.join(dirpath, filename)
            processed_count += 1
            try:
                tree = ET.parse(full_path)
                root = tree.getroot()
                
                version = root.get('version', '')
                gametype = root.get('gametype', '')
                mode = root.get('mode', '')
                
                # Criteria:
                # version="1.80"
                # gametype="TRADING_CARD_GAME"
                # mode="TCG1DAY" or "LEAGUECHALLENGE"
                
                if (version == "1.80" and 
                    gametype == "TRADING_CARD_GAME" and 
                    (mode == "TCG1DAY" or mode == "LEAGUECHALLENGE")):
                    matches.append(full_path)
                    
            except Exception as e:
                # print(f"Error reading {filename}: {e}")
                pass

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(f"Scanned {processed_count} files.\n")
    f.write(f"Found {len(matches)} matching files:\n\n")
    for m in matches:
        f.write(m + "\n")

print(f"Done. Found {len(matches)} matches. Results saved to {output_file}")
