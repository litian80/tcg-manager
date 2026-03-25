import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { SecondaryNav } from "@/components/secondary-nav";
import { createClient } from "@/utils/supabase/server";
import { Toaster } from "@/components/ui/sonner";
import { Role } from "@/lib/rbac";

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

  let role: Role = 'user'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role) {
      role = profile.role as Role
    }
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header initialUser={user} />
        <SecondaryNav role={role} />
        <main>
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
