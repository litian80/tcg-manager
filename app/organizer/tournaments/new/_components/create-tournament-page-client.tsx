"use client";

import { useState } from "react";
import { TemplateSelector } from "./template-selector";
import { CreateTournamentForm } from "../create-tournament-form";
import type { TemplateOption, TemplateId, TournamentFormDefaults } from "@/lib/tournament-templates";

interface CreateTournamentPageClientProps {
    userRole: string;
    userPopId: string;
    savedTemplates: Record<string, Partial<TournamentFormDefaults>>;
    duplicateDefaults: (TournamentFormDefaults & { name: string; date: string }) | null;
}

export function CreateTournamentPageClient({
    userRole,
    userPopId,
    savedTemplates,
    duplicateDefaults,
}: CreateTournamentPageClientProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(
        duplicateDefaults ? null : null
    );
    const [formDefaults, setFormDefaults] = useState<TournamentFormDefaults | undefined>(
        duplicateDefaults || undefined
    );
    const [duplicateName, setDuplicateName] = useState<string | undefined>(undefined);

    const handleTemplateSelect = (template: TemplateOption) => {
        setSelectedTemplate(template.id);
        setFormDefaults(template.defaults);
        setDuplicateName(undefined);
    };

    // Auto-generate duplicate name suggestion
    let suggestedName = duplicateName;
    if (duplicateDefaults && !suggestedName) {
        const now = new Date();
        const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        suggestedName = `${duplicateDefaults.name} — ${monthYear}`;
    }

    return (
        <div className="space-y-6">
            {/* Show template selector only when NOT duplicating */}
            {!duplicateDefaults && (
                <TemplateSelector
                    selected={selectedTemplate}
                    onSelect={handleTemplateSelect}
                    savedTemplates={savedTemplates}
                />
            )}

            {/* Show form when a template is selected OR when duplicating */}
            {(formDefaults || duplicateDefaults) && (
                <CreateTournamentForm
                    userRole={userRole}
                    userPopId={userPopId}
                    defaults={formDefaults || duplicateDefaults || undefined}
                    duplicateName={suggestedName}
                />
            )}
        </div>
    );
}
