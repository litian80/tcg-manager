"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const profileSchema = z.object({
    first_name: z.string().min(1, "First Name is required"),
    last_name: z.string().min(1, "Last Name is required"),
    pokemon_player_id: z.string().min(4, "Player ID must be valid"),
    birth_year: z.coerce.number().int().min(1900).max(new Date().getFullYear() - 3, "Must be at least 3 years old"),
});

export async function completeProfile(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const rawData = {
        first_name: formData.get("first_name"),
        last_name: formData.get("last_name"),
        pokemon_player_id: formData.get("pokemon_player_id"),
        birth_year: formData.get("birth_year"),
    };

    const result = profileSchema.safeParse(rawData);

    if (!result.success) {
        return { errors: result.error.flatten().fieldErrors };
    }

    const { first_name, last_name, pokemon_player_id, birth_year } = result.data;

    const { error } = await supabase
        .from("profiles")
        .update({
            first_name,
            last_name,
            pokemon_player_id,
            birth_year,
            // updated_at: new Date().toISOString(), 
        })
        .eq("id", user.id);

    if (error) {
        console.error("Profile update error:", error);
        return { errors: { server: ["Failed to update profile. Player ID might be taken."] } };
    }

    revalidatePath("/", "layout");
    redirect("/");
}
