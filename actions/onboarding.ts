'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const onboardingSchema = z.object({
    first_name: z.string().min(1, "First Name is required"),
    last_name: z.string().min(1, "Last Name is required"),
    pokemon_player_id: z.string().min(1, "Pokemon Player ID is required").regex(/^\d+$/, "Player ID must be numeric"),
    birth_year: z.string().min(4, "Birth Year is required").transform((val) => parseInt(val, 10)),
});

type State = {
    errors?: {
        first_name?: string[];
        last_name?: string[];
        pokemon_player_id?: string[];
        birth_year?: string[];
        server?: string[];
    };
    message?: string;
};

export async function completeOnboarding(prevState: any, formData: FormData): Promise<State> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { message: 'Not authenticated' };
    }

    const rawData = {
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        pokemon_player_id: formData.get('pokemon_player_id'),
        birth_year: formData.get('birth_year'),
    };

    const validatedFields = onboardingSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Complete Onboarding.',
        };
    }

    const { first_name, last_name, pokemon_player_id, birth_year } = validatedFields.data;

    // Validate Birth Year Range
    if (birth_year < 1950 || birth_year > 2020) {
        return {
            errors: { birth_year: ['Birth year must be between 1950 and 2020'] },
            message: 'Invalid Birth Year',
        }
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            first_name,
            last_name,
            pokemon_player_id,
            birth_year,
        })
        .eq('id', user.id);

    if (error) {
        console.error('Error updating profile:', error);
        return { message: 'Database Error: Failed to update profile.' };
    }

    revalidatePath('/', 'layout');
    redirect('/');
}
