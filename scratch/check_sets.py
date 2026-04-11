import json
import requests
from bs4 import BeautifulSoup
import sys

SETS_FILE = "Cards/sets_data.json"

try:
    with open(SETS_FILE, "r", encoding="utf-8") as f:
        local_sets = json.load(f)
except Exception as e:
    print(f"Error loading {SETS_FILE}: {e}")
    sys.exit(1)

local_sets_map = {}
for s in local_sets:
    # use "Total" if it exists, otherwise "Number of cards"
    # Actually, the file uses "Total" and "Number of cards"
    # I'll just keep the whole object.
    total = int(s.get("Total", s.get("Number of cards", 0)))
    local_sets_map[s["Set Code"]] = {
        "Name": s["Set Name"],
        "Total": total
    }

url = "https://limitlesstcg.com/cards"
headers = {"User-Agent": "Mozilla/5.0"}
resp = requests.get(url, headers=headers)

if resp.status_code != 200:
    print(f"Failed to fetch {url}, status {resp.status_code}")
    sys.exit(1)

soup = BeautifulSoup(resp.text, 'html.parser')
tables = soup.find_all('table')

new_sets = []
updated_sets = []

# Typically the limitless sets page has a list of sets in tables
# Set code is usually in the URL
for table in tables:
    for row in table.find_all("tr"):
        a_tag = row.find("a", href=True)
        if not a_tag: continue
        
        href = a_tag["href"]
        if not href.startswith("/cards/"): continue
        
        # /cards/POR
        set_code = href.split("/")[-1]
        if "?" in set_code or "=" in set_code: continue # Ignore /cards/POR?display=list kind of links if they exist
        
        tds = row.find_all("td")
        if len(tds) < 3: continue
        
        # Determine which TD has what, Limitless usually has:
        # TD 0: icon
        # TD 1: name / code
        # TD 2: release date?
        # TD 3: count
        # In reality, might be different. Let's just grab the text of tds
        # Count is usually just a number at the end
        
        count_str = tds[-1].text.strip()
        name = a_tag.text.strip()
        
        if not count_str.isdigit(): continue
        count = int(count_str)
        
        if set_code not in local_sets_map:
            new_sets.append({"Code": set_code, "Name": name, "Count": count})
        else:
            if count > local_sets_map[set_code]["Total"]:
                updated_sets.append({
                    "Code": set_code, 
                    "Name": name, 
                    "Old": local_sets_map[set_code]["Total"], 
                    "New": count
                })

print("==== DIAGNOSTICS ====")
print(f"Total local sets: {len(local_sets_map)}")
print(f"Total remote sets found: {len(soup.find_all('a', href=lambda x: x and x.startswith('/cards/')))}")

if not new_sets and not updated_sets:
    print("NO CHANGES DETECTED. Local DB is up to date.")
else:
    print("\nNEW SETS:")
    for s in new_sets: print(f"  {s['Code']}: {s['Name']} - {s['Count']} cards")
    
    print("\nUPDATED SETS:")
    for s in updated_sets: print(f"  {s['Code']}: {s['Name']} - Old: {s['Old']} -> New: {s['New']}")
