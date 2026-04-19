'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const profileSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    nick_name: z.string().optional(),
    pokemon_player_id: z.string().regex(/^\d+$/, "Player ID must be numeric").min(4, "Invalid Player ID"),
    birth_year: z.coerce.number().int().min(1900).max(new Date().getFullYear()),
    email: z.string().email("Invalid email address").optional().or(z.literal('')),
});

export type UpdateProfileState = {
    errors?: {
        first_name?: string[];
        last_name?: string[];
        nick_name?: string[];
        pokemon_player_id?: string[];
        birth_year?: string[];
        email?: string[];
        _form?: string[];
    };
    message?: string;
    success?: boolean;
};

export async function updateProfile(prevState: UpdateProfileState, formData: FormData): Promise<UpdateProfileState> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { message: "Unauthorized" };
    }

    const rawData = {
        first_name: formData.get("first_name"),
        last_name: formData.get("last_name"),
        nick_name: formData.get("nick_name"),
        pokemon_player_id: formData.get("pokemon_player_id"),
        birth_year: formData.get("birth_year"),
        email: formData.get("email"),
    };

    const validatedFields = profileSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Please fix the errors below.",
            success: false
        };
    }

    try {
        const { error } = await supabase
            .from("profiles")
            .update({
                first_name: validatedFields.data.first_name,
                last_name: validatedFields.data.last_name,
                nick_name: validatedFields.data.nick_name || null,
                pokemon_player_id: validatedFields.data.pokemon_player_id,
                birth_year: validatedFields.data.birth_year,
                email: validatedFields.data.email || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

        if (error) {
            // Catch the specific trigger error if possible, or generic
            if (error.message.includes("sensitive fields")) {
                return { message: "Operation failed: Sensitive fields are immutable.", success: false };
            }
            if (error.code === '23505') {
                return {
                    errors: { pokemon_player_id: ['This Pokemon Player ID is already registered to another account.'] },
                    message: "Failed to update profile.", success: false
                };
            }
            console.error("Profile update error:", error);
            return { message: "Failed to update profile. " + (error.message || ""), success: false };
        }

        revalidatePath("/profile");
        return { message: "Profile updated successfully!", success: true };

    } catch (e) {
        console.error("Unexpected error:", e);
        return { message: "An unexpected error occurred.", success: false };
    }
}
