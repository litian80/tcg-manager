import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTournament } from "@/actions/create-tournament";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewTournamentPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="container max-w-lg py-8 space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/organizer/tournaments" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Create TOM File</h1>
                    <p className="text-muted-foreground">Setup a new tournament to generate a .tdf file.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Tournament Details</CardTitle>
                    <CardDescription>
                        Enter the tournament information. This will be used to generate the initial TDF file.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={createTournament} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Tournament Name</Label>
                            <Input id="name" name="name" placeholder="e.g. Monthly League Challenge" required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" name="date" type="date" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input id="city" name="city" placeholder="e.g. Auckland" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country">Country</Label>
                                <Input id="country" name="country" defaultValue="New Zealand" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tom_uid">Sanction ID (TOM UID)</Label>
                            <Input id="tom_uid" name="tom_uid" placeholder="XX-XX-XXXXXX" />
                            <p className="text-xs text-muted-foreground">Optional. Format: 25-01-000001</p>
                        </div>

                        <div className="pt-4">
                            <Button type="submit" className="w-full">Create & Configure Roster</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
