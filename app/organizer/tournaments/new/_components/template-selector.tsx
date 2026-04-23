"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TemplateOption, TemplateId, TournamentFormDefaults } from "@/lib/tournament-templates";
import { SYSTEM_TEMPLATES } from "@/lib/tournament-templates";

interface TemplateSelectorProps {
    selected: TemplateId | null;
    onSelect: (template: TemplateOption) => void;
    savedTemplates?: Record<string, Partial<TournamentFormDefaults>>;
}

export function TemplateSelector({ selected, onSelect, savedTemplates }: TemplateSelectorProps) {
    return (
        <div className="space-y-3">
            <div>
                <h2 className="text-lg font-semibold tracking-tight">Choose Event Type</h2>
                <p className="text-sm text-muted-foreground">
                    Select a template to pre-fill your settings. You can adjust everything before creating.
                </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SYSTEM_TEMPLATES.map((template) => {
                    const isSelected = selected === template.id;
                    const hasSaved = savedTemplates && savedTemplates[template.mode];
                    
                    // Merge saved template overrides with system defaults
                    const effectiveTemplate = hasSaved
                        ? { ...template, defaults: { ...template.defaults, ...savedTemplates[template.mode] } }
                        : template;

                    return (
                        <Card
                            key={template.id}
                            className={cn(
                                "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
                                isSelected && "border-primary ring-2 ring-primary/20 shadow-md"
                            )}
                            onClick={() => onSelect(effectiveTemplate)}
                        >
                            <CardContent className="p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{template.icon}</span>
                                        <span className="font-semibold">{template.label}</span>
                                    </div>
                                    {hasSaved && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                            Saved
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {template.description}
                                </p>
                                <div className="flex flex-wrap gap-1 pt-1">
                                    <Badge variant="outline" className="text-[10px]">
                                        {effectiveTemplate.defaults.start_time}
                                    </Badge>
                                    {effectiveTemplate.defaults.capacity_masters > 0 && (
                                        <Badge variant="outline" className="text-[10px]">
                                            {effectiveTemplate.defaults.capacity_masters} Masters
                                        </Badge>
                                    )}
                                    {effectiveTemplate.defaults.requires_deck_list && (
                                        <Badge variant="outline" className="text-[10px]">
                                            {effectiveTemplate.defaults.game_type === 'VIDEO_GAME' ? 'Team lists' : 'Deck lists'}
                                        </Badge>
                                    )}
                                    {effectiveTemplate.defaults.city && (
                                        <Badge variant="outline" className="text-[10px]">
                                            📍 {effectiveTemplate.defaults.city}
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
