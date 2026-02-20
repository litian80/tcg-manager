"use server";

import { createClient } from "@/utils/supabase/server";

export async function exportTournamentTDF(tournamentId: string) {
    const supabase = await createClient();

    // 1. Fetch Tournament Data
    const { data: tournament, error: tError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

    if (tError || !tournament) {
        throw new Error('Tournament not found');
    }

    if (!tournament.tom_uid) {
        throw new Error('TOM UID (Sanction ID) is required to export TDF.');
    }

    // 2. Fetch Roster
    // Join with profiles to get birth_year
    // We need to handle:
    // - tournament_players (link)
    // - players (main visible data)
    // - profiles (sensitive data like birth_year, IF linked via user_id, but many players might be guest accounts or not linked)

    // Fetch players joined with tournament_players
    const { data: tpData, error: tpError } = await supabase
        .from('tournament_players')
        .select(`
            player_id,
            players:player_id (
                id,
                first_name,
                last_name,
                tom_player_id
            )
        `)
        .eq('tournament_id', tournamentId);

    // Note: If `birth_year` is missing from the joined data, we will default to 2012 in the XML generation step.

    let players: any[] = [];

    if (tpData) {
        // Extract TOM IDs to fetch birth years from profiles
        const tomIds = tpData
            .map((tp: any) => tp.players?.tom_player_id)
            .filter((id): id is string => !!id);

        // Fetch birth years from profiles
        const { data: profiles } = await supabase
            .from('profiles')
            .select('pokemon_player_id, birth_year')
            .in('pokemon_player_id', tomIds);

        // Create a map for O(1) lookup
        const birthYearMap = new Map<string, number>();
        profiles?.forEach(p => {
            if (p.pokemon_player_id && p.birth_year) {
                birthYearMap.set(p.pokemon_player_id, p.birth_year);
            }
        });

        players = tpData.map((tp: any) => {
            const tomId = tp.players?.tom_player_id;
            const realBirthYear = tomId ? birthYearMap.get(tomId) : undefined;

            return {
                ...tp.players,
                birth_year: realBirthYear || 2012 // Use real year if found, else default
            };
        });
    }

    if (tpError) {
        throw new Error('Failed to fetch players');
    }

    // 3. Construct XML
    // Header
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>`;

    // Tournament Tag
    /*
      Attributes:
       type="2" (Fixed)
       stage="1" (Default)
       version="1.80" (Fixed)
       gametype="TRADING_CARD_GAME" (Fixed)
       mode="LEAGUECHALLENGE" (Default? Or derive from tournament params? User didn't specify dynamic mode, used "LEAGUECHALLENGE" in sample)
       Let's stick to LEAGUECHALLENGE for now or generic. User sample had it.
    */

    const tData = `
    <data>
        <name>${escapeXml(tournament.name)}</name>
        <id>${tournament.tom_uid}</id>
        <city>${escapeXml(tournament.city || "")}</city>
        <state></state>
        <country>${escapeXml(tournament.country || "New Zealand")}</country>
        <roundtime>${'0'}</roundtime>
        <finalsroundtime>${'0'}</finalsroundtime>
        <organizer popid="${tournament.organizer_popid || ""}" name="${escapeXml(tournament.organizer_id) /* Name not easily avail, use ID or placeholder */}"/> 
        <startdate>${formatDate(tournament.date)}</startdate>
        <lessswiss>false</lessswiss>
        <autotablenumber>true</autotablenumber>
        <overflowtablestart>0</overflowtablestart>
    </data>`;

    // Players Tag
    // <player userid="6"><firstname>...</firstname><lastname>...</lastname><birthdate>02/27/2014</birthdate>...</player>
    const playersMap = players.map(p => {
        const bYear = p.birth_year || 2012;
        const bDate = `02/27/${bYear}`;

        // Creation dates: use current time as we are generating now
        const now = new Date();
        const dateStr = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        return `
        <player userid="${p.tom_player_id || p.id /* Use TOM ID if avail, else UUID (TOM might fail on UUID but we try) */}">
            <firstname>${escapeXml(p.first_name)}</firstname>
            <lastname>${escapeXml(p.last_name)}</lastname>
            <birthdate>${bDate}</birthdate>
            <creationdate>${dateStr}</creationdate>
            <lastmodifieddate>${dateStr}</lastmodifieddate>
        </player>`;
    }).join('');

    const xml = `${xmlHeader}
<tournament type="2" stage="1" version="1.80" gametype="TRADING_CARD_GAME" mode="LEAGUECHALLENGE">
    ${tData}
    <timeelapsed>0</timeelapsed>
    <players>${playersMap}
    </players>
    <pods>
    </pods>
    <finalsoptions>
    </finalsoptions>
</tournament>`;

    return {
        xml,
        filename: `${tournament.name.replace(/[^a-z0-9]/gi, '_')}_${tournament.tom_uid}.tdf`
    };
}

function escapeXml(unsafe: string | null | undefined): string {
    if (!unsafe) return "";
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
        return c;
    });
}

function formatDate(dateStr: string): string {
    // Input: YYYY-MM-DD or ISO
    // Output: MM/DD/YYYY
    try {
        const d = new Date(dateStr);
        return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
    } catch (e) {
        return dateStr;
    }
}
