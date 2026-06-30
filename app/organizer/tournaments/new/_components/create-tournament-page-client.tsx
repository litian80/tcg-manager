"use client";

import { useState, useCallback } from "react";
import { WizardSteps, getReviewStep, getAdvancedStep } from "./wizard-steps";
import { StepBasics, type StepBasicsData } from "./step-basics";
import { StepRegistration, type StepRegistrationData } from "./step-registration";
import { StepAdvanced, type StepAdvancedData } from "./step-advanced";
import { StepReview } from "./step-review";
import type { TournamentFormDefaults } from "@/lib/tournament-templates";
import { getSeasonCutoffs, getSystemDefaults } from "@/lib/tournament-templates";
import { toast } from "sonner";

interface CreateTournamentPageClientProps {
    userRole: string;
    userPopId: string;
    savedTemplates: Record<string, Partial<TournamentFormDefaults>>;
    duplicateDefaults: (TournamentFormDefaults & { name: string; date: string }) | null;
}

/**
 * Returns system defaults for a mode, merged with any saved organiser overrides.
 */
function getEffectiveDefaults(
    mode: string,
    savedTemplates: Record<string, Partial<TournamentFormDefaults>>
): TournamentFormDefaults {
    const systemDefaults = getSystemDefaults(mode);
    const saved = savedTemplates[mode];
    return saved ? { ...systemDefaults, ...saved } : systemDefaults;
}

/**
 * Validates Step 1 fields. Returns a map of field → error message.
 */
function validateBasics(data: StepBasicsData): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!data.name.trim()) errors.name = "Tournament name is required.";
    if (!data.date) errors.date = "Date is required.";
    if (!data.city.trim()) errors.city = "City is required.";
    if (data.tomUid && !/^\d{2}-\d{2}-\d{6}$/.test(data.tomUid)) {
        errors.tomUid = "Invalid format. Expected: XX-XX-XXXXXX (e.g. 25-01-000001)";
    }
    return errors;
}

export function CreateTournamentPageClient({
    userRole,
    userPopId,
    savedTemplates,
    duplicateDefaults,
}: CreateTournamentPageClientProps) {
    const isAdmin = userRole === "admin";
    const season = getSeasonCutoffs();

    // Wizard step + advanced toggle state
    const [currentStep, setCurrentStep] = useState(1);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [basicsErrors, setBasicsErrors] = useState<Record<string, string>>({});

    // Computed step IDs
    const reviewStep = getReviewStep(showAdvanced);
    const advancedStep = getAdvancedStep();

    // --- Build initial defaults ---
    const initialMode = duplicateDefaults?.tournament_mode || 'LEAGUECHALLENGE';
    const initialDefaults = duplicateDefaults || getEffectiveDefaults(initialMode, savedTemplates);

    // --- Build state from defaults ---
    const buildBasicsFromDefaults = useCallback(
        (defaults?: TournamentFormDefaults | null, dupName?: string): StepBasicsData => ({
            tournamentMode: defaults?.tournament_mode || "LEAGUECHALLENGE",
            name: dupName || "",
            date: "",
            startTime: defaults?.start_time || "13:00",
            city: defaults?.city || "",
            country: defaults?.country || "",
            tomUid: "",
            organizerPopid: userPopId,
        }),
        [userPopId]
    );

    const buildRegistrationFromDefaults = useCallback(
        (defaults?: TournamentFormDefaults | null): StepRegistrationData => {
            const isGO = defaults?.game_type === 'GO';
            return {
                registrationOpen: defaults?.registration_open ?? false,
                publishRoster: defaults?.publish_roster ?? false,
                allowOnlineMatch: defaults?.allow_online_match_reporting ?? false,
                requiresDeckList: defaults?.requires_deck_list ?? false,
                deckCutoff: defaults?.deck_submission_cutoff_hours?.toString() ?? "0",
                overallCapacity: isGO
                    ? (defaults?.capacity_open?.toString() ?? "0")
                    : ((defaults as any)?.capacity?.toString() ?? "0"),
                capJuniors: defaults?.capacity_juniors?.toString() ?? "0",
                capSeniors: defaults?.capacity_seniors?.toString() ?? "0",
                capMasters: defaults?.capacity_masters?.toString() ?? "0",
                jrMax: defaults?.juniors_birth_year_max?.toString() ?? (isGO ? "" : season.juniorsBornAfter.toString()),
                srMax: defaults?.seniors_birth_year_max?.toString() ?? (isGO ? "" : season.seniorsBornAfter.toString()),
            };
        },
        [season.juniorsBornAfter, season.seniorsBornAfter]
    );

    const defaultAdvanced: StepAdvancedData = {
        enableQueue: false,
        queueBatchSize: "10",
        queuePromotionWindow: "10",
        paymentRequired: false,
        paymentProvider: "stripe",
        paymentUrlJuniors: "",
        paymentUrlSeniors: "",
        paymentUrlMasters: "",
        notificationWebhookUrl: "",
    };

    // Generate duplicate name suggestion
    let suggestedName: string | undefined;
    if (duplicateDefaults) {
        const now = new Date();
        const monthYear = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
        suggestedName = `${duplicateDefaults.name} — ${monthYear}`;
    }

    // Form state for each step
    const [basics, setBasics] = useState<StepBasicsData>(
        buildBasicsFromDefaults(initialDefaults, suggestedName)
    );
    const [registration, setRegistration] = useState<StepRegistrationData>(
        buildRegistrationFromDefaults(initialDefaults)
    );
    const [advanced, setAdvanced] = useState<StepAdvancedData>(defaultAdvanced);

    // --- Tournament Type change handler ---
    // When the user changes Tournament Type in Step Basics, reload defaults
    const handleModeChange = useCallback((newMode: string) => {
        const effective = getEffectiveDefaults(newMode, savedTemplates);
        // Update basics fields that come from the template (preserve user-entered name, date, etc.)
        setBasics(prev => ({
            ...prev,
            startTime: effective.start_time || prev.startTime,
            city: effective.city || prev.city,
            country: effective.country || prev.country,
        }));
        setRegistration(buildRegistrationFromDefaults(effective));
        setAdvanced(defaultAdvanced);
        setShowAdvanced(false);
        setBasicsErrors({});
    }, [savedTemplates, buildRegistrationFromDefaults, defaultAdvanced]);

    // --- Step navigation ---
    const goToStep = (step: number) => {
        setCurrentStep(step);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleNextFromBasics = () => {
        const errors = validateBasics(basics);
        setBasicsErrors(errors);
        if (Object.keys(errors).length > 0) return;
        goToStep(2);
    };

    const handleNextFromRegistration = () => {
        const isGOMode = basics.tournamentMode === 'GOPREMIER';
        if (!isGOMode && (!registration.jrMax || !registration.srMax)) {
            toast.error("Juniors and Seniors age divisions cutoffs are mandatory.");
            return;
        }

        if (showAdvanced) {
            goToStep(advancedStep); // Go to Advanced
        } else {
            goToStep(reviewStep); // Skip to Review
        }
    };

    const handleNextFromAdvanced = () => {
        goToStep(reviewStep);
    };

    const handleToggleAdvanced = () => {
        setShowAdvanced(true);
    };

    return (
        <div className="space-y-6">
            <WizardSteps
                currentStep={currentStep}
                showAdvanced={showAdvanced}
                onStepClick={(step) => {
                    if (step < currentStep) goToStep(step);
                }}
            />

            {currentStep === 1 && (
                <StepBasics
                    data={basics}
                    onChange={setBasics}
                    onNext={handleNextFromBasics}
                    onModeChange={handleModeChange}
                    userPopId={userPopId}
                    isAdmin={isAdmin}
                    errors={basicsErrors}
                />
            )}

            {currentStep === 2 && (
                <StepRegistration
                    data={registration}
                    onChange={setRegistration}
                    onNext={handleNextFromRegistration}
                    onBack={() => goToStep(1)}
                    showAdvanced={showAdvanced}
                    onToggleAdvanced={handleToggleAdvanced}
                    tournamentMode={basics.tournamentMode}
                />
            )}

            {showAdvanced && currentStep === advancedStep && (
                <StepAdvanced
                    data={advanced}
                    onChange={setAdvanced}
                    onNext={handleNextFromAdvanced}
                    onBack={() => goToStep(2)}
                />
            )}

            {currentStep === reviewStep && (
                <StepReview
                    basics={basics}
                    registration={registration}
                    advanced={advanced}
                    showAdvanced={showAdvanced}
                    onBack={() => goToStep(showAdvanced ? advancedStep : 2)}
                    onEditStep={goToStep}
                    advancedStepId={advancedStep}
                />
            )}
        </div>
    );
}
