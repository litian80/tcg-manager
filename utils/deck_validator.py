import re
import json

def parse_deck_list(deck_text):
    """
    Parses a PTCG Live deck export string.
    Returns a dictionary with categories (Pokemon, Trainer, Energy) and list of card objects.
    """
    lines = deck_text.strip().split('\n')
    
    result = {
        "Pokemon": [],
        "Trainer": [],
        "Energy": [],
        "TotalCards": 0,
        "Errors": []
    }
    
    current_category = None
    
    # Standard line pattern: 2 Entei V BRS 22
    # Groups: 1=Qty, 2=Name, 3=Set, 4=Number
    standard_pattern = re.compile(r'^(\d+)\s+(.+?)\s+([A-Z0-9-]{2,6})\s+(\d+)$')
    
    # Basic Energy pattern: 11 Basic {R} Energy SVE 2
    # Sometimes they omit set/number (not in this format, but for robustness)
    basic_energy_pattern = re.compile(r'^(\d+)\s+(Basic\s+{[^}]+}\s+Energy)(?:\s+([A-Z0-9-]{2,6})\s+(\d+))?$')

    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check for category headers
        if line.startswith('Pokémon:'):
            current_category = "Pokemon"
            continue
        elif line.startswith('Trainer:'):
            current_category = "Trainer"
            continue
        elif line.startswith('Energy:'):
            current_category = "Energy"
            continue
        
        # Skip count lines (e.g., "Pokémon: 8") if they are just headers
        if re.match(r'^(Pokémon|Trainer|Energy):\s*\d+$', line):
            continue

        # Try standard pattern
        match = standard_pattern.match(line)
        if match:
            qty = int(match.group(1))
            name = match.group(2).strip()
            set_code = match.group(3).strip()
            card_number = match.group(4).strip()
            
            card_obj = {
                "qty": qty,
                "name": name,
                "set": set_code,
                "number": card_number,
                "raw": line
            }
            
            if current_category:
                result[current_category].append(card_obj)
            else:
                # Fallback detection
                # In real app, we'd guess based on name or DB
                result["Pokemon"].append(card_obj)
            
            result["TotalCards"] += qty
            continue
            
        # Try basic energy pattern
        match = basic_energy_pattern.match(line)
        if match:
            qty = int(match.group(1))
            name = match.group(2).strip()
            set_code = match.group(3).strip() if match.group(3) else "ENERGY"
            card_number = match.group(4).strip() if match.group(4) else "0"
            
            card_obj = {
                "qty": qty,
                "name": name,
                "set": set_code,
                "number": card_number,
                "raw": line,
                "is_basic_energy": True
            }
            result["Energy"].append(card_obj)
            result["TotalCards"] += qty
            continue
            
        # If no match, log error
        result["Errors"].append({
            "line": line,
            "message": "Failed to parse line format."
        })

    return result

if __name__ == "__main__":
    test_deck = """
Pokémon: 8
2 Entei V BRS 22
2 Iron Valiant ex PAR 89
2 Gouging Fire ex TEF 38
2 Radiant Charizard PGO 11
1 Squawkabilly ex PAL 169
1 Mew ex MEW 151
1 Lumineon V BRS 40
1 Medicham V EVS 83

Trainer: 16
4 Professor's Research SVI 189
4 Arven SVI 166
4 Boss's Orders PAL 172
2 Iono PAL 185
4 Nest Ball SVI 181
4 Ultra Ball SVI 196
4 Switch SVI 194
2 Earthen Vessel PAR 163
2 Super Rod PAL 188
1 Forest Seal Stone SIT 156
1 Prime Catcher TEF 157
2 Magma Basin BRS 144

Energy: 2
11 Basic {R} Energy SVE 2
4 Jet Energy PAL 190
"""
    parsed = parse_deck_list(test_deck)
    print(json.dumps(parsed, indent=2))
