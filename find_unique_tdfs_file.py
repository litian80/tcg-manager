import os
import xml.etree.ElementTree as ET

file_list_path = r"C:\Users\litia\.gemini\antigravity\tcg-manager\final_list.txt"
output_path = r"C:\Users\litia\.gemini\antigravity\tcg-manager\unique_report_final.txt"
root_dir = r"C:\Users\litia\.gemini\antigravity\tcg-manager"

# Map ID -> List of files
unique_tournaments = {}
total_files_processed = 0

with open(file_list_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for line in lines:
    line = line.strip()
    if not line or not line.endswith('.tdf'):
        continue
    
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
        pass

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(f"Total files processed: {total_files_processed}\n")
    f.write(f"Total Unique Tournaments found: {len(unique_tournaments)}\n\n")

    f.write("--- Unique Tournaments List ---\n")
    for t_id, info in unique_tournaments.items():
        f.write(f"ID: {t_id:<15} | Name: {info['name']}\n")
        # Sort files to ensure deterministic output, preferring files in root or shorter paths if possible
        # Logic: prefer 'Completed' prefix or root directory?
        # User just wants a report for now.
        for fpath in info['files']:
            try:
                rel_path = os.path.relpath(fpath, root_dir)
            except:
                rel_path = fpath
            f.write(f"  - {rel_path}\n")
        
        if len(info['files']) > 1:
            f.write(f"  *** {len(info['files'])} DUPLICATES FOUND ***\n")
        f.write("-" * 50 + "\n")

print(f"Report written to {output_path}")
