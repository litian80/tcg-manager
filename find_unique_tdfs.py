import os
import xml.etree.ElementTree as ET
import sys

# Set stdout to utf-8
sys.stdout.reconfigure(encoding='utf-8')

file_list_path = r"C:\Users\litia\.gemini\antigravity\tcg-manager\final_list.txt"
root_dir = r"C:\Users\litia\.gemini\antigravity\tcg-manager"

# Map ID -> List of files
unique_tournaments = {}
total_files_processed = 0

print("Reading file list...")
with open(file_list_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Analyzing files for duplicates...")
for line in lines:
    line = line.strip()
    if not line or not line.endswith('.tdf'):
        continue
    
    # The file list contains absolute paths
    full_path = line
    total_files_processed += 1
    
    try:
        tree = ET.parse(full_path)
        root = tree.getroot()
        
        data = root.find('data')
        t_id = "UNKNOWN"
        name = "UNKNOWN"
        
        if data is not None:
            id_elem = data.find('id')
            if id_elem is not None:
                t_id = id_elem.text
            
            name_elem = data.find('name')
            if name_elem is not None:
                name = name_elem.text
        
        if t_id not in unique_tournaments:
            unique_tournaments[t_id] = {
                'name': name,
                'files': []
            }
        
        unique_tournaments[t_id]['files'].append(full_path)
            
    except Exception as e:
        print(f"Error parsing {full_path}: {e}")

print(f"\nTotal files processed: {total_files_processed}")
print(f"Total Unique Tournaments found: {len(unique_tournaments)}")

print("\n--- Unique Tournaments List ---")
for t_id, info in unique_tournaments.items():
    print(f"ID: {t_id:<15} | Name: {info['name']}")
    for fpath in info['files']:
        # Print relative path for cleaner output
        try:
            rel_path = os.path.relpath(fpath, root_dir)
        except:
            rel_path = fpath
        print(f"  - {rel_path}")
    if len(info['files']) > 1:
        print(f"  *** {len(info['files'])} DUPLICATES FOUND ***")
    print("-" * 50)
