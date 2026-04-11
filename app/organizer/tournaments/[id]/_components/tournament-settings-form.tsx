"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Loader2, Settings, Users, Layers, CreditCard, ListOrdered, Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { ExtendedTournament as Tournament } from "@/types/tournament";
import { GeneralPanel } from "./settings/general-panel";
import { RegistrationPanel } from "./settings/registration-panel";
import { DeckPanel } from "./settings/deck-panel";
import { PaymentPanel } from "./settings/payment-panel";
import { QueuePanel } from "./settings/queue-panel";
import { WebhookPanel } from "./settings/webhook-panel";

interface TournamentSettingsFormProps {
    tournament: Tournament;
    isAdmin?: boolean;
}

export function TournamentSettingsForm({ tournament, isAdmin = false }: TournamentSettingsFormProps) {
    // === State: General ===
    const [tournamentMode, setTournamentMode] = useState(tournament.tournament_mode || "LEAGUECHALLENGE");
    const [tomUid, setTomUid] = useState(tournament.tom_uid || "");
    const [organizerPopid, setOrganizerPopid] = useState(tournament.organizer_popid || "");
    const [allowOnlineMatchReporting, setAllowOnlineMatchReporting] = useState(tournament.allow_online_match_reporting || false);
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("09:00");

    // === State: Registration ===
    const [registrationOpen, setRegistrationOpen] = useState(tournament.registration_open || false);
    const [publishRoster, setPublishRoster] = useState(tournament.publish_roster ?? true);
    const [overallCapacity, setOverallCapacity] = useState(tournament.capacity?.toString() || "0");
    const [capJuniors, setCapJuniors] = useState(tournament.capacity_juniors?.toString() || "0");
    const [capSeniors, setCapSeniors] = useState(tournament.capacity_seniors?.toString() || "0");
    const [capMasters, setCapMasters] = useState(tournament.capacity_masters?.toString() || "0");
    const [jrMax, setJrMax] = useState(tournament.juniors_birth_year_max?.toString() || "");
    const [srMax, setSrMax] = useState(tournament.seniors_birth_year_max?.toString() || "");

    // === State: Deck Lists ===
    const [requiresDeckList, setRequiresDeckList] = useState(tournament.requires_deck_list || false);
    const [deckSubmissionCutoffHours, setDeckSubmissionCutoffHours] = useState(tournament.deck_submission_cutoff_hours?.toString() || "1");

    // === State: Queue ===
    const [enableQueue, setEnableQueue] = useState(tournament.enable_queue || false);
    const [queuePromotionWindow, setQueuePromotionWindow] = useState(tournament.queue_promotion_window_minutes?.toString() || "10");
    const [queueBatchSize, setQueueBatchSize] = useState(tournament.queue_batch_size?.toString() || "10");
    const [queuePaused, setQueuePaused] = useState(tournament.queue_paused || false);

    // === State: Payment ===
    const [paymentRequired, setPaymentRequired] = useState(tournament.payment_required || false);
    const [paymentWebhookSecret, setPaymentWebhookSecret] = useState("");
    const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'generic'>((tournament.payment_provider as 'stripe' | 'generic') || 'stripe');
    const [paymentUrlJuniors, setPaymentUrlJuniors] = useState(tournament.payment_url_juniors || "");
    const [paymentUrlSeniors, setPaymentUrlSeniors] = useState(tournament.payment_url_seniors || "");
    const [paymentUrlMasters, setPaymentUrlMasters] = useState(tournament.payment_url_masters || "");

    // === State: Webhooks ===
    const [notificationWebhookUrl, setNotificationWebhookUrl] = useState("");
    const [notificationWebhookSecret, setNotificationWebhookSecret] = useState("");
    const [isTestingWebhook, setIsTestingWebhook] = useState(false);

    // === UI State ===
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

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

    // Parse start_time into date and time components on mount
    useEffect(() => {
        if (tournament.start_time) {
            try {
                const date = new Date(tournament.start_time);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    setStartDate(`${year}-${month}-${day}`);
                    setStartTime(date.toTimeString().slice(0, 5));
                }
            } catch (error) {
                console.error("Error parsing start_time:", error);
            }
        }
    }, [tournament.start_time]);

    // === Submit Handler (unchanged logic) ===
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
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

        const cutoffHours = parseInt(deckSubmissionCutoffHours, 10);
        if (cutoffHours < 0 || cutoffHours > 48) {
            toast.error("Deck submission cutoff must be between 0 and 48 hours.");
            setIsLoading(false);
            return;
        }

        if (!jrMax || !srMax) {
            toast.error("Juniors and Seniors division age cutoffs are mandatory.");
            setIsLoading(false);
            return;
        }

        let startTimeValue = null;
        let deckListSubmissionDeadline = tournament.deck_list_submission_deadline;

        if (startDate && startTime) {
            try {
                const combinedDateTime = new Date(`${startDate}T${startTime}`);
                if (isNaN(combinedDateTime.getTime())) {
                    throw new Error("Invalid date/time");
                }

                startTimeValue = combinedDateTime.toISOString();

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
                capacity: parseInt(overallCapacity || "0", 10),
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
                payment_provider: paymentRequired ? paymentProvider : 'stripe',
                payment_url_juniors: paymentRequired ? (paymentUrlJuniors || null) : null,
                payment_url_seniors: paymentRequired ? (paymentUrlSeniors || null) : null,
                payment_url_masters: paymentRequired ? (paymentUrlMasters || null) : null,
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

        if (error) {
            console.error("Tournament update error:", error);
            toast.error(`Failed to update tournament: ${error.message}`);
        } else if (secretsError) {
            console.error("Secrets upsert error:", secretsError);
            toast.warning("Tournament saved, but webhook secrets could not be updated. Check console for details.");
            router.refresh();
        } else {
            toast.success("Tournament settings saved");
            router.refresh();
        }

        setIsLoading(false);
    }, [
        tournament.id, tournament.deck_list_submission_deadline, isAdmin, router,
        tournamentMode, tomUid, organizerPopid, allowOnlineMatchReporting,
        startDate, startTime, registrationOpen, publishRoster,
        overallCapacity, capJuniors, capSeniors, capMasters, jrMax, srMax,
        requiresDeckList, deckSubmissionCutoffHours,
        enableQueue, queueBatchSize, queuePromotionWindow, queuePaused,
        paymentRequired, paymentProvider, paymentUrlJuniors, paymentUrlSeniors, paymentUrlMasters, paymentWebhookSecret,
        notificationWebhookUrl, notificationWebhookSecret,
    ]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tournament Configuration</CardTitle>
                <CardDescription>
                    Configure tournament settings including start time and deck submission deadlines.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent>
                    <Tabs defaultValue="registration" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
                            <TabsTrigger value="general" className="gap-1.5 text-xs">
                                <Settings className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">General</span>
                            </TabsTrigger>
                            <TabsTrigger value="registration" className="gap-1.5 text-xs">
                                <Users className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Registration</span>
                            </TabsTrigger>
                            <TabsTrigger value="decks" className="gap-1.5 text-xs">
                                <Layers className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Deck Lists</span>
                            </TabsTrigger>
                            <TabsTrigger value="payment" className="gap-1.5 text-xs">
                                <CreditCard className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Payment</span>
                            </TabsTrigger>
                            <TabsTrigger value="queue" className="gap-1.5 text-xs">
                                <ListOrdered className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Queue</span>
                            </TabsTrigger>
                            <TabsTrigger value="webhooks" className="gap-1.5 text-xs">
                                <Bell className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Webhooks</span>
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-6">
                            <TabsContent value="general" className="mt-0">
                                <GeneralPanel
                                    tournamentMode={tournamentMode} setTournamentMode={setTournamentMode}
                                    startDate={startDate} setStartDate={setStartDate}
                                    startTime={startTime} setStartTime={setStartTime}
                                    tomUid={tomUid} setTomUid={setTomUid}
                                    organizerPopid={organizerPopid} setOrganizerPopid={setOrganizerPopid}
                                    isAdmin={isAdmin}
                                    allowOnlineMatchReporting={allowOnlineMatchReporting} setAllowOnlineMatchReporting={setAllowOnlineMatchReporting}
                                />
                            </TabsContent>

                            <TabsContent value="registration" className="mt-0">
                                <RegistrationPanel
                                    registrationOpen={registrationOpen} setRegistrationOpen={setRegistrationOpen}
                                    publishRoster={publishRoster} setPublishRoster={setPublishRoster}
                                    overallCapacity={overallCapacity} setOverallCapacity={setOverallCapacity}
                                    capJuniors={capJuniors} setCapJuniors={setCapJuniors}
                                    capSeniors={capSeniors} setCapSeniors={setCapSeniors}
                                    capMasters={capMasters} setCapMasters={setCapMasters}
                                    jrMax={jrMax} setJrMax={setJrMax}
                                    srMax={srMax} setSrMax={setSrMax}
                                />
                            </TabsContent>

                            <TabsContent value="decks" className="mt-0">
                                <DeckPanel
                                    requiresDeckList={requiresDeckList} setRequiresDeckList={setRequiresDeckList}
                                    deckSubmissionCutoffHours={deckSubmissionCutoffHours} setDeckSubmissionCutoffHours={setDeckSubmissionCutoffHours}
                                />
                            </TabsContent>

                            <TabsContent value="payment" className="mt-0">
                                <PaymentPanel
                                    paymentRequired={paymentRequired} setPaymentRequired={setPaymentRequired}
                                    paymentProvider={paymentProvider} setPaymentProvider={setPaymentProvider}
                                    paymentUrlJuniors={paymentUrlJuniors} setPaymentUrlJuniors={setPaymentUrlJuniors}
                                    paymentUrlSeniors={paymentUrlSeniors} setPaymentUrlSeniors={setPaymentUrlSeniors}
                                    paymentUrlMasters={paymentUrlMasters} setPaymentUrlMasters={setPaymentUrlMasters}
                                    paymentWebhookSecret={paymentWebhookSecret} setPaymentWebhookSecret={setPaymentWebhookSecret}
                                />
                            </TabsContent>

                            <TabsContent value="queue" className="mt-0">
                                <QueuePanel
                                    enableQueue={enableQueue} setEnableQueue={setEnableQueue}
                                    queueBatchSize={queueBatchSize} setQueueBatchSize={setQueueBatchSize}
                                    queuePromotionWindow={queuePromotionWindow} setQueuePromotionWindow={setQueuePromotionWindow}
                                    queuePaused={queuePaused} setQueuePaused={setQueuePaused}
                                />
                            </TabsContent>

                            <TabsContent value="webhooks" className="mt-0">
                                <WebhookPanel
                                    tournamentId={tournament.id}
                                    notificationWebhookUrl={notificationWebhookUrl} setNotificationWebhookUrl={setNotificationWebhookUrl}
                                    notificationWebhookSecret={notificationWebhookSecret} setNotificationWebhookSecret={setNotificationWebhookSecret}
                                    isTestingWebhook={isTestingWebhook} setIsTestingWebhook={setIsTestingWebhook}
                                />
                            </TabsContent>
                        </div>
                    </Tabs>
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
