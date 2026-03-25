import { createClient } from "@/utils/supabase/server";
import { authorizeTournamentManagement } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { headers } from "next/headers";
import { PrintButton } from "./print-button";

export default async function TournamentFlyerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let authResult;
    try {
        authResult = await authorizeTournamentManagement(id);
    } catch (error) {
        if (error instanceof Error && error.message === 'Tournament not found') {
            notFound();
        }
        throw error;
    }

    if (!authResult || !authResult.isAuthorized) {
        redirect("/?error=unauthorized");
    }

    const { tournament } = authResult;

    // Construct Public URL
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const protocol = host.includes("localhost") ? "http" : "https";
    const publicUrl = `${protocol}://${host}/tournament/${id}`;

    return (
        <div className="bg-white min-h-screen text-black flex flex-col items-center">
            {/* Print Controls - Hidden on Print */}
            <div className="print:hidden w-full p-4 flex justify-between items-center bg-muted border-b mb-8">
                <div className="font-medium text-sm text-muted-foreground">
                    🖨️ For best results: A4/Letter size, Portrait, Scale 100%.
                </div>
                <PrintButton />
            </div>

            {/* Flyer Content - Centered */}
            <div className="w-full max-w-[210mm] p-8 flex flex-col items-center text-center space-y-12 h-full justify-center print:block print:w-full print:max-w-none print:p-0 print:space-y-12">

                {/* Header */}
                <div className="space-y-4">
                    <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">
                        Live Pairings
                    </h1>
                    <div className="w-32 h-2 bg-black mx-auto"></div>
                </div>

                {/* Tournament Name */}
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold max-w-2xl mx-auto leading-tight">
                        {tournament.name}
                    </h2>
                    <p className="text-xl text-gray-500 font-medium">
                        Tournament Dashboard
                    </p>
                </div>

                {/* QR Code */}
                <div className="p-8 border-4 border-black rounded-3xl mx-auto inline-block">
                    <QRCodeSVG
                        value={publicUrl}
                        size={350}
                        level="Q"
                        includeMargin={true}
                    />
                </div>

                {/* Footer Instructions */}
                <div className="space-y-6 max-w-xl mx-auto">
                    <p className="text-2xl font-bold">
                        Scan to check your<br />
                        <span className="text-3xl uppercase tracking-wide">Table Number & Standings</span>
                    </p>

                    <div className="border-t-2 border-gray-300 w-full my-8"></div>

                </div>

                {/* Powered By (Subtle) */}
                <div className="absolute bottom-4 text-gray-400 text-sm font-medium uppercase tracking-widest print:bottom-8 print:relative">
                    TCG Tournament Manager
                </div>
            </div>

            {/* Print Styling Fixes */}
            <style type="text/css" media="print">
                {`
                    @page {
                        size: auto;
                        margin: 0mm;
                    }
                    body {
                        background-color: white;
                        color: black;
                        -webkit-print-color-adjust: exact;
                    }
                    /* Hide everything else if specific parent classes interfere */
                    nav, header, aside, .sidebar {
                        display: none !important;
                    }
                `}
            </style>
        </div>
    );
}
