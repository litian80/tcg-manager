import { Database } from '@/utils/supabase/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface ProfileFormData {
    first_name: string;
    last_name: string;
    nick_name?: string;
    pokemon_player_id: string; // "POP ID"
    birth_year: number;
}
