"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
    return (
        <Button
            onClick={() => window.print()}
            variant="default"
            className="flex items-center gap-2"
        >
            <Printer className="w-4 h-4" />
            Print This Page
        </Button>
    );
}
