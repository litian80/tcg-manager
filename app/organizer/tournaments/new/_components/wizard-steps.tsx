"use client";

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
    id: number;
    label: string;
    description: string;
}

const BASE_STEPS: WizardStep[] = [
    { id: 1, label: "Basics", description: "Event details" },
    { id: 2, label: "Registration", description: "Divisions & settings" },
];

const ADVANCED_STEP: WizardStep = { id: 3, label: "Advanced", description: "Queue, payment & hooks" };

function buildSteps(showAdvanced: boolean): WizardStep[] {
    if (showAdvanced) {
        return [
            ...BASE_STEPS,
            ADVANCED_STEP,
            { id: 4, label: "Review", description: "Confirm & create" },
        ];
    }
    return [
        ...BASE_STEPS,
        { id: 3, label: "Review", description: "Confirm & create" },
    ];
}

interface WizardStepsProps {
    currentStep: number;
    showAdvanced: boolean;
    onStepClick?: (step: number) => void;
}

export function WizardSteps({ currentStep, showAdvanced, onStepClick }: WizardStepsProps) {
    const steps = buildSteps(showAdvanced);

    return (
        <nav aria-label="Tournament creation steps" className="mb-8">
            <ol className="flex items-center w-full">
                {steps.map((step, index) => {
                    const isCompleted = currentStep > step.id;
                    const isCurrent = currentStep === step.id;
                    const isClickable = isCompleted && onStepClick;

                    return (
                        <li
                            key={step.id}
                            className={cn(
                                "flex items-center",
                                index < steps.length - 1 && "flex-1"
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => isClickable && onStepClick(step.id)}
                                disabled={!isClickable}
                                className={cn(
                                    "flex items-center gap-2 group",
                                    isClickable && "cursor-pointer",
                                    !isClickable && "cursor-default"
                                )}
                            >
                                {/* Step circle */}
                                <span
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0 transition-all",
                                        isCompleted && "bg-primary text-primary-foreground",
                                        isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
                                        !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                                    )}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        step.id
                                    )}
                                </span>

                                {/* Step text */}
                                <div className="hidden sm:block text-left">
                                    <p
                                        className={cn(
                                            "text-sm font-medium leading-none",
                                            (isCurrent || isCompleted) ? "text-foreground" : "text-muted-foreground"
                                        )}
                                    >
                                        {step.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {step.description}
                                    </p>
                                </div>
                            </button>

                            {/* Connector line */}
                            {index < steps.length - 1 && (
                                <div
                                    className={cn(
                                        "flex-1 h-px mx-3 sm:mx-4 transition-colors",
                                        isCompleted ? "bg-primary" : "bg-border"
                                    )}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

/**
 * Returns the step ID for the Review step based on whether advanced is shown.
 */
export function getReviewStep(showAdvanced: boolean): number {
    return showAdvanced ? 4 : 3;
}

/**
 * Returns the step ID for the Advanced step (only valid when showAdvanced is true).
 */
export function getAdvancedStep(): number {
    return 3;
}
