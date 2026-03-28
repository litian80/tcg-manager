import { Database } from '@/utils/supabase/database.types';

export type DeckListStatus = 'online' | 'paper' | 'missing';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface ProfileFormData {
    first_name: string;
    last_name: string;
    nick_name?: string;
    pokemon_player_id: string; // "POP ID"
    birth_year: number;
}

export interface Player {
    id: string;
    first_name: string | null;
    last_name: string | null;
    tom_player_id: string | null;
    registration_status?: string;
    deck_list_status?: DeckListStatus;
}

export interface MatchPlayer {
    first_name: string;
    last_name: string;
}

export interface RosterPlayer {
    id: string; // Used for UI key and TOM sync, can be stringified TOM id or UUID
    player_id?: string; // The literal UUID in the db
    first_name: string | null;
    last_name: string | null;
    tom_player_id: string | null;
    registration_status?: string;
    division?: string | null;
    deck_list_status?: DeckListStatus;
}

export interface RosterCandidate {
    id: string;
    first_name: string;
    last_name: string;
    pokemon_player_id: string;
    birth_year: number;
}
