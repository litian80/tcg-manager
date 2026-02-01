import os
import xml.etree.ElementTree as ET
import sys

# Set stdout to utf-8 just in case, though we will write to file
sys.stdout.reconfigure(encoding='utf-8')

root_dir = r"C:\Users\litia\.gemini\antigravity\tcg-manager\TOMfiles"
output_file = r"C:\Users\litia\.gemini\antigravity\tcg-manager\tdf_report_utf8.txt"

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(f"{'Path':<80} | {'Mode':<20} | {'Stage':<5} | {'Type':<5} | {'Name'}\n")
    f.write("-" * 150 + "\n")

    for dirpath, dirnames, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.lower().endswith('.tdf'):
                full_path = os.path.join(dirpath, filename)
                try:
                    tree = ET.parse(full_path)
                    root = tree.getroot()
                    
                    mode = root.get('mode', 'N/A')
                    stage = root.get('stage', 'N/A')
                    t_type = root.get('type', 'N/A')
                    
                    data = root.find('data')
                    name = "N/A"
                    if data is not None:
                        name_elem = data.find('name')
                        if name_elem is not None:
                            name = name_elem.text
                    
                    # Shorten path for display
                    rel_path = os.path.relpath(full_path, root_dir)
                    f.write(f"{rel_path[:75]:<80} | {mode:<20} | {stage:<5} | {t_type:<5} | {name}\n")
                    
                except Exception as e:
                    f.write(f"{filename:<80} | Error: {e}\n")

print(f"Written to {output_file}")
