"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintTeamSheetsButton() {
    return (
        <Button
            onClick={() => window.print()}
            variant="default"
            className="flex items-center gap-2 print:hidden"
            title="Tip: Uncheck 'Headers and footers' in print dialog for clean output"
        >
            <Printer className="w-4 h-4" />
            Print All Team Sheets
        </Button>
    );
}
