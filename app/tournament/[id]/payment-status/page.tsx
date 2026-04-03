import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PaymentStatusPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function PaymentStatusPage({ params, searchParams }: PaymentStatusPageProps) {
  const { id: tournamentId } = await params;
  const { token } = await searchParams;

  if (!token) {
    redirect(`/tournament/${tournamentId}`);
  }

  const supabase = await createClient();

  // Fetch tournament name
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("name")
    .eq("id", tournamentId)
    .single();

  // Fetch registration status by callback token OR player's current status
  const { data: registration } = await supabase
    .from("tournament_players")
    .select("registration_status, payment_callback_token, payment_pending_since")
    .eq("tournament_id", tournamentId)
    .eq("payment_callback_token", token)
    .maybeSingle();

  // If no record found by token, the payment may have already been processed
  // Try to find by current user
  let status = registration?.registration_status || null;

  if (!registration) {
    // Token was consumed (cleared after payment) — check user's current registration
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("pokemon_player_id")
        .eq("id", user.id)
        .single();

      if (profile?.pokemon_player_id) {
        const { data: currentReg } = await supabase
          .from("tournament_players")
          .select("registration_status")
          .eq("tournament_id", tournamentId)
          .eq("player_id", profile.pokemon_player_id)
          .maybeSingle();

        status = currentReg?.registration_status || null;
      }
    }
  }

  const tournamentName = tournament?.name || "Tournament";

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Status Card */}
        <div className="rounded-xl border bg-card p-8 shadow-sm space-y-4">

          {status === "pending_payment" && (
            <>
              <Clock className="mx-auto h-16 w-16 text-amber-500 animate-pulse" />
              <h1 className="text-2xl font-bold">Payment Pending</h1>
              <p className="text-muted-foreground">
                We&apos;re waiting for payment confirmation for <strong>{tournamentName}</strong>.
                This page will update once your payment is processed.
              </p>
              <p className="text-sm text-muted-foreground">
                Payment must be completed within 24 hours or your registration will be automatically cancelled.
              </p>
            </>
          )}

          {status === "registered" && (
            <>
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
              <h1 className="text-2xl font-bold">You&apos;re In! 🎉</h1>
              <p className="text-muted-foreground">
                Payment confirmed! You are now registered for <strong>{tournamentName}</strong>.
              </p>
            </>
          )}

          {status === "waitlisted" && (
            <>
              <CheckCircle2 className="mx-auto h-16 w-16 text-blue-500" />
              <h1 className="text-2xl font-bold">Payment Confirmed</h1>
              <p className="text-muted-foreground">
                Your payment was received. However, the division is currently at capacity.
                You&apos;ve been placed on the <strong>waitlist</strong> for <strong>{tournamentName}</strong>.
              </p>
            </>
          )}

          {status === "cancelled" && (
            <>
              <XCircle className="mx-auto h-16 w-16 text-destructive" />
              <h1 className="text-2xl font-bold">Registration Cancelled</h1>
              <p className="text-muted-foreground">
                Your registration for <strong>{tournamentName}</strong> has been cancelled.
                This may be due to a payment failure or timeout.
              </p>
            </>
          )}

          {status === "withdrawn" && (
            <>
              <XCircle className="mx-auto h-16 w-16 text-muted-foreground" />
              <h1 className="text-2xl font-bold">Registration Withdrawn</h1>
              <p className="text-muted-foreground">
                You have withdrawn from <strong>{tournamentName}</strong>.
              </p>
            </>
          )}

          {!status && (
            <>
              <XCircle className="mx-auto h-16 w-16 text-muted-foreground" />
              <h1 className="text-2xl font-bold">Registration Not Found</h1>
              <p className="text-muted-foreground">
                We couldn&apos;t find a registration matching this payment token.
                The link may have expired or already been used.
              </p>
            </>
          )}

        </div>

        {/* Back to Tournament */}
        <Link
          href={`/tournament/${tournamentId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tournament
        </Link>
      </div>
    </div>
  );
}
