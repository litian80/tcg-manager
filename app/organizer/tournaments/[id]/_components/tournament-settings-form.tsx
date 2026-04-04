"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Copy, Bell, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { ExtendedTournament as Tournament } from "@/types/tournament";
import { testNotificationWebhook } from "@/actions/webhook-actions";

interface TournamentSettingsFormProps {
    tournament: Tournament;
    isAdmin?: boolean;
}

export function TournamentSettingsForm({ tournament, isAdmin = false }: TournamentSettingsFormProps) {
    const [tournamentMode, setTournamentMode] = useState(tournament.tournament_mode || "LEAGUECHALLENGE");
    const [tomUid, setTomUid] = useState(tournament.tom_uid || "");
    const [organizerPopid, setOrganizerPopid] = useState(tournament.organizer_popid || "");
    const [registrationOpen, setRegistrationOpen] = useState(tournament.registration_open || false);
    const [publishRoster, setPublishRoster] = useState(tournament.publish_roster ?? true);
    const [allowOnlineMatchReporting, setAllowOnlineMatchReporting] = useState(tournament.allow_online_match_reporting || false);
    const [requiresDeckList, setRequiresDeckList] = useState(tournament.requires_deck_list || false);
    const [deckSubmissionCutoffHours, setDeckSubmissionCutoffHours] = useState(tournament.deck_submission_cutoff_hours?.toString() || "1");
    const [capJuniors, setCapJuniors] = useState(tournament.capacity_juniors?.toString() || "0");
    const [capSeniors, setCapSeniors] = useState(tournament.capacity_seniors?.toString() || "0");
    const [capMasters, setCapMasters] = useState(tournament.capacity_masters?.toString() || "0");
    const [jrMax, setJrMax] = useState(tournament.juniors_birth_year_max?.toString() || "");
    const [srMax, setSrMax] = useState(tournament.seniors_birth_year_max?.toString() || "");
    
    // Queue settings
    const [enableQueue, setEnableQueue] = useState(tournament.enable_queue || false);
    const [queuePromotionWindow, setQueuePromotionWindow] = useState(tournament.queue_promotion_window_minutes?.toString() || "10");
    const [queueBatchSize, setQueueBatchSize] = useState(tournament.queue_batch_size?.toString() || "10");
    const [queuePaused, setQueuePaused] = useState(tournament.queue_paused || false);
    
    // Payment settings
    const [paymentRequired, setPaymentRequired] = useState(tournament.payment_required || false);
    const [paymentUrl, setPaymentUrl] = useState(tournament.payment_url || "");
    const [paymentWebhookSecret, setPaymentWebhookSecret] = useState("");
    const [feeJuniors, setFeeJuniors] = useState(tournament.fee_juniors || "");
    const [feeSeniors, setFeeSeniors] = useState(tournament.fee_seniors || "");
    const [feeMasters, setFeeMasters] = useState(tournament.fee_masters || "");
    
    // Notification webhook settings
    const [notificationWebhookUrl, setNotificationWebhookUrl] = useState("");
    const [notificationWebhookSecret, setNotificationWebhookSecret] = useState("");
    const [isTestingWebhook, setIsTestingWebhook] = useState(false);

    // SEC-003: Load secrets from tournament_secrets on mount
    useEffect(() => {
        const supabase = createClient();
        (async () => {
            const { data: secrets } = await (supabase as any)
                .from('tournament_secrets')
                .select('notification_webhook_url, notification_webhook_secret, payment_webhook_secret')
                .eq('tournament_id', tournament.id)
                .maybeSingle();
            
            if (secrets) {
                setNotificationWebhookUrl(secrets.notification_webhook_url || "");
                setNotificationWebhookSecret(secrets.notification_webhook_secret || "");
                setPaymentWebhookSecret(secrets.payment_webhook_secret || "");
            }
        })();
    }, [tournament.id]);
    
    // For start time - split date and time
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("09:00");
    
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Parse start_time into date and time components on mount
    useEffect(() => {
        if (tournament.start_time) {
            try {
                const date = new Date(tournament.start_time);
                if (!isNaN(date.getTime())) {
                    setStartDate(date.toISOString().split('T')[0]);
                    setStartTime(date.toTimeString().slice(0, 5));
                }
            } catch (error) {
                console.error("Error parsing start_time:", error);
            }
        }
    }, [tournament.start_time]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const supabase = createClient();

        // Validation: xx-xx-xxxxxx
        const pattern = /^\d{2}-\d{2}-\d{6}$/;
        if (tomUid && !pattern.test(tomUid)) {
            toast.error("Format must be YY-MM-ID (e.g., 26-01-123456)");
            setIsLoading(false);
            return;
        }

        // Validate deck submission cutoff
        const cutoffHours = parseInt(deckSubmissionCutoffHours, 10);
        if (cutoffHours < 0 || cutoffHours > 48) {
            toast.error("Deck submission cutoff must be between 0 and 48 hours.");
            setIsLoading(false);
            return;
        }


        // Calculate start_time from date and time
        let startTimeValue = null;
        let deckListSubmissionDeadline = tournament.deck_list_submission_deadline;
        
        if (startDate && startTime) {
            try {
                // Combine date and time in local timezone
                const combinedDateTime = new Date(`${startDate}T${startTime}`);
                if (isNaN(combinedDateTime.getTime())) {
                    throw new Error("Invalid date/time");
                }
                
                startTimeValue = combinedDateTime.toISOString();
                
                // Recalculate deck list submission deadline if start time changes
                if (cutoffHours > 0) {
                    const deadlineDate = new Date(combinedDateTime.getTime() - (cutoffHours * 60 * 60 * 1000));
                    deckListSubmissionDeadline = deadlineDate.toISOString();
                } else {
                    deckListSubmissionDeadline = null;
                }
            } catch (error) {
                console.error("Error processing start time:", error);
                toast.error("Invalid start date/time format");
                setIsLoading(false);
                return;
            }
        }

        const { error } = await supabase
            .from("tournaments")
            .update({ 
                tournament_mode: tournamentMode,
                tom_uid: tomUid || null,
                ...(isAdmin ? { organizer_popid: organizerPopid || null } : {}),
                registration_open: registrationOpen,
                publish_roster: publishRoster,
                allow_online_match_reporting: allowOnlineMatchReporting,
                requires_deck_list: requiresDeckList,
                deck_submission_cutoff_hours: cutoffHours,
                deck_list_submission_deadline: deckListSubmissionDeadline,
                deck_size: 60,
                sideboard_size: 0,
                capacity_juniors: parseInt(capJuniors || "0", 10),
                capacity_seniors: parseInt(capSeniors || "0", 10),
                capacity_masters: parseInt(capMasters || "0", 10),
                juniors_birth_year_max: jrMax ? parseInt(jrMax, 10) : null,
                seniors_birth_year_max: srMax ? parseInt(srMax, 10) : null,
                enable_queue: enableQueue,
                queue_promotion_window_minutes: parseInt(queuePromotionWindow || "10", 10),
                queue_batch_size: parseInt(queueBatchSize || "10", 10),
                queue_paused: queuePaused,
                start_time: startTimeValue,
                payment_required: paymentRequired,
                payment_url: paymentRequired ? (paymentUrl || null) : null,
                fee_juniors: paymentRequired ? (feeJuniors || null) : null,
                fee_seniors: paymentRequired ? (feeSeniors || null) : null,
                fee_masters: paymentRequired ? (feeMasters || null) : null,
            })
            .eq("id", tournament.id);

        // SEC-003: Save secrets to tournament_secrets table
        const secretsPayload: Record<string, unknown> = {
            tournament_id: tournament.id,
            notification_webhook_url: notificationWebhookUrl || null,
            notification_webhook_secret: notificationWebhookSecret || null,
            payment_webhook_secret: paymentRequired ? (paymentWebhookSecret || null) : null,
            updated_at: new Date().toISOString(),
        };

        const { error: secretsError } = await (supabase as any)
            .from('tournament_secrets')
            .upsert(secretsPayload, { onConflict: 'tournament_id' });

        if (error || secretsError) {
            console.error(error || secretsError);
            toast.error("Failed to update settings");
        } else {
            toast.success("Tournament settings saved");
            router.refresh();
        }

        setIsLoading(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tournament Configuration</CardTitle>
                <CardDescription>
                    Configure tournament settings including start time and deck submission deadlines.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                    {/* Tournament Type Section */}
                    <div className="space-y-2">
                        <Label htmlFor="tournament_mode">Tournament Type</Label>
                        <Select
                            value={tournamentMode}
                            onValueChange={(value) => setTournamentMode(value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select tournament type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="LEAGUECHALLENGE">League Challenge</SelectItem>
                                <SelectItem value="TCG1DAY">League Cup</SelectItem>
                                <SelectItem value="PRERELEASE">Prerelease / Draft</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tournament Timing Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Tournament Timing</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Start Date</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="start_time">Start Time</Label>
                                <Input
                                    id="start_time"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sanction ID Section */}
                    <div className="space-y-2">
                        <Label htmlFor="tom_uid">Sanction ID / TOM UID</Label>
                        <Input
                            id="tom_uid"
                            placeholder="26-01-123456"
                            value={tomUid}
                            onChange={(e) => setTomUid(e.target.value)}
                            pattern="\d{2}-\d{2}-\d{6}"
                            title="Format: YY-MM-XXXXXX (e.g. 26-01-123456)"
                        />
                        <p className="text-xs text-muted-foreground">
                            Format: YY-MM-XXXXXX (e.g. 26-01-123456)
                        </p>
                    </div>

                    {/* Organiser Player ID Section */}
                    <div className="space-y-2">
                        <Label htmlFor="organizer_popid">Organiser Player ID</Label>
                        <Input
                            id="organizer_popid"
                            placeholder="e.g. 1234567"
                            value={organizerPopid}
                            onChange={(e) => setOrganizerPopid(e.target.value)}
                            disabled={!isAdmin}
                            className={!isAdmin ? "bg-muted cursor-not-allowed" : ""}
                        />
                        <p className="text-xs text-muted-foreground">
                            {isAdmin ? "Set the Player ID of the tournament organiser." : "The Player ID of the tournament organiser."}
                        </p>
                    </div>

                    {/* Match Reporting Settings Section */}
                    <div className="pt-4 border-t space-y-4">
                        <h3 className="text-lg font-medium">Match Reporting Settings</h3>
                        
                        <div className="flex items-center space-x-2 pb-2">
                            <Checkbox 
                                id="allow_online_match_reporting" 
                                checked={allowOnlineMatchReporting}
                                onCheckedChange={(checked) => setAllowOnlineMatchReporting(checked === true)}
                            />
                            <Label htmlFor="allow_online_match_reporting">Enable Online Match Result Reporting</Label>
                        </div>
                        <p className="text-xs text-muted-foreground -mt-3">
                            When enabled, allows players to self-report match results from their player dashboard.
                        </p>
                    </div>

                    {/* Deck List Settings Section */}
                    <div className="pt-4 border-t space-y-4">
                        <h3 className="text-lg font-medium">Deck List Settings</h3>
                        
                        <div className="flex items-center space-x-2 pb-2">
                            <Checkbox 
                                id="requires_deck_list" 
                                checked={requiresDeckList}
                                onCheckedChange={(checked) => setRequiresDeckList(checked === true)}
                            />
                            <Label htmlFor="requires_deck_list">Require Deck List Submission</Label>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="deck_submission_cutoff_hours">
                                Deck List Submission Cutoff (Hours before start)
                            </Label>
                            <Input
                                id="deck_submission_cutoff_hours"
                                type="number"
                                min="0"
                                max="48"
                                value={deckSubmissionCutoffHours}
                                onChange={(e) => setDeckSubmissionCutoffHours(e.target.value)}
                                disabled={!requiresDeckList}
                            />
                            <p className="text-xs text-muted-foreground">
                                {requiresDeckList 
                                    ? "Players must submit deck lists this many hours before the tournament starts. Set to 0 to disable deadlines."
                                    : "Enable deck list submission to configure deadlines."}
                            </p>
                        </div>

                    </div>

                    {/* Registration Settings Section */}
                    <div className="pt-4 border-t space-y-4">
                        <h3 className="text-lg font-medium">Registration Settings</h3>
                        
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="registration_open" 
                                checked={registrationOpen}
                                onCheckedChange={(checked) => setRegistrationOpen(checked === true)}
                            />
                            <Label htmlFor="registration_open">Enable Online Registration</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2 pb-4">
                            <Checkbox 
                                id="publish_roster" 
                                checked={publishRoster}
                                onCheckedChange={(checked) => setPublishRoster(checked === true)}
                            />
                            <Label htmlFor="publish_roster">Publish Player Roster (Visible to Public)</Label>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="capJuniors">Juniors Capacity</Label>
                                <Input id="capJuniors" type="number" min="0" value={capJuniors} onChange={(e) => setCapJuniors(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="capSeniors">Seniors Capacity</Label>
                                <Input id="capSeniors" type="number" min="0" value={capSeniors} onChange={(e) => setCapSeniors(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="capMasters">Masters Capacity</Label>
                                <Input id="capMasters" type="number" min="0" value={capMasters} onChange={(e) => setCapMasters(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="jrMax">Juniors: Born after</Label>
                                <Input 
                                    id="jrMax" 
                                    type="number" 
                                    placeholder="2014" 
                                    value={jrMax} 
                                    onChange={(e) => setJrMax(e.target.value)} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="srMax">Seniors: Born after</Label>
                                <Input 
                                    id="srMax" 
                                    type="number" 
                                    placeholder="2010" 
                                    value={srMax} 
                                    onChange={(e) => setSrMax(e.target.value)} 
                                />
                            </div>
                        </div>
                        <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                            <p className="font-medium">Age Division Rules:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Junior: Born in or after the Junior year</li>
                                <li>Senior: Born in or after the Senior year (but younger than Junior threshold)</li>
                                <li>Master: Born before the Senior year</li>
                            </ul>
                        </div>
                    </div>

                    {/* Queue Settings Section */}
                    <div className="pt-4 border-t space-y-4">
                        <h3 className="text-lg font-medium">Registration Queue Settings</h3>
                        
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="enable_queue" 
                                checked={enableQueue}
                                onCheckedChange={(checked) => setEnableQueue(checked === true)}
                            />
                            <Label htmlFor="enable_queue">Enable Registration Queue (Recommended for high-demand events)</Label>
                        </div>
                        
                        {enableQueue && (
                            <div className="space-y-4 pl-6 border-l-2 ml-2 border-primary/20">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="queue_batch_size">Queue Batch Size</Label>
                                        <Input
                                            id="queue_batch_size"
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={queueBatchSize}
                                            onChange={(e) => setQueueBatchSize(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            How many players to promote to pending payment per minute. Try 10-20.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="queue_promotion_window">Checkout Window (Minutes)</Label>
                                        <Input
                                            id="queue_promotion_window"
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={queuePromotionWindow}
                                            onChange={(e) => setQueuePromotionWindow(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            How long a promoted player has to pay before they lose their spot. 
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 bg-destructive/10 p-3 rounded-md border border-destructive/20">
                                    <Checkbox 
                                        id="queue_paused" 
                                        checked={queuePaused}
                                        onCheckedChange={(checked) => setQueuePaused(checked === true)}
                                    />
                                    <Label htmlFor="queue_paused" className="text-destructive font-semibold">Pause Queue Promotion (Emergency Stop)</Label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Payment Settings Section */}
                    <div className="pt-4 border-t space-y-4">
                        <h3 className="text-lg font-medium">💳 Payment Settings</h3>
                        
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="payment_required" 
                                checked={paymentRequired}
                                onCheckedChange={(checked) => {
                                    const isChecked = checked === true;
                                    setPaymentRequired(isChecked);
                                    // Auto-generate secret on first enable
                                    if (isChecked && !paymentWebhookSecret) {
                                        const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                                            .map(b => b.toString(16).padStart(2, '0')).join('');
                                        setPaymentWebhookSecret(secret);
                                    }
                                }}
                            />
                            <Label htmlFor="payment_required">Require Payment for Registration</Label>
                        </div>

                        {paymentRequired && (
                            <div className="space-y-4 pl-6">
                                <div className="space-y-2">
                                    <Label htmlFor="payment_url">Payment URL</Label>
                                    <Input
                                        id="payment_url"
                                        type="url"
                                        placeholder="https://buy.stripe.com/your-link"
                                        value={paymentUrl}
                                        onChange={(e) => setPaymentUrl(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Players will be redirected here to pay. We&apos;ll append player details as query parameters automatically.
                                    </p>
                                </div>

                                {/* REG-004: Division-specific fees */}
                                <div className="space-y-3">
                                    <Label>Division Fees</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Set entry fee per division. Leave empty or set to 0 for free divisions. Changing fees won&apos;t affect players already in the payment process.
                                    </p>
                                    {/* EC-15 Warning: fees set but no birth year boundaries */}
                                    {(feeJuniors || feeSeniors) && !jrMax && !srMax && (
                                        <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-md text-xs text-amber-600 dark:text-amber-400">
                                            <span className="mt-0.5">⚠️</span>
                                            <span>You've set division-specific fees but haven't configured age boundaries (above). All players will be charged the Masters fee until boundaries are set.</span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <Label htmlFor="fee_juniors" className="text-xs">Juniors ($)</Label>
                                            <Input
                                                id="fee_juniors"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={feeJuniors}
                                                onChange={(e) => setFeeJuniors(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="fee_seniors" className="text-xs">Seniors ($)</Label>
                                            <Input
                                                id="fee_seniors"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={feeSeniors}
                                                onChange={(e) => setFeeSeniors(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="fee_masters" className="text-xs">Masters ($)</Label>
                                            <Input
                                                id="fee_masters"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={feeMasters}
                                                onChange={(e) => setFeeMasters(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="payment_webhook_secret">Webhook Secret</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="payment_webhook_secret"
                                            type="text"
                                            value={paymentWebhookSecret}
                                            readOnly
                                            className="font-mono text-xs bg-muted"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            title="Copy to clipboard"
                                            onClick={() => {
                                                navigator.clipboard.writeText(paymentWebhookSecret);
                                                toast.success("Secret copied to clipboard");
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            title="Regenerate secret"
                                            onClick={() => {
                                                const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                                                    .map(b => b.toString(16).padStart(2, '0')).join('');
                                                setPaymentWebhookSecret(secret);
                                                toast.info("New secret generated. Remember to save and update your payment system.");
                                            }}
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Use this secret in your payment system to sign webhook callbacks.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Webhook Endpoint</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="text"
                                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/payment`}
                                            readOnly
                                            className="font-mono text-xs bg-muted"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            title="Copy endpoint"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/payment`);
                                                toast.success("Endpoint copied to clipboard");
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Configure your payment system to POST results to this URL.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notification Webhooks Section */}
                    <div className="pt-4 border-t space-y-4">
                        <h3 className="text-lg font-medium flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            Notification Webhooks
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Receive JSON events when players register, submit decks, or complete payment.
                            Connect to Mailchimp, Zapier, n8n, or any webhook-compatible tool.
                        </p>

                        <div className="space-y-2">
                            <Label htmlFor="notification_webhook_url">Webhook URL</Label>
                            <Input
                                id="notification_webhook_url"
                                type="url"
                                placeholder="https://hooks.zapier.com/hooks/catch/..."
                                value={notificationWebhookUrl}
                                onChange={(e) => {
                                    setNotificationWebhookUrl(e.target.value);
                                    // Auto-generate secret on first URL entry
                                    if (e.target.value && !notificationWebhookSecret) {
                                        const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                                            .map(b => b.toString(16).padStart(2, '0')).join('');
                                        setNotificationWebhookSecret(secret);
                                    }
                                }}
                            />
                            <p className="text-xs text-muted-foreground">
                                We&apos;ll POST signed JSON events to this HTTPS endpoint.
                            </p>
                        </div>

                        {notificationWebhookUrl && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="notification_webhook_secret">Webhook Secret</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="notification_webhook_secret"
                                            type="text"
                                            value={notificationWebhookSecret}
                                            readOnly
                                            className="font-mono text-xs bg-muted"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            title="Copy to clipboard"
                                            onClick={() => {
                                                navigator.clipboard.writeText(notificationWebhookSecret);
                                                toast.success("Secret copied to clipboard");
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            title="Regenerate secret"
                                            onClick={() => {
                                                const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                                                    .map(b => b.toString(16).padStart(2, '0')).join('');
                                                setNotificationWebhookSecret(secret);
                                                toast.info("New secret generated. Remember to save and update your endpoint.");
                                            }}
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Use this secret to verify the X-Webhook-Signature header on incoming events.
                                        Signature = HMAC-SHA256(timestamp + &quot;.&quot; + body).
                                    </p>
                                </div>

                                <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                                    <p className="font-medium mb-1">Events fired:</p>
                                    <ul className="list-disc pl-5 space-y-0.5 text-xs font-mono">
                                        <li>registration.confirmed / .waitlisted / .withdrawn</li>
                                        <li>payment.pending / .confirmed</li>
                                        <li>deck.submitted / .reminder</li>
                                    </ul>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isTestingWebhook || !notificationWebhookSecret}
                                    onClick={async () => {
                                        setIsTestingWebhook(true);
                                        // Save first, then test
                                        const result = await testNotificationWebhook(tournament.id);
                                        if (result.success) {
                                            toast.success(`Ping sent! Endpoint returned HTTP ${result.status}.`);
                                        } else {
                                            toast.error(result.error || "Test failed");
                                        }
                                        setIsTestingWebhook(false);
                                    }}
                                >
                                    {isTestingWebhook ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="mr-2 h-4 w-4" />
                                    )}
                                    Test Webhook
                                </Button>
                                <p className="text-xs text-muted-foreground -mt-2">
                                    Sends a <code className="bg-muted px-1 rounded">ping</code> event to verify your endpoint. Save settings first.
                                </p>
                            </>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Settings
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
