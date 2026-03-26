# TCG Manager - Organizer Manual
**Last Updated:** March 26, 2026

Welcome to **TCG Manager**, the modern companion app for running Pokémon TCG tournaments. This platform acts as a live display layer, player registration portal, and roster management tool that works alongside the official Tournament Operations Manager (TOM) software.

## The Core Concept: Web ↔ TOM
Understanding data flow is critical for a smooth event:
1.  **Web App (Here)**: Used for Player Registration, Deck List Submission, Roster Management, and Live Standings/Pairings.
2.  **TOM (Desktop App)**: Used strictly to run the tournament (generating pairings and entering results).
3.  **The \`.tdf\` File**: This file holds the tournament state. You pass it from **Web → TOM → Web** to keep everything in sync.

---

## 1. Getting Started
To get started, simply sign in with Google. You will be prompted to complete an onboarding profile (Name, Birth Year, and POP ID). *Note: Ensure your POP ID is correct, as the system links tournament permissions to this ID.*

## 2. The Organizer Workflow
Follow this "Web-First" workflow to ensure the smoothest experience.

### Step 1: Create Tournament
Do not start in TOM. Navigate to **My Tournaments** and click **Create Tournament**.
Here, you can configure:
*   **Registration & Deck Lists**: Enable player self-registration, set capacities, and require Deck List submissions with automated cutoff deadlines.
*   **Divisions & Caps**: Set maximum capacities for Juniors, Seniors, and Masters.

### Step 2: Build Your Roster
Add players to the event *before* opening T.O.M.
*   If registration is open, players will appear automatically.
*   You can also manually search and add players from the **Roster Management** section on the Tournament Dashboard.

### Step 3: Export TDF
Once registration is closed:
1.  Locate the **Export TDF** card on the dashboard.
2.  Click **Download .tdf** and save it to your computer.

### Step 4: Run in TOM
1.  Open the **TOM** desktop software.
2.  Select **File -> Open Tournament** and select the downloaded \`.tdf\` file.
3.  **CRITICAL**: Go back to **Step 1** in TOM and verify the following are correctly selected before you proceed:
    *   Tournament Mode
    *   Game Type
    *   Name
    *   Sanctioned ID
    *   City, State, Country
4.  *Verify all players appear correctly*, then **Create Pairings** for Round 1 as normal and **Save** the tournament in TOM.

### Step 5: Live Auto-Sync
Make your pairings visible to the world instantly.
1.  Return to the **Tournament Dashboard** on the web.
2.  Locate the **Auto-Sync Uploader**.
3.  Select the **active** \`.tdf\` file you are currently using in TOM.
4.  **Leave this browser tab open.**
    *   Whenever you save in TOM, the website detects the change and uploads the new results/pairings immediately.
    *   Players can now see their table numbers and submit results on their phones!

---

## 3. Advanced Features

*   **Judges & Staff**: Add judges from the dashboard. Judges get access to a dedicated **Judge Dashboard** where they can issue penalties, grant time extensions, and review submitted player Deck Lists.
*   **Printable Assets**: Click **Print QR Poster** to generate a PDF for players to scan and find their Pairings.
*   **Data Export**: Export Penalty Logs for official reporting to Pokemon.
