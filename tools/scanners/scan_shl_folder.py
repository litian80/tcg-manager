import os
import xml.etree.ElementTree as ET
import sys

# Set stdout to utf-8
sys.stdout.reconfigure(encoding='utf-8')

root_dir = r"C:\Users\litia\Downloads\Saturday Hobby League 03082024"
output_file = r"C:\Users\litia\.gemini\antigravity\tcg-manager\shl_scan_results.txt"

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
                
                # We won't strictly check version 1.80 unless user insists, but we will check Mode and Standings
                gametype = root.get('gametype', '')
                mode = root.get('mode', '')
                
                # Check for standings tag
                has_standings = root.find('standings') is not None

                # Criteria:
                # gametype="TRADING_CARD_GAME"
                # mode="TCG1DAY" or "LEAGUECHALLENGE"
                # AND has <standings> tag
                
                if (gametype == "TRADING_CARD_GAME" and 
                    (mode == "TCG1DAY" or mode == "LEAGUECHALLENGE") and
                    has_standings):
                    matches.append(full_path)
                    
            except Exception as e:
                # print(f"Error reading {filename}: {e}")
                pass

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(f"Scanned {processed_count} files.\n")
    f.write(f"Found {len(matches)} matching files (TCG Cup/Challenge + Standings):\n\n")
    for m in matches:
        f.write(m + "\n")

print(f"Done. Found {len(matches)} matches. Results saved to {output_file}")
