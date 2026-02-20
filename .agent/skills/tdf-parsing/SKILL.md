---
name: TDF File Parsing
description: How to parse, generate, and validate Pokemon TCG Tournament Data Format (TDF) files used by TOM (Tournament Operations Manager)
---

# TDF File Format

TDF files are **XML files** (UTF-8 encoded) used by Pokemon's Tournament Operations Manager (TOM) to store tournament data. File extension is `.tdf`.

**Filename convention:** `{TournamentName}_{SanctionID}.tdf`

---

## Root Element

```xml
<tournament type="3" stage="5" version="1.80" gametype="TRADING_CARD_GAME" mode="TCG1DAY">
```

| Attribute | Values | Meaning |
|---|---|---|
| `type` | `2`, `3` | `2` = basic, `3` = with age divisions (pods) |
| `stage` | `1`, `4`, `5`, `6`, `8` | `1` = setup, `4` = swiss in-progress, `5` = completed, `6` = swiss complete, `8` = top cut |
| `version` | `1.80` | Always `1.80` |
| `gametype` | `TRADING_CARD_GAME` | Always this value for Pokemon TCG |
| `mode` | `LEAGUECHALLENGE`, `TCG1DAY` | Tournament type. `LEAGUECHALLENGE` = League Challenge, `TCG1DAY` = Cup/1-day event |

---

## Sections Overview

```xml
<tournament ...>
    <data>...</data>              <!-- Tournament metadata -->
    <timeelapsed>0</timeelapsed>  <!-- Elapsed time in seconds -->
    <players>...</players>        <!-- All registered players -->
    <pods>...</pods>              <!-- Age divisions with rounds & matches -->
    <standings>...</standings>    <!-- Final standings (only in completed tournaments) -->
    <finalsoptions>...</finalsoptions>  <!-- Top cut configuration -->
</tournament>
```

---

## `<data>` — Tournament Metadata

```xml
<data>
    <name>2026 CMWC Jan Cup</name>
    <id>26-01-004635</id>                <!-- Sanction ID (maps to tom_uid in DB) -->
    <city>Auckland</city>
    <state></state>                       <!-- Often empty for NZ -->
    <country>New Zealand</country>
    <roundtime>50</roundtime>             <!-- Swiss round time in minutes (0 = untimed) -->
    <finalsroundtime>75</finalsroundtime> <!-- Top cut round time in minutes -->
    <organizer popid="2289823" name="Richard Chong"/>
    <startdate>01/17/2026</startdate>     <!-- MM/DD/YYYY -->
    <lessswiss>false</lessswiss>
    <autotablenumber>true</autotablenumber>
    <overflowtablestart>27</overflowtablestart>
</data>
```

**Key field:** `<id>` is the **Sanction ID** — the unique tournament identifier in the Pokemon Organized Play system. In the app database, this maps to `tournaments.tom_uid`.

---

## `<players>` — Player Registry

```xml
<player userid="5599533">
    <firstname>Lucas</firstname>
    <lastname>Ablan</lastname>
    <birthdate>02/27/2016</birthdate>
    <starter>true</starter>
    <order>2</order>             <!-- Optional: top cut seeding order -->
    <seed>8</seed>               <!-- Optional: top cut seed -->
    <dropped>                    <!-- Optional: only if player dropped -->
        <status>1</status>
        <round>2</round>
        <timestamp>11/30/2025 12:05:49</timestamp>
    </dropped>
    <creationdate>01/06/2026 18:32:22</creationdate>
    <lastmodifieddate>01/06/2026 18:32:22</lastmodifieddate>
</player>
```

### Privacy: Birthdate Masking
**All birthdates use the fixed date `02/27`** — only the **year** matters. The month and day are privacy-masked. When generating TDF, always use `02/27/{year}`.

### Player Fields

| Field | Required | Format | Notes |
|---|---|---|---|
| `userid` (attr) | Yes | Numeric string | TOM Player ID (maps to `players.tom_player_id`) |
| `firstname` | Yes | String | |
| `lastname` | Yes | String | XML-escaped (e.g. `O&apos;Sullivan`) |
| `birthdate` | Yes | `MM/DD/YYYY` | Always `02/27/YYYY` |
| `starter` | Yes | `true`/`false` | Whether player started the tournament |
| `order` | No | Integer | Top cut bracket position |
| `seed` | No | Integer | Top cut seed |
| `dropped` | No | Element | Present only if player dropped out |
| `creationdate` | Yes | `MM/DD/YYYY HH:MM:SS` | |
| `lastmodifieddate` | Yes | `MM/DD/YYYY HH:MM:SS` | |

---

## `<pods>` — Age Divisions

Pods represent **age divisions**. Each pod runs its own independent Swiss rounds and top cut.

```xml
<pod category="8" stage="1">
    <poddata>
        <startingtable>1</startingtable>
        <playoff3rd4th>false</playoff3rd4th>
        <subgroupcount>1</subgroupcount>
        <additionalrounds>0</additionalrounds>
    </poddata>
    <subgroups>
        <subgroup number="1">
            <players>
                <player userid="4284747" />  <!-- References by userid -->
            </players>
        </subgroup>
    </subgroups>
    <rounds>...</rounds>
</pod>
```

### Pod Categories

| `category` | Division |
|---|---|
| `0` | Junior |
| `1` | Senior |
| `2` | Masters |
| `8` | All ages / combined |

---

## `<rounds>` — Round Data

```xml
<round number="1" type="3" stage="4">
    <timeleft>0</timeleft>
    <pairtime>01/17/2026 10:11:17</pairtime>
    <starttime>01/17/2026 10:41:08</starttime>
    <matches>...</matches>
</round>
```

### Round Types

| `type` | Meaning |
|---|---|
| `1` | Single elimination (top cut) |
| `3` | Swiss rounds |

### Round Stage

| `stage` | Meaning |
|---|---|
| `4` | Swiss in-progress |
| `5` | Finals (last top cut round) |
| `6` | Swiss complete |
| `8` | Top cut |

---

## `<matches>` — Match Results

### Regular Match (two players)
```xml
<match outcome="1">
    <player1 userid="3865580"/>
    <player2 userid="4268713"/>
    <timestamp>01/19/2026 21:56:40</timestamp>
    <tablenumber>4</tablenumber>
</match>
```

### Bye (single player)
```xml
<match outcome="5">
    <player userid="5124501"/>
    <timestamp>01/17/2026 10:11:17</timestamp>
    <tablenumber>0</tablenumber>
</match>
```

### Outcome Codes

| `outcome` | Result |
|---|---|
| `1` | Player 1 wins |
| `2` | Player 2 wins |
| `3` | Draw / Tie |
| `5` | Bye (single player, table 0) |

---

## `<standings>` — Final Results

Only present in completed tournaments (`stage="5"`).

```xml
<standings>
    <pod category="2" type="finished">
        <player id="4672166" place="1" />
        <player id="4842326" place="2" />
    </pod>
    <pod category="2" type="dnf">
        <!-- Players who did not finish (dropped) -->
    </pod>
</standings>
```

| `type` | Meaning |
|---|---|
| `finished` | Completed players, ordered by final place |
| `dnf` | Players who dropped / did not finish |

---

## `<finalsoptions>` — Top Cut Config

```xml
<finalsoptions>
    <categorycut key="2">
        <options>
            <value>0</value>
            <value>4</value>
            <value>8</value>
        </options>
        <cut>8</cut>               <!-- Chosen top cut size -->
        <playercount>21</playercount>
        <paired3rd4th>false</paired3rd4th>
    </categorycut>
</finalsoptions>
```

---

## Date Format Reference

| Context | Format | Example |
|---|---|---|
| `startdate` | `MM/DD/YYYY` | `01/17/2026` |
| `birthdate` | `02/27/YYYY` | `02/27/2016` |
| `creationdate` | `MM/DD/YYYY HH:MM:SS` | `01/06/2026 18:32:22` |
| `timestamp` | `MM/DD/YYYY HH:MM:SS` | `01/17/2026 10:11:17` |

---

## Filtering Criteria

When scanning for valid Pokemon TCG tournament files, check:
- `version="1.80"`
- `gametype="TRADING_CARD_GAME"`
- `mode` is `TCG1DAY` or `LEAGUECHALLENGE`

For completed tournaments, also check:
- `stage="5"` on root element
- `<standings>` element exists

---

## App Database Mappings

| TDF Field | DB Table.Column |
|---|---|
| `<id>` (sanction ID) | `tournaments.tom_uid` |
| `player userid` | `players.tom_player_id` |
| `organizer popid` | `tournaments.organizer_popid` |
| `birthdate` year | `profiles.birth_year` (if linked) |

---

## Existing Code References

| File | Purpose |
|---|---|
| [export-tdf.ts](file:///c:/Users/litia/.gemini/antigravity/tcg-manager/actions/export-tdf.ts) | Generates TDF XML from Supabase tournament data |
| [tools/tdf/](file:///c:/Users/litia/.gemini/antigravity/tcg-manager/tools/tdf/) | Python scripts for analyzing/filtering TDF files |
| [tools/scanners/](file:///c:/Users/litia/.gemini/antigravity/tcg-manager/tools/scanners/) | Python scripts for scanning folders of TDF files |
| [TOMfiles/](file:///c:/Users/litia/.gemini/antigravity/tcg-manager/TOMfiles/) | Sample/test TDF files |
