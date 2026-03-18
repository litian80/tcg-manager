import { requireOrganizerOrAdmin } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CreateTournamentForm } from "./create-tournament-form";

export default async function NewTournamentPage() {
    // Page-level auth - will redirect if not organizer/admin
    await requireOrganizerOrAdmin();

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

            <CreateTournamentForm />
        </div>
    );
}
