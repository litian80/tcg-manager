"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Upload, Cpu, Lock } from "lucide-react";

interface EngineTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function EngineTypeSelector({
  value,
  onChange,
  disabled = false,
}: EngineTypeSelectorProps) {
  return (
    <Card id="engine-type-selector">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tournament Engine</CardTitle>
        <CardDescription>
          Choose how pairings and standings are managed.
          {disabled && (
            <span className="flex items-center gap-1.5 mt-1.5 text-amber-600">
              <Lock className="w-3.5 h-3.5" />
              Cannot be changed after first round is paired
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {/* TOM Mode */}
          <Label
            htmlFor="engine-tom"
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
              ${value === "TOM"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/40"
              }
              ${disabled ? "opacity-60 cursor-not-allowed" : ""}
            `}
          >
            <RadioGroupItem value="TOM" id="engine-tom" className="mt-0.5" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                <span className="font-medium">TOM Import</span>
                <Badge variant="secondary" className="text-xs">Current</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Use Pokémon&apos;s TOM software for pairings.
                Import/export TDF files for synchronization.
              </p>
            </div>
          </Label>

          {/* Built-in Mode */}
          <Label
            htmlFor="engine-built-in"
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
              ${value === "BUILT_IN"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/40"
              }
              ${disabled ? "opacity-60 cursor-not-allowed" : ""}
            `}
          >
            <RadioGroupItem value="BUILT_IN" id="engine-built-in" className="mt-0.5" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-violet-500" />
                <span className="font-medium">Built-in Engine</span>
                <Badge variant="outline" className="text-xs text-violet-600 border-violet-500/30">
                  New
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate pairings in-app with Swiss pairing algorithm.
                Online result reporting, live standings.
              </p>
            </div>
          </Label>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
