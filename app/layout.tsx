import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { createClient } from "@/utils/supabase/server";
import { Toaster } from "@/components/ui/sonner";
import { OnboardingGuard } from "@/components/onboarding-guard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TCG Tournament Manager",
  description: "Manage your TCG tournaments with ease",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let needsOnboarding = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("first_name, last_name, pokemon_player_id, birth_year").eq("id", user.id).single();
    // Check if ANY required field is missing/null/empty
    if (!profile?.first_name || !profile?.last_name || !profile?.pokemon_player_id || !profile?.birth_year) {
      needsOnboarding = true;
    }
  }

  // Note: We need to import OnboardingGuard. I'll add the import in a 2nd step or user replace_file_content smartly.
  // Actually, I should update the imports too. I'll split this into two edits if needed, or use a larger replace range.
  // I'll grab the whole file to be safe since it's small.

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <OnboardingGuard needsOnboarding={needsOnboarding} />
        <Header initialUser={user} />
        <main>
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
