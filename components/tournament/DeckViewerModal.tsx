"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import { parseDeckList, mergeCards, sortCards } from "@/utils/deck-validator";
import { CategorySection } from "@/components/tournament/DeckSubmissionModal";

interface DeckViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawText: string;
  submittedAt?: string;
}

export function DeckViewerModal({
  isOpen,
  onClose,
  rawText,
  submittedAt,
}: DeckViewerModalProps) {
  const parsed = useMemo(() => {
    if (!rawText) return null;
    return parseDeckList(rawText);
  }, [rawText]);

  const pokemonCards = useMemo(
    () => sortCards(mergeCards(parsed?.Pokemon || []), "pokemon"),
    [parsed]
  );
  const trainerCards = useMemo(
    () => sortCards(mergeCards(parsed?.Trainer || []), "trainer"),
    [parsed]
  );
  const energyCards = useMemo(
    () => sortCards(mergeCards(parsed?.Energy || []), "energy"),
    [parsed]
  );

  const totalCards =
    pokemonCards.reduce((sum, c) => sum + (c.qty || 0), 0) +
    trainerCards.reduce((sum, c) => sum + (c.qty || 0), 0) +
    energyCards.reduce((sum, c) => sum + (c.qty || 0), 0);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
    toast.success("Deck list copied to clipboard");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Eye className="h-5 w-5 text-muted-foreground" />
            My Submitted Deck
          </DialogTitle>
          {submittedAt && (
            <p className="text-xs text-muted-foreground">
              Submitted: {formatDateTime(submittedAt)}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-6">
          <Tabs defaultValue="structured" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="structured">Structured</TabsTrigger>
                <TabsTrigger value="raw">Raw Text</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="structured" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-[55vh] max-h-[500px]">
                {parsed ? (
                  <div className="space-y-3 pb-4 pr-3">
                    <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                      <span className="font-semibold text-sm">Total Cards</span>
                      <Badge variant="default" className="text-sm px-3 shadow-sm">
                        {totalCards}
                      </Badge>
                    </div>
                    <CategorySection
                      title="Pokémon"
                      cards={pokemonCards}
                      color="border-l-[3px] border-l-green-500"
                    />
                    <CategorySection
                      title="Trainer"
                      cards={trainerCards}
                      color="border-l-[3px] border-l-blue-500"
                    />
                    <CategorySection
                      title="Energy"
                      cards={energyCards}
                      color="border-l-[3px] border-l-amber-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">
                    Unable to parse deck list.
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="raw" className="flex-1 mt-0">
              <div className="relative h-[55vh] max-h-[500px]">
                <ScrollArea className="h-full w-full border rounded-md p-3 bg-muted/30 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                  {rawText}
                </ScrollArea>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 h-7 text-[10px] gap-1"
                  onClick={handleCopy}
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
