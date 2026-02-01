import os
import xml.etree.ElementTree as ET

root_dir = r"C:\Users\litia\.gemini\antigravity\tcg-manager\TOMfiles"

print(f"{'Path':<80} | {'Mode':<20} | {'Stage':<5} | {'Type':<5} | {'Name'}")
print("-" * 150)

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
                print(f"{rel_path[:75]:<80} | {mode:<20} | {stage:<5} | {t_type:<5} | {name}")
                
            except Exception as e:
                print(f"{filename:<80} | Error: {e}")
