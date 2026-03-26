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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertCircle, CheckCircle2, Info, Copy } from "lucide-react";
import { validateDeckListAction, ValidationResult } from "@/actions/deck/validation";
import { submitDeckAction } from "@/actions/deck/submission";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ParsedCard, ParsedDeckCategories } from "@/types/deck";
import { useRouter } from "next/navigation";

// --- Types ---

interface DeckSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  initialDeckText?: string;
  onSuccess?: (newDeckText: string) => void;
}

// --- Constants ---

const MAX_CHAR_LIMIT = 5000;
const AUTO_SAVE_KEY_PREFIX = "ptcg-deck-draft-";
const AUTO_SAVE_DEBOUNCE_MS = 1000;

// --- Error Boundary ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("DeckSubmissionModal Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Component Error</AlertTitle>
            <AlertDescription>
              Something went wrong while rendering this section. Please try reopening the modal.
            </AlertDescription>
          </Alert>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Sub-components ---

export function DeckEditor({ 
  value, 
  onChange, 
  maxLength 
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
          id="deck-list-textarea"
          aria-label="Deck list input"
          placeholder="Paste deck list here...&#10;Example:&#10;Pokémon: 8&#10;2 Entei V BRS 22&#10;..."
          className="h-full min-h-[400px] font-mono resize-none focus-visible:ring-1"
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

const CategorySection = React.memo(function CategorySection({ title, cards, color }: { title: string; cards: ParsedCard[]; color?: string }) {
  if (!cards || cards.length === 0) return null;
  const count = cards.reduce((sum, card) => sum + (card.qty || 0), 0);
  return (
    <div className="space-y-0.5">
      <div className={cn("flex items-center justify-between pb-0.5 mb-0.5 border-b", color)}>
        <h4 className="text-xs font-bold tracking-tight uppercase text-muted-foreground">{title}</h4>
        <span className="text-xs font-mono text-muted-foreground">{count}</span>
      </div>
      <div>
        {cards.map((card, i) => (
          <div 
            key={`${card.name}-${card.set || 'unknown'}-${card.number || 'unknown'}-${card.qty}-${i}`} 
            className="text-sm flex justify-between items-center py-0.5 px-1"
          >
            <div className="flex gap-2 items-center min-w-0">
              <span className="font-mono w-4 text-right text-muted-foreground text-xs">{card.qty}</span>
              <span className="truncate">{card.name}</span>
            </div>
            {card.category === 'pokemon' && (card.set || card.number) && (
              <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0 ml-2">
                {card.set} {card.number}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

export { CategorySection };

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2].map((section) => (
        <div key={section} className="space-y-2">
          <div className="h-3 bg-muted rounded w-1/4 mb-3" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2 items-center h-8 bg-muted/50 rounded w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ValidationFeedback({ result, isValidating, onValidate }: { 
  result: ValidationResult | null; 
  isValidating: boolean;
  onValidate: () => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        Validation Status
        {result && (
          result.isValid ? (
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Valid</Badge>
          ) : result.isPartial ? (
            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">Partial</Badge>
          ) : (
            <Badge variant="destructive">Invalid</Badge>
          )
        )}
      </h3>

      {!result && !isValidating && (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground mb-4">Click "Run Validation" to check for errors.</p>
          <Button variant="secondary" size="sm" onClick={onValidate}>
            Run Validation
          </Button>
        </div>
      )}

      {isValidating && (
        <div 
          role="status"
          aria-label="Validating deck legality"
          className="flex items-center gap-2 text-sm text-muted-foreground animate-bounce pb-2"
        >
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Verifying tournament legality...
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {result.errors.length > 0 && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {result.warnings.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800 [&>svg]:text-amber-600">
              <Info className="h-4 w-4" />
              <AlertTitle>Warnings</AlertTitle>
              <AlertDescription className="text-xs">
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {result.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {result.isValid && (
            <Alert className="border-green-200 bg-green-50 text-green-800 [&>svg]:text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Ready to Submit</AlertTitle>
              <AlertDescription className="text-xs">
                Your deck list meets all tournament construction requirements.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}

// Minimal Card component
export function PreviewCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card text-card-foreground shadow flex flex-col overflow-hidden", className)}>
      {children}
    </div>
  );
}

// --- Main Component ---

export function DeckSubmissionModal({
  isOpen,
  onClose,
  tournamentId,
  initialDeckText = "",
  onSuccess,
}: DeckSubmissionModalProps) {
  const router = useRouter();
  const autoSaveKey = `${AUTO_SAVE_KEY_PREFIX}${tournamentId}`;

  // Fix P0 Hydration: Use lazy initializer for localStorage
  const [deckText, setDeckText] = useState(() => {
    if (typeof window === "undefined") return initialDeckText;
    try {
      const saved = localStorage.getItem(autoSaveKey);
      return saved || initialDeckText;
    } catch {
      return initialDeckText;
    }
  });

  const [activeTab, setActiveTab] = useState("editor");
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Refs for stable keyboard shortcuts and race condition guards
  const stateRef = useRef({
    deckText,
    validationResult,
    isValidating,
    isSubmitting,
    tournamentId,
    autoSaveKey,
  });

  // Sync ref with current state
  useEffect(() => {
    stateRef.current = {
      deckText,
      validationResult,
      isValidating,
      isSubmitting,
      tournamentId,
      autoSaveKey,
    };
  }, [deckText, validationResult, isValidating, isSubmitting, tournamentId, autoSaveKey]);

  const isLoaded = useRef(false);

  // Reset/Sync state on open
  useEffect(() => {
    if (isOpen) {
      // Sync with potentially updated initialDeckText or draft
      try {
        const savedDraft = localStorage.getItem(autoSaveKey);
        if (savedDraft) setDeckText(savedDraft);
      } catch (e) {
        console.warn("Failed to read from localStorage", e);
      }
      setValidationResult(null);
      setActiveTab("editor");
      isLoaded.current = true;
    } else {
      isLoaded.current = false;
    }
  }, [isOpen, initialDeckText, autoSaveKey]);

  // Save draft to localStorage with debounce
  useEffect(() => {
    if (!isOpen || !isLoaded.current || deckText === initialDeckText) return;

    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(autoSaveKey, deckText);
      } catch (e) {
        console.warn("Failed to save draft to localStorage:", e);
      }
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [deckText, isOpen, initialDeckText, autoSaveKey]);

  // Clear validation when deck text changes
  useEffect(() => {
    if (validationResult) {
      setValidationResult(null);
    }
  }, [deckText]);

  // No longer auto-switching back to editor to avoid jank.
  // The Preview trigger is already disabled via its 'disabled' prop.

  const handleValidate = useCallback(async () => {
    // P0 Race Condition Guard
    if (stateRef.current.isValidating || stateRef.current.isSubmitting) return;

    const trimmed = stateRef.current.deckText.trim();
    if (!trimmed) {
      toast.error("Please enter a deck list first.");
      return;
    }

    if (trimmed.split('\n').length < 3) {
      toast.error("Deck list is too short. Please paste a full export.");
      return;
    }
    
    setIsValidating(true);
    try {
      const result = await validateDeckListAction(trimmed, stateRef.current.tournamentId);
      setValidationResult(result);
      if (result.isValid) {
        toast.success("Deck list format is valid!");
      } else {
        setActiveTab("preview"); // Switch to show error details
        toast.error("Validation Failed", {
          description: result.errors[0] || "Validation issues found.",
          duration: 6000,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to validate deck list.";
      toast.error("Validation Error", {
        description: message,
        duration: 6000,
      });
    } finally {
      setIsValidating(false);
    }
  }, []); // Now stable due to stateRef

  const handleSubmit = useCallback(async () => {
    // P0 Race Condition Guard
    if (stateRef.current.isSubmitting || stateRef.current.isValidating) return;

    const trimmed = stateRef.current.deckText.trim();
    if (!trimmed) return;
    
    setIsSubmitting(true);
    try {
      const result = await submitDeckAction(stateRef.current.tournamentId, trimmed);
      if (result.isValid) {
        toast.success("Deck list submitted successfully!");
        try {
          localStorage.removeItem(stateRef.current.autoSaveKey); // Clear draft on success
        } catch (e) { /* ignore */ }
        
        // Call the success callback with the new deck text
        onSuccess?.(trimmed);
        
        onClose();
      } else {
        setValidationResult(result);
        setActiveTab("preview"); // Switch to show error details
        toast.error("Submission Failed", {
          description: result.errors.join(" • ") || "Unknown error occurred.",
          duration: 8000,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast.error("Submission Failed", {
        description: message,
        duration: 8000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [onSuccess, onClose]); // Minimal stable dependencies

  // Keyboard Shortcuts (Ctrl+Enter) - Stable Listener Pattern
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        
        // Use ref for the absolute latest state in the event handler
        const { validationResult: latestResult } = stateRef.current;
        
        if (latestResult?.isValid) {
          handleSubmit();
        } else {
          handleValidate();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleValidate, handleSubmit]); // Stable listeners

  const isPreviewDisabled = !deckText.trim() || isValidating;
  const parsedDeck = (validationResult?.parsedDeck as ParsedDeckCategories) || null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[95vh] sm:h-[90vh] flex flex-col p-0 overflow-hidden">
        <ErrorBoundary>
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-bold">Submit Deck List</DialogTitle>
            <DialogDescription>
              Valid format: Pokémon TCG Live export. (Ctrl+Enter to validate/submit)
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden px-6 py-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger 
                  value="preview" 
                  disabled={isPreviewDisabled}
                  aria-disabled={isPreviewDisabled}
                  aria-describedby="preview-tooltip"
                >
                  Preview & Validation
                </TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="flex-1 mt-0 overflow-hidden">
                <DeckEditor 
                  value={deckText} 
                  onChange={setDeckText} 
                  maxLength={MAX_CHAR_LIMIT} 
                />
              </TabsContent>

              <TabsContent value="preview" className="flex-1 mt-0 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                  {/* Parsed List */}
                  <PreviewCard className="border-none shadow-none bg-muted/30 overflow-hidden">
                    <ScrollArea className="h-[55vh] p-4">
                      {isValidating ? (
                        <LoadingSkeleton />
                      ) : (parsedDeck ? (
                        <div className="space-y-3 pb-4">
                          <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                            <span className="font-semibold">Total Cards</span>
                            <Badge variant="default" className="text-sm px-3 shadow-sm">
                              {
                                ((parsedDeck.Pokemon || []).reduce((sum, card) => sum + (card.qty || 0), 0)) +
                                ((parsedDeck.Trainer || []).reduce((sum, card) => sum + (card.qty || 0), 0)) +
                                ((parsedDeck.Energy || []).reduce((sum, card) => sum + (card.qty || 0), 0))
                              } / 60
                            </Badge>
                          </div>
                          <CategorySection title="Pokémon" cards={parsedDeck.Pokemon || []} color="border-l-[3px] border-l-green-500" />
                          <CategorySection title="Trainer" cards={parsedDeck.Trainer || []} color="border-l-[3px] border-l-blue-500" />
                          <CategorySection title="Energy" cards={parsedDeck.Energy || []} color="border-l-[3px] border-l-amber-500" />
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 py-20">
                          <Info className="h-8 w-8" />
                          <p>No parsed results yet.</p>
                        </div>
                      ))}
                    </ScrollArea>
                  </PreviewCard>

                  {/* Validation Feedback */}
                  <PreviewCard className="border-none shadow-none overflow-hidden">
                    <ScrollArea className="h-[55vh] p-4">
                      <ValidationFeedback 
                        result={validationResult} 
                        isValidating={isValidating}
                        onValidate={handleValidate} 
                      />
                    </ScrollArea>
                  </PreviewCard>
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
                disabled={!deckText.trim() || isValidating || isSubmitting}
                onClick={handleValidate}
              >
                {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Validate
              </Button>
              <Button
                disabled={!validationResult?.isValid || isSubmitting}
                onClick={handleSubmit}
                title={!validationResult?.isValid ? "Please validate your deck successfully before submitting" : "Submit your deck list"}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Deck
              </Button>
            </div>
          </DialogFooter>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
