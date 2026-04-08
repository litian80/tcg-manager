"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createTournament(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Role check: only organizers and admins can create tournaments
    const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (creatorProfile?.role !== 'admin' && creatorProfile?.role !== 'organizer') {
        return { error: "Only organizers and admins can create tournaments." };
    }

    const name = formData.get("name") as string;
    const date = formData.get("date") as string;
    const startTime = formData.get("start_time") as string || "09:00";
    const city = formData.get("city") as string;
    const country = formData.get("country") as string || "New Zealand";
    const tom_uid = formData.get("tom_uid") as string;
    const tournament_mode = formData.get("tournament_mode") as string || "LEAGUECHALLENGE";

    // Validate tournament mode
    const validModes = ["LEAGUECHALLENGE", "TCG1DAY", "PRERELEASE"];
    if (!validModes.includes(tournament_mode)) {
        return { error: "Invalid tournament type selected." };
    }
    
    const requires_deck_list = formData.get("requires_deck_list") === "true" || formData.get("requires_deck_list") === "on";
    const deck_submission_cutoff_hours = parseInt((formData.get("deck_submission_cutoff_hours") as string) || "1", 10);

    const registration_open = formData.get("registration_open") === "true" || formData.get("registration_open") === "on";
    const publish_roster = formData.get("publish_roster") === "true" || formData.get("publish_roster") === "on";
    const allow_online_match_reporting = formData.get("allow_online_match_reporting") === "true" || formData.get("allow_online_match_reporting") === "on";
    const capacity_juniors = parseInt((formData.get("capacity_juniors") as string) || "0", 10);
    const capacity_seniors = parseInt((formData.get("capacity_seniors") as string) || "0", 10);
    const capacity_masters = parseInt((formData.get("capacity_masters") as string) || "0", 10);
    const capacity = parseInt((formData.get("capacity") as string) || "0", 10);
    
    // Convert empty string to null for optional integer birth year constraints
    const jr_max_raw = formData.get("juniors_birth_year_max") as string;
    const sr_max_raw = formData.get("seniors_birth_year_max") as string;
    
    const juniors_birth_year_max = jr_max_raw ? parseInt(jr_max_raw, 10) : null;
    const seniors_birth_year_max = sr_max_raw ? parseInt(sr_max_raw, 10) : null;
    // Masters birth year is no longer an input - derived from seniors threshold in registration logic

    // Advanced settings (optional)
    const enable_queue = formData.get("enable_queue") === "true";
    const queue_batch_size = parseInt((formData.get("queue_batch_size") as string) || "10", 10);
    const queue_promotion_window_minutes = parseInt((formData.get("queue_promotion_window_minutes") as string) || "10", 10);
    const payment_required = formData.get("payment_required") === "true";
    const payment_provider = (formData.get("payment_provider") as string) || "stripe";
    const payment_url_juniors = (formData.get("payment_url_juniors") as string) || null;
    const payment_url_seniors = (formData.get("payment_url_seniors") as string) || null;
    const payment_url_masters = (formData.get("payment_url_masters") as string) || null;
    const notification_webhook_url = (formData.get("notification_webhook_url") as string) || null;

    // Basic Validation
    if (!name || !date || !city) {
        return { error: "Name, Date, and City are required." };
    }

    // Validate deck submission cutoff
    if (deck_submission_cutoff_hours < 0 || deck_submission_cutoff_hours > 48) {
        return { error: "Deck submission cutoff must be between 0 and 48 hours." };
    }


    // Combine date and time to create start_time
    const start_time_local_iso = formData.get("start_time_local_iso") as string;
    let startTimeDate: Date;
    
    if (start_time_local_iso) {
        // Client correctly resolved local date/time to UTC based on user's timezone
        startTimeDate = new Date(start_time_local_iso);
    } else {
        // Fallback: If no client info, server evaluates string. Highly likely to be wrong for non-UTC/non-local users.
        const startDateTimeStr = `${date}T${startTime}`;
        startTimeDate = new Date(startDateTimeStr);
    }
    
    if (isNaN(startTimeDate.getTime())) {
        return { error: "Invalid date or time format." };
    }

    // Calculate deck list submission deadline
    let deck_list_submission_deadline = null;
    if (deck_submission_cutoff_hours > 0) {
        const deadlineDate = new Date(startTimeDate.getTime() - (deck_submission_cutoff_hours * 60 * 60 * 1000));
        deck_list_submission_deadline = deadlineDate.toISOString();
    }

    // Sanction ID Validation (Optional but recommended if provided)
    // Regex: xx-xx-xxxxxx (e.g. 26-01-123456)
    if (tom_uid) {
        const tomRegex = /^\d{2}-\d{2}-\d{6}$/;
        if (!tomRegex.test(tom_uid)) {
            return { error: "Invalid Sanction ID format. Expected format: XX-XX-XXXXXX (e.g. 25-01-000001)" };
        }

        // Uniqueness Check
        const { data: existing } = await supabase
            .from('tournaments')
            .select('id')
            .eq('tom_uid', tom_uid)
            .single();

        if (existing) {
            return { error: "Sanction ID (TOM UID) is already in use by another tournament." };
        }
    }

    // Fetch Profile for POP ID
    const { data: profile } = await supabase
        .from('profiles')
        .select('pokemon_player_id, role')
        .eq('id', user.id)
        .single();

    // Determine organizer POP ID:
    // - Admins can set a custom organizer_popid via form
    // - Organizers always use their own POP ID
    const formPopId = formData.get("organizer_popid") as string;
    const isAdmin = profile?.role === 'admin';
    const popId = isAdmin && formPopId ? formPopId : (profile?.pokemon_player_id || null);

    // Mandatory field check
    if (!popId) {
        // Organizer POP ID is mandatory in profile for attribution.
    }

    // Insert Tournament
    const { data, error } = await supabase
        .from('tournaments')
        .insert({
            name,
            date,
            city,
            country,
            tom_uid: tom_uid || null, // Convert empty string to null to avoid unique constraint violation on ""
            // organizer_id: user.id, // OMITTING: DB types say this is optional for INSERT (likely default=auth.uid())
            organizer_popid: popId || null, // Mandatory insertion
            status: 'not_started',
            total_rounds: 0,
            is_published: false,
            registration_open,
            publish_roster,
            allow_online_match_reporting,
            capacity,
            capacity_juniors,
            capacity_seniors,
            capacity_masters,
            juniors_birth_year_max,
            seniors_birth_year_max,
            start_time: startTimeDate.toISOString(),
            deck_submission_cutoff_hours,
            deck_list_submission_deadline,
            requires_deck_list,
            deck_size: 60,
            sideboard_size: 0,
            tournament_mode,
            enable_queue,
            queue_batch_size,
            queue_promotion_window_minutes,
            payment_required,
            payment_provider: payment_required ? payment_provider : null,
            payment_url_juniors: payment_required ? payment_url_juniors : null,
            payment_url_seniors: payment_required ? payment_url_seniors : null,
            payment_url_masters: payment_required ? payment_url_masters : null,
        })
        .select('id')
        .single();

    if (error) {
        console.error("Create Tournament Error:", error);
        if (error.code === '23505') { // Unique constraint code
            return { error: "Sanction ID or other unique field already exists." };
        }
        return { error: `Failed to create tournament: ${error.message} (Code: ${error.code})` };
    }

    // UX-020: Auto-save organiser template for this event type
    // This allows future tournaments of the same type to pre-fill from this one
    if (popId) {
        await supabase
            .from('tournament_templates')
            .upsert({
                organizer_popid: popId,
                tournament_mode,
                city,
                country,
                start_time_default: startTime,
                requires_deck_list,
                deck_submission_cutoff_hours,
                registration_open,
                publish_roster,
                allow_online_match_reporting,
                capacity_juniors,
                capacity_seniors,
                capacity_masters,
                juniors_birth_year_max,
                seniors_birth_year_max,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'organizer_popid,tournament_mode' })
            .then(({ error: templateError }) => {
                if (templateError) {
                    console.warn("Failed to save tournament template:", templateError.message);
                }
            });
    }

    // Save notification webhook to tournament_secrets if provided
    if (notification_webhook_url) {
        // Generate HMAC secret for webhook signature verification
        const webhookSecret = Array.from({ length: 32 }, () =>
            Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join('');

        await supabase
            .from('tournament_secrets')
            .upsert({
                tournament_id: data.id,
                notification_webhook_url,
                notification_webhook_secret: webhookSecret,
            }, { onConflict: 'tournament_id' })
            .then(({ error: secretError }) => {
                if (secretError) {
                    console.warn("Failed to save webhook secret:", secretError.message);
                }
            });
    }

    revalidatePath('/organizer/tournaments');
    redirect(`/organizer/tournaments/${data.id}`);
}
