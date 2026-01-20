import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";
import { Profile } from "@/lib/types";

export default async function ProfilePage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        // Check if error is 'PGRST116' (no rows returned) which implies profile doesn't exist yet but user does (rare if trigger works)
        // Or just handle generic error
        console.error("Error fetching profile:", error);
        return (
            <div className="p-10 text-center">
                <h1 className="text-2xl font-bold text-red-600">Profile Error</h1>
                <p>Could not load profile data. Please contact support.</p>
            </div>
        )
    }

    return (
        <div className="container py-10">
            <ProfileForm profile={profile as Profile} />
        </div>
    );
}
