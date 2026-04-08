"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { createTournament } from "@/actions/tournament/create";
import type { StepBasicsData } from "./step-basics";
import type { StepRegistrationData } from "./step-registration";
import type { StepAdvancedData } from "./step-advanced";
import { getSeasonLabel } from "@/lib/tournament-templates";
import { MODE_LABELS } from "@/lib/utils";

type FormState = { error: string } | undefined;

interface StepReviewProps {
    basics: StepBasicsData;
    registration: StepRegistrationData;
    advanced: StepAdvancedData;
    showAdvanced: boolean;
    onBack: () => void;
    onEditStep: (step: number) => void;
    advancedStepId: number;
}



async function submitTournament(_prevState: FormState, formData: FormData) {
    return await createTournament(formData);
}

function ReviewRow({ label, value, mono }: { label: string; value: string | React.ReactNode; mono?: boolean }) {
    return (
        <div className="flex justify-between items-start py-1.5">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className={`text-sm font-medium text-right max-w-[60%] ${mono ? "font-mono" : ""}`}>{value}</span>
        </div>
    );
}

function BoolBadge({ value, trueLabel, falseLabel }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
    return value ? (
        <Badge variant="default" className="text-[10px] gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {trueLabel || "Enabled"}
        </Badge>
    ) : (
        <Badge variant="secondary" className="text-[10px] gap-1">
            <XCircle className="h-3 w-3" />
            {falseLabel || "Disabled"}
        </Badge>
    );
}

export function StepReview({ basics, registration, advanced, showAdvanced, onBack, onEditStep, advancedStepId }: StepReviewProps) {
    const [state, formAction, isPending] = useActionState(submitTournament, undefined);
    const seasonLabel = getSeasonLabel();

    // Compute exact UTC ISO string based on the user's local timezone for exact start time handling
    const combinedDateTime = new Date(`${basics.date}T${basics.startTime}`);
    const localIsoString = !isNaN(combinedDateTime.getTime()) ? combinedDateTime.toISOString() : "";

    const overallCap = parseInt(registration.overallCapacity || "0");

    const totalDivCap =
        parseInt(registration.capJuniors || "0") +
        parseInt(registration.capSeniors || "0") +
        parseInt(registration.capMasters || "0");

    const hasAdvancedSettings =
        advanced.enableQueue ||
        advanced.paymentRequired ||
        !!advanced.notificationWebhookUrl;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Review & Create</CardTitle>
                <CardDescription>
                    Check everything looks right before creating your tournament.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {state?.error && (
                    <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md font-medium">
                        {state.error}
                    </div>
                )}

                <form action={formAction}>
                    {/* Hidden fields — everything the server action needs */}
                    <input type="hidden" name="tournament_mode" value={basics.tournamentMode} />
                    <input type="hidden" name="name" value={basics.name} />
                    <input type="hidden" name="date" value={basics.date} />
                    <input type="hidden" name="start_time_local_iso" value={localIsoString} />
                    <input type="hidden" name="start_time" value={basics.startTime} />
                    <input type="hidden" name="city" value={basics.city} />
                    <input type="hidden" name="country" value={basics.country} />
                    <input type="hidden" name="tom_uid" value={basics.tomUid} />
                    <input type="hidden" name="organizer_popid" value={basics.organizerPopid} />
                    <input type="hidden" name="registration_open" value={registration.registrationOpen ? "true" : ""} />
                    <input type="hidden" name="registration_open_fallback" value="false" />
                    <input type="hidden" name="publish_roster" value={registration.publishRoster ? "true" : ""} />
                    <input type="hidden" name="publish_roster_fallback" value="false" />
                    <input type="hidden" name="allow_online_match_reporting" value={registration.allowOnlineMatch ? "true" : ""} />
                    <input type="hidden" name="allow_online_match_reporting_fallback" value="false" />
                    <input type="hidden" name="requires_deck_list" value={registration.requiresDeckList ? "true" : ""} />
                    <input type="hidden" name="requires_deck_list_fallback" value="false" />
                    <input type="hidden" name="deck_submission_cutoff_hours" value={registration.deckCutoff} />
                    <input type="hidden" name="capacity" value={registration.overallCapacity} />
                    <input type="hidden" name="capacity_juniors" value={registration.capJuniors} />
                    <input type="hidden" name="capacity_seniors" value={registration.capSeniors} />
                    <input type="hidden" name="capacity_masters" value={registration.capMasters} />
                    <input type="hidden" name="juniors_birth_year_max" value={registration.jrMax} />
                    <input type="hidden" name="seniors_birth_year_max" value={registration.srMax} />
                    {/* Advanced hidden fields */}
                    <input type="hidden" name="enable_queue" value={advanced.enableQueue ? "true" : ""} />
                    <input type="hidden" name="queue_batch_size" value={advanced.queueBatchSize} />
                    <input type="hidden" name="queue_promotion_window_minutes" value={advanced.queuePromotionWindow} />
                    <input type="hidden" name="payment_required" value={advanced.paymentRequired ? "true" : ""} />
                    <input type="hidden" name="payment_provider" value={advanced.paymentProvider} />
                    <input type="hidden" name="payment_url_juniors" value={advanced.paymentUrlJuniors} />
                    <input type="hidden" name="payment_url_seniors" value={advanced.paymentUrlSeniors} />
                    <input type="hidden" name="payment_url_masters" value={advanced.paymentUrlMasters} />
                    <input type="hidden" name="notification_webhook_url" value={advanced.notificationWebhookUrl} />

                    {/* Section: Event Details */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                Event Details
                            </h3>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => onEditStep(1)}
                            >
                                Edit
                            </Button>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-md divide-y divide-border/50">
                            <ReviewRow label="Type" value={MODE_LABELS[basics.tournamentMode] || basics.tournamentMode} />
                            <ReviewRow label="Name" value={basics.name} />
                            <ReviewRow label="Date" value={basics.date} />
                            <ReviewRow label="Start Time" value={basics.startTime} />
                            <ReviewRow label="Location" value={`${basics.city}${basics.country ? `, ${basics.country}` : ""}`} />
                            {basics.tomUid && <ReviewRow label="Sanction ID" value={basics.tomUid} mono />}
                        </div>
                    </div>

                    {/* Section: Registration & Divisions */}
                    <div className="space-y-1 mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                Registration & Divisions
                            </h3>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => onEditStep(2)}
                            >
                                Edit
                            </Button>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-md divide-y divide-border/50">
                            <ReviewRow
                                label="Online Registration"
                                value={<BoolBadge value={registration.registrationOpen} trueLabel="Open" falseLabel="Closed" />}
                            />
                            <ReviewRow
                                label="Public Roster"
                                value={<BoolBadge value={registration.publishRoster} />}
                            />
                            <ReviewRow
                                label="Match Reporting"
                                value={<BoolBadge value={registration.allowOnlineMatch} />}
                            />
                            <ReviewRow
                                label="Deck Lists"
                                value={
                                    registration.requiresDeckList
                                        ? <Badge variant="default" className="text-[10px]">Required ({registration.deckCutoff}h cutoff)</Badge>
                                        : <BoolBadge value={false} falseLabel="Not required" />
                                }
                            />
                            <ReviewRow
                                label="Overall Capacity"
                                value={overallCap > 0 ? `${overallCap} players` : "Unlimited"}
                            />
                            <ReviewRow
                                label="Division Caps"
                                value={
                                    totalDivCap > 0
                                        ? `Jr: ${registration.capJuniors}, Sr: ${registration.capSeniors}, Ma: ${registration.capMasters}`
                                        : "Unlimited per division"
                                }
                            />
                            <ReviewRow
                                label="Age Cutoffs"
                                value={
                                    <span className="text-right">
                                        Jr ≥ {registration.jrMax}, Sr ≥ {registration.srMax}
                                        <span className="text-muted-foreground ml-1 text-[10px]">({seasonLabel})</span>
                                    </span>
                                }
                            />
                        </div>
                    </div>

                    {/* Section: Advanced Settings (only if user opted in) */}
                    {showAdvanced && hasAdvancedSettings && (
                        <div className="space-y-1 mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                    Advanced Settings
                                </h3>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => onEditStep(advancedStepId)}
                                >
                                    Edit
                                </Button>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-md divide-y divide-border/50">
                                <ReviewRow
                                    label="Registration Queue"
                                    value={
                                        advanced.enableQueue
                                            ? <Badge variant="default" className="text-[10px]">
                                                Batch: {advanced.queueBatchSize}, Window: {advanced.queuePromotionWindow}min
                                              </Badge>
                                            : <BoolBadge value={false} />
                                    }
                                />
                                <ReviewRow
                                    label="Payment Required"
                                    value={
                                        advanced.paymentRequired
                                            ? <Badge variant="default" className="text-[10px]">
                                                {advanced.paymentProvider === "stripe" ? "Stripe" : "Generic"}
                                              </Badge>
                                            : <BoolBadge value={false} falseLabel="Off" />
                                    }
                                />
                                {advanced.paymentRequired && advanced.paymentUrlMasters && (
                                    <ReviewRow label="Masters Payment" value="✓ Configured" />
                                )}
                                {advanced.paymentRequired && advanced.paymentUrlSeniors && (
                                    <ReviewRow label="Seniors Payment" value="✓ Configured" />
                                )}
                                {advanced.paymentRequired && advanced.paymentUrlJuniors && (
                                    <ReviewRow label="Juniors Payment" value="✓ Configured" />
                                )}
                                {advanced.notificationWebhookUrl && (
                                    <ReviewRow label="Notification Webhook" value="✓ Configured" />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="pt-6 border-t mt-6 flex justify-between">
                        <Button type="button" variant="outline" onClick={onBack} className="gap-2" disabled={isPending}>
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                        <Button type="submit" disabled={isPending} className="gap-2 min-w-[160px]">
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Create Tournament
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
