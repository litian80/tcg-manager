"use client";

import { useState, useCallback } from "react";
import { TemplateSelector } from "./template-selector";
import { WizardSteps, getReviewStep, getAdvancedStep } from "./wizard-steps";
import { StepBasics, type StepBasicsData } from "./step-basics";
import { StepRegistration, type StepRegistrationData } from "./step-registration";
import { StepAdvanced, type StepAdvancedData } from "./step-advanced";
import { StepReview } from "./step-review";
import type { TemplateOption, TemplateId, TournamentFormDefaults } from "@/lib/tournament-templates";
import { getSeasonCutoffs } from "@/lib/tournament-templates";
import { toast } from "sonner";

interface CreateTournamentPageClientProps {
    userRole: string;
    userPopId: string;
    savedTemplates: Record<string, Partial<TournamentFormDefaults>>;
    duplicateDefaults: (TournamentFormDefaults & { name: string; date: string }) | null;
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
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);
    const [showWizard, setShowWizard] = useState(!!duplicateDefaults);
    const [basicsErrors, setBasicsErrors] = useState<Record<string, string>>({});

    // Computed step IDs
    const reviewStep = getReviewStep(showAdvanced);
    const advancedStep = getAdvancedStep();

    // --- Build initial state from defaults (template or duplicate) ---
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
        (defaults?: TournamentFormDefaults | null): StepRegistrationData => ({
            registrationOpen: defaults?.registration_open ?? false,
            publishRoster: defaults?.publish_roster ?? false,
            allowOnlineMatch: defaults?.allow_online_match_reporting ?? false,
            requiresDeckList: defaults?.requires_deck_list ?? false,
            deckCutoff: defaults?.deck_submission_cutoff_hours?.toString() ?? "0",
            overallCapacity: (defaults as any)?.capacity?.toString() ?? "0",
            capJuniors: defaults?.capacity_juniors?.toString() ?? "0",
            capSeniors: defaults?.capacity_seniors?.toString() ?? "0",
            capMasters: defaults?.capacity_masters?.toString() ?? "0",
            jrMax: defaults?.juniors_birth_year_max?.toString() ?? season.juniorsBornAfter.toString(),
            srMax: defaults?.seniors_birth_year_max?.toString() ?? season.seniorsBornAfter.toString(),
        }),
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
        buildBasicsFromDefaults(duplicateDefaults, suggestedName)
    );
    const [registration, setRegistration] = useState<StepRegistrationData>(
        buildRegistrationFromDefaults(duplicateDefaults)
    );
    const [advanced, setAdvanced] = useState<StepAdvancedData>(defaultAdvanced);

    // --- Template selection handler ---
    const handleTemplateSelect = (template: TemplateOption) => {
        setSelectedTemplate(template.id);
        setBasics(buildBasicsFromDefaults(template.defaults));
        setRegistration(buildRegistrationFromDefaults(template.defaults));
        setAdvanced(defaultAdvanced);
        setCurrentStep(1);
        setShowAdvanced(false);
        setBasicsErrors({});
        setShowWizard(true);
    };

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
        if (!registration.jrMax || !registration.srMax) {
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
            {/* Template selector — only when NOT duplicating */}
            {!duplicateDefaults && (
                <TemplateSelector
                    selected={selectedTemplate}
                    onSelect={handleTemplateSelect}
                    savedTemplates={savedTemplates}
                />
            )}

            {/* Wizard — shown once a template is selected or duplicating */}
            {showWizard && (
                <>
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
                </>
            )}
        </div>
    );
}
