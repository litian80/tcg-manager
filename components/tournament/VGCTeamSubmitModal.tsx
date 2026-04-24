"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle, CheckCircle2, Info, Copy, Swords } from "lucide-react";
import { submitVGCTeamAction } from "@/actions/vgc/submission";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseShowdownPaste } from "@/lib/vgc/parser";
import { validateTeam } from "@/lib/vgc/validator";
import type { VGCPokemon, VGCParseError, VGCValidationResult } from "@/lib/vgc/types";

// --- Types ---

interface VGCTeamSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  initialPasteText?: string;
  initialGameProfile?: {
    trainerName?: string;
    battleTeamName?: string;
    switchProfileName?: string;
  };
  onSuccess?: (newPasteText: string, gameProfile: { trainerName?: string; battleTeamName?: string; switchProfileName?: string }) => void;
}

// --- Constants ---

const MAX_CHAR_LIMIT = 8000;
const AUTO_SAVE_KEY_PREFIX = "vgc-team-draft-";
const AUTO_SAVE_DEBOUNCE_MS = 1000;

// --- Sub-components ---

function TeamEditor({
  value,
  onChange,
  maxLength,
}: {
  value: string;
  onChange: (val: string) => void;
  maxLength: number;
}) {
  const isEmpty = !value.trim();

  return (
    <div className="flex-1 mt-0 overflow-hidden flex flex-col">
      <div className="flex-1 relative">
        <Textarea
          id="vgc-team-textarea"
          aria-label="VGC team paste input"
          placeholder={`Paste Pokémon Showdown team export here...

Example:
Flutter Mane @ Booster Energy
Ability: Protosynthesis
Level: 50
Tera Type: Fairy
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Shadow Ball
- Moonblast
- Mystical Fire
- Protect`}
          className="h-full min-h-[400px] font-mono text-sm resize-none focus-visible:ring-1"
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 opacity-50 hover:opacity-100"
          disabled={isEmpty}
          onClick={() => {
            if (isEmpty) return;
            navigator.clipboard.writeText(value);
            toast.success("Copied to clipboard");
          }}
          title={isEmpty ? "Nothing to copy" : "Copy to clipboard"}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-1 text-xs text-muted-foreground text-right">
        {value.length} / {maxLength} characters
      </div>
    </div>
  );
}

// --- Pokémon Preview Card ---

function PokemonPreview({ pokemon, index }: { pokemon: VGCPokemon; index: number }) {
  const totalEVs = pokemon.evs.hp + pokemon.evs.atk + pokemon.evs.def + pokemon.evs.spa + pokemon.evs.spd + pokemon.evs.spe;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-1.5">
      {/* Header: Species + Item */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-muted-foreground w-4 text-right">#{index + 1}</span>
          <span className="font-semibold text-sm truncate">
            {pokemon.nickname ? `${pokemon.nickname} (${pokemon.species})` : pokemon.species}
          </span>
          {pokemon.gender && (
            <span className={cn("text-xs font-bold", pokemon.gender === "M" ? "text-blue-500" : "text-pink-500")}>
              {pokemon.gender === "M" ? "♂" : "♀"}
            </span>
          )}
          {pokemon.shiny && <span className="text-xs">✨</span>}
        </div>
        {pokemon.item && (
          <Badge variant="outline" className="text-[10px] font-mono flex-shrink-0">
            {pokemon.item}
          </Badge>
        )}
      </div>

      {/* Ability + Tera + Nature */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span><strong>Ability:</strong> {pokemon.ability}</span>
        {pokemon.teraType && <span><strong>Tera:</strong> {pokemon.teraType}</span>}
        {pokemon.nature && <span><strong>Nature:</strong> {pokemon.nature}</span>}
        <span><strong>Lv:</strong> {pokemon.level}</span>
      </div>

      {/* Moves */}
      <div className="flex flex-wrap gap-1">
        {pokemon.moves.map((move, i) => (
          <Badge key={i} variant="secondary" className="text-[10px] font-normal">
            {move}
          </Badge>
        ))}
      </div>

      {/* EVs (compact) */}
      {totalEVs > 0 && (
        <div className="text-[10px] font-mono text-muted-foreground">
          EVs: {formatStats(pokemon.evs)}
        </div>
      )}
    </div>
  );
}

function formatStats(stats: VGCPokemon["evs"]): string {
  const parts: string[] = [];
  if (stats.hp > 0) parts.push(`${stats.hp} HP`);
  if (stats.atk > 0) parts.push(`${stats.atk} Atk`);
  if (stats.def > 0) parts.push(`${stats.def} Def`);
  if (stats.spa > 0) parts.push(`${stats.spa} SpA`);
  if (stats.spd > 0) parts.push(`${stats.spd} SpD`);
  if (stats.spe > 0) parts.push(`${stats.spe} Spe`);
  return parts.join(" / ") || "None";
}

// --- Validation feedback for VGC ---

function VGCValidationFeedback({
  errors,
  warnings,
  isValid,
  isValidating,
}: {
  errors: VGCParseError[];
  warnings: string[];
  isValid: boolean | null;
  isValidating: boolean;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        Validation Status
        {isValid !== null && (
          isValid ? (
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Valid</Badge>
          ) : (
            <Badge variant="destructive">Invalid</Badge>
          )
        )}
      </h3>

      {isValidating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-bounce pb-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Verifying team legality...
        </div>
      )}

      {errors.length > 0 && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errors ({errors.length})</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside text-xs mt-1 space-y-1">
              {errors.map((err, i) => (
                <li key={i}>{err.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800 [&>svg]:text-amber-600">
          <Info className="h-4 w-4" />
          <AlertTitle>Warnings</AlertTitle>
          <AlertDescription className="text-xs">
            <ul className="list-disc list-inside mt-1 space-y-1">
              {warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {isValid && (
        <Alert className="border-green-200 bg-green-50 text-green-800 [&>svg]:text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Ready to Submit</AlertTitle>
          <AlertDescription className="text-xs">
            Your team list passes all validation checks.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// --- Main Component ---

export function VGCTeamSubmitModal({
  isOpen,
  onClose,
  tournamentId,
  initialPasteText = "",
  initialGameProfile,
  onSuccess,
}: VGCTeamSubmitModalProps) {
  const autoSaveKey = `${AUTO_SAVE_KEY_PREFIX}${tournamentId}`;

  const [pasteText, setPasteText] = useState(() => {
    if (typeof window === "undefined") return initialPasteText;
    try {
      const saved = localStorage.getItem(autoSaveKey);
      return saved || initialPasteText;
    } catch {
      return initialPasteText;
    }
  });

  // Game profile fields
  const [trainerName, setTrainerName] = useState(initialGameProfile?.trainerName || "");
  const [battleTeamName, setBattleTeamName] = useState(initialGameProfile?.battleTeamName || "");
  const [switchProfileName, setSwitchProfileName] = useState(initialGameProfile?.switchProfileName || "");

  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsedTeam, setParsedTeam] = useState<VGCPokemon[]>([]);
  const [errors, setErrors] = useState<VGCParseError[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const stateRef = useRef({
    pasteText,
    isValidating,
    isSubmitting,
    tournamentId,
    autoSaveKey,
    isValid,
    trainerName,
    battleTeamName,
    switchProfileName,
  });

  useEffect(() => {
    stateRef.current = { pasteText, isValidating, isSubmitting, tournamentId, autoSaveKey, isValid, trainerName, battleTeamName, switchProfileName };
  }, [pasteText, isValidating, isSubmitting, tournamentId, autoSaveKey, isValid, trainerName, battleTeamName, switchProfileName]);

  const isLoaded = useRef(false);

  // Reset/sync state on open
  useEffect(() => {
    if (isOpen) {
      try {
        const savedDraft = localStorage.getItem(autoSaveKey);
        if (savedDraft) setPasteText(savedDraft);
      } catch { /* ignore */ }
      setIsValid(null);
      setParsedTeam([]);
      setErrors([]);
      setWarnings([]);
      isLoaded.current = true;
    } else {
      isLoaded.current = false;
    }
  }, [isOpen, initialPasteText, autoSaveKey]);

  // Auto-save draft
  useEffect(() => {
    if (!isOpen || !isLoaded.current || pasteText === initialPasteText) return;
    const timeoutId = setTimeout(() => {
      try { localStorage.setItem(autoSaveKey, pasteText); } catch { /* ignore */ }
    }, AUTO_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [pasteText, isOpen, initialPasteText, autoSaveKey]);

  // Clear validation when text changes
  useEffect(() => {
    if (isValid !== null) {
      setIsValid(null);
      setParsedTeam([]);
      setErrors([]);
      setWarnings([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasteText]);

  // Client-side validation (parser + validator run in browser)
  const handleValidate = useCallback(() => {
    if (stateRef.current.isValidating || stateRef.current.isSubmitting) return;

    const trimmed = stateRef.current.pasteText.trim();
    if (!trimmed) {
      toast.error("Please paste your team first.");
      return;
    }

    setIsValidating(true);

    // Run parser + validator synchronously (no server call needed for validation)
    try {
      const parseResult = parseShowdownPaste(trimmed);

      if (parseResult.errors.length > 0) {
        setParsedTeam(parseResult.pokemon);
        setErrors(parseResult.errors);
        setWarnings(parseResult.warnings);
        setIsValid(false);
        toast.error("Parse errors found", {
          description: parseResult.errors[0].message,
          duration: 6000,
        });
        setIsValidating(false);
        return;
      }

      const validationResult = validateTeam(parseResult.pokemon);

      setParsedTeam(parseResult.pokemon);
      setErrors(validationResult.errors);
      setWarnings([...parseResult.warnings, ...validationResult.warnings]);

      if (validationResult.errors.length > 0) {
        setIsValid(false);
        toast.error("Validation errors found", {
          description: validationResult.errors[0].message,
          duration: 6000,
        });
      } else {
        setIsValid(true);
        toast.success("Team list is valid!");
      }
    } catch (error) {
      toast.error("Validation error", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsValidating(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (stateRef.current.isSubmitting || stateRef.current.isValidating) return;

    const trimmed = stateRef.current.pasteText.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      const result = await submitVGCTeamAction(stateRef.current.tournamentId, trimmed, {
        trainerName: stateRef.current.trainerName.trim() || undefined,
        battleTeamName: stateRef.current.battleTeamName.trim() || undefined,
        switchProfileName: stateRef.current.switchProfileName.trim() || undefined,
      });
      if (result.isValid) {
        toast.success("Team list submitted successfully!");
        try { localStorage.removeItem(stateRef.current.autoSaveKey); } catch { /* ignore */ }
        onSuccess?.(trimmed, {
          trainerName: stateRef.current.trainerName.trim() || undefined,
          battleTeamName: stateRef.current.battleTeamName.trim() || undefined,
          switchProfileName: stateRef.current.switchProfileName.trim() || undefined,
        });
        onClose();
      } else {
        setErrors(result.errors);
        setWarnings(result.warnings);
        setParsedTeam(result.team);
        setIsValid(false);
        toast.error("Submission Failed", {
          description: result.errors[0]?.message || "Unknown error occurred.",
          duration: 8000,
        });
      }
    } catch (error) {
      toast.error("Submission Failed", {
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        duration: 8000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [onSuccess, onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        if (stateRef.current.isValid) {
          handleSubmit();
        } else {
          handleValidate();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleValidate, handleSubmit]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Submit Team List
          </DialogTitle>
          <DialogDescription className="text-xs">
            Paste your Pokémon Showdown team export. (Ctrl+Enter to validate/submit)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-2 min-h-0">
          <Tabs defaultValue="edit" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">
                  Preview {parsedTeam.length > 0 && `(${parsedTeam.length})`}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Edit Tab */}
            <TabsContent value="edit" className="flex-1 mt-0 overflow-hidden flex flex-col min-h-0">
              {/* Game Profile Fields */}
              <div className="space-y-2 mb-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="vgc-trainer-name" className="text-xs text-muted-foreground">Trainer Name</Label>
                    <Input
                      id="vgc-trainer-name"
                      placeholder="e.g. Red"
                      value={trainerName}
                      onChange={(e) => setTrainerName(e.target.value)}
                      className="h-8 text-sm"
                      maxLength={24}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vgc-battle-team" className="text-xs text-muted-foreground">Battle Team</Label>
                    <Input
                      id="vgc-battle-team"
                      placeholder="e.g. Team 1"
                      value={battleTeamName}
                      onChange={(e) => setBattleTeamName(e.target.value)}
                      className="h-8 text-sm"
                      maxLength={24}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vgc-switch-profile" className="text-xs text-muted-foreground">Switch Profile</Label>
                    <Input
                      id="vgc-switch-profile"
                      placeholder="e.g. Player1"
                      value={switchProfileName}
                      onChange={(e) => setSwitchProfileName(e.target.value)}
                      className="h-8 text-sm"
                      maxLength={24}
                    />
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <TeamEditor
                  value={pasteText}
                  onChange={setPasteText}
                  maxLength={MAX_CHAR_LIMIT}
                />
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="mt-0">
              <div className="h-[55vh] max-h-[500px] overflow-y-auto border rounded-lg bg-muted/30 p-4">
                {parsedTeam.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                      <span className="font-semibold text-sm">Team Preview</span>
                      <Badge variant="default" className="text-sm px-3 shadow-sm">
                        {parsedTeam.length} Pokémon
                      </Badge>
                    </div>
                    {parsedTeam.map((poke, i) => (
                      <PokemonPreview key={i} pokemon={poke} index={i} />
                    ))}

                    {(isValid !== null || isValidating) && (
                      <div className="pt-2 border-t mt-4">
                        <VGCValidationFeedback
                          errors={errors}
                          warnings={warnings}
                          isValid={isValid}
                          isValidating={isValidating}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 py-16">
                    <Swords className="h-8 w-8" />
                    <p className="text-sm">Paste your team and click &quot;Validate&quot; to preview.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="p-6 pt-2 border-t bg-muted/20">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!pasteText.trim() || isValidating || isSubmitting}
              onClick={handleValidate}
            >
              {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Validate
            </Button>
            <Button
              disabled={!isValid || isSubmitting}
              onClick={handleSubmit}
              title={!isValid ? "Please validate your team successfully before submitting" : "Submit your team list"}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Team
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
