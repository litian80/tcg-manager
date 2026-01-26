"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Tournament {
    id: string;
    tom_uid: string | null;
}

interface TournamentSettingsFormProps {
    tournament: Tournament;
}

export function TournamentSettingsForm({ tournament }: TournamentSettingsFormProps) {
    const [tomUid, setTomUid] = useState(tournament.tom_uid || "");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const supabase = createClient();

        // Validation: xx-xx-xxxxxx
        const pattern = /^\d{2}-\d{2}-\d{6}$/;
        if (tomUid && !pattern.test(tomUid)) {
            toast.error("Format must be YY-MM-ID (e.g., 26-01-123456)");
            setIsLoading(false);
            return;
        }

        const { error } = await supabase
            .from("tournaments")
            .update({ tom_uid: tomUid || null })
            .eq("id", tournament.id);

        if (error) {
            console.error(error);
            toast.error("Failed to update settings");
        } else {
            toast.success("Tournament settings saved");
            router.refresh();
        }

        setIsLoading(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tournament Configuration</CardTitle>
                <CardDescription>
                    Enter the Sanction ID to enable TDF file export. This ID is required for TOM.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="tom_uid">Sanction ID / TOM UID</Label>
                        <Input
                            id="tom_uid"
                            placeholder="26-01-123456"
                            value={tomUid}
                            onChange={(e) => setTomUid(e.target.value)}
                            pattern="\d{2}-\d{2}-\d{6}"
                            title="Format: YY-MM-XXXXXX (e.g. 26-01-123456)"
                        />
                        <p className="text-xs text-muted-foreground">
                            Format: YY-MM-XXXXXX (e.g. 26-01-123456)
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Settings
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
