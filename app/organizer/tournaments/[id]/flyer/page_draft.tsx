import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { headers } from "next/headers";

export default async function TournamentFlyerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch tournament details
    const { data: tournament, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !tournament) {
        notFound();
    }

    // Authorization check
    if (tournament.organizer_id !== user.id) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') {
            redirect("/");
        }
    }

    // Construct Public URL
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const protocol = host.includes("localhost") ? "http" : "https";
    const publicUrl = `${protocol}://${host}/tournament/${id}`;

    return (
        <div className="bg-white min-h-screen text-black">
            {/* Print Button - Hidden on Print */}
            <div className="print:hidden p-4 flex justify-between items-center bg-gray-100 border-b">
                <div className="font-semibold">Format: A4 Portrait recommended</div>
                <button
                    onClick={() => window.print()} // Note: Ideally this would be a client component for onClick, but inline script or Client Component wrap works. 
                // To keep it simple in one file, let's make a tiny script or just make the button part of a client component wrapper if needed.
                // Actually, for simplicity in Next.js App Router, we should make this a Client Component or separate the button.
                // Let's use a script tag for the button or just standard "ctrl+p" instruction if simple.
                // Better: Let's make a small Client Component for the Print Button or make the whole page a Client Component?
                // Fetching data should be server. Let's make the Page server and the button client?
                // Wait, `onclick` strings don't work in React JSX directly like HTML.
                // I'll make a helper client component for the button.
                >
                    {/* We need a client component for the button. */}
                </button>
            </div>

            {/* We need to re-think: We can't put onClick in a Server Component. 
               Option 1: Make a "PrintButton" client component.
               Option 2: Make the whole page 'use client' but then we lose async data fetching (need `useEffect`).
               Option 3: Server component fetches data, passes to Client Component that renders the whole flyer.
               
               Let's go with Option 1: Inline Client Component or separate file. 
               Since I can only write one file with `write_to_file` comfortably without extra round trips, 
               I will create a separate `print-button.tsx` or just use a standard link/instruction for now?
               No, the requirement said "Add a 'Print This Page' button".
               
               I will create `print-button.tsx` in a `_components` folder for this page or share it.
               Actually, I'll create `app/organizer/tournaments/[id]/flyer/print-button.tsx` first or inline it if I could (I can't).
            */}
        </div>
    );
}
