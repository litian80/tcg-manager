# TCG Manager - User Manual

Welcome to **TCG Manager**, the modern companion app for running Pokémon TCG tournaments. This platform serves as a **live visibility layer** and **roster management tool** that works in tandem with the official Tournament Operations Manager (TOM) software.

## Core Concept: Source of Truth
Understanding this is critical for success:
*   **Web App (This Platform)**: Used for **Registration**, **Roster Management**, and **Public Visibility** (Pairings/Standings).
*   **TOM (Desktop Software)**: Used to **Run the Tournament** (Generate Pairings, Enter Results).
*   The **`.tdf` file** implies the state. You move it from Web -> TOM -> Web to keep everything in sync.

---

## 1. Getting Started

### Login & Access
Access the platform using your Google Account.
1.  Click **Sign In** on the homepage.
2.  Use your standard Google credentials.

### Profile Setup (CRITICAL)
Before you can organize or judge, you **MUST** configure your profile.
1.  Go to **Settings** (User Menu -> Settings).
2.  **Display Name**: Your full name (e.g., "John Doe").
3.  **Pokémon Player ID**: Your official POP ID.
    *   > [!IMPORTANT]
    *   > The system links tournaments to you based on this ID. If this is missing or wrong, you will not have "Organizer" access to your own files.

---

## 2. Organization Workflow (Step-by-Step)

Follow this "Web-First" workflow to ensure the smoothest experience.

### Step 1: Create Tournament
Instead of starting in TOM, start here.
1.  Navigate to **My Tournaments**.
2.  Click **Create TOM File**.
3.  Enter the event details:
    *   **Name**: e.g., "Ace Cup March"
    *   **Date & Location**: Required for the generated file.
    *   **Sanction ID**: Highly recommended if you have it (format: XX-MM-000123).

### Step 2: Build Your Roster
Add players to the event *before* you go to T.O.M.
1.  On the **Tournament Dashboard**, use the **Roster Management** card.
2.  **Search** for players by Name or Player ID.
    *   *Note: This searches the global database of players who have used the app or played in previous events.*
3.  Click **Add** to move them into the Current Roster.
    *   This ensures all Player IDs and Birth Years are correct in the final file.

### Step 3: Export TDF
Once registration is closed or you are ready to start:
1.  Look for the **Export TDF** card.
2.  Click **Download .tdf**.
3.  Save this file to your computer (e.g., in a `Tournaments` folder).

### Step 4: Run in TOM
1.  Open the **TOM** desktop software.
2.  Select **File -> Open Tournament**.
3.  Select the `.tdf` file you just downloaded.
    *   *Verify: You should see all your players automatically populated.*
4.  **Create Pairings** for Round 1 as normal.
5.  **Save** the tournament in TOM.

### Step 5: Live Auto-Sync (The Magic)
Make your pairings visible to the world instantly.
1.  Go back to the **Tournament Dashboard** on the web.
2.  Locate the **Auto-Sync Uploader**.
3.  Click **Select TDF to Auto-Sync**.
4.  Select the **active** `.tdf` file you are currently using in TOM.
5.  **Leave this browser tab open.**
    *   Whenever you save in TOM, the website will detect the change and upload the new results/pairings immediately.
    *   Players can now see their table numbers on their phones!

---

## 3. Tournament Management Features

### Staff & Judges
You can give other users access to help run the event (e.g., scorekeepers).
1.  In the Dashboard, look for **Staff / Judges**.
2.  Search for the user by name.
3.  **Add** them.
    *   *Permissions*: Judges can view "Hidden" tournaments and see penalty info.

### Penalty Management
TCG Manager allows you to export penalties for official reporting.
1.  **Export Penalty Log (CSV)**: Generates a CSV file compatible with official reporting tools (My Pokemon/RK9).
    *   *Note*: Ensure all penalties are entered correctly in TOM.

### Printable Assets
*   **QR Poster**: Click **Print QR Poster** in the header to generate a printable PDF. Hang this at the venue so players can scan and find their pairings.

### Publishing
*   **Hidden** (Default): Only visible to You and Judges.
*   **Published**: Visible on the public homepage.
    *   Toggle this in the **Settings** card when you are ready to go live.

---

## 4. For Players

### Finding Your Seat
1.  Go to the **Home Page**.
2.  Click on the **Live Tournament**.
3.  Find your name in the list.
4.  Note your **Table Number** and **Opponent**.

### Standings
Once the tournament (or round) is complete, check the **Standings** tab to see your rank and record.

---

## 5. Troubleshooting

**Q: I made a mistake in a result. How do I fix it?**
**A:** Fix it in **TOM**.
1.  Open the tournament in TOM.
2.  Correct the match result.
3.  **Save**.
4.  The Auto-Sync will pick up the change and update the website within 5-10 seconds.

**Q: My Auto-Sync stopped.**
**A:** This happens if you refresh the page. Simply click **Select TDF** again and re-select the file to resume.

**Q: I don't see the "Manage" buttons.**
**A:** Check your **Profile Settings**. Your configured **Player ID** must match the Organizer ID in the tournament file.

**Q: Can I add players manually in TOM?**
**A:** Yes. If a late player arrives:
1.  Add them in TOM.
2.  Save.
3.  The website will update. *However*, these players won't be in the web system's "Roster" list for future easy-adding until the sync completes.
