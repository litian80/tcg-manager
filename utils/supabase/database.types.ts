export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    updated_at: string | null
                    username: string | null
                    full_name: string | null
                    avatar_url: string | null
                    website: string | null
                    role: 'admin' | 'organizer' | 'judge' | 'user'
                    first_name: string | null
                    last_name: string | null
                    middle_name: string | null
                    nick_name: string | null
                    pokemon_player_id: string | null
                    birth_year: number | null
                }
                Insert: {
                    id: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                    role?: 'admin' | 'organizer' | 'judge' | 'user'
                    first_name?: string | null
                    last_name?: string | null
                    middle_name?: string | null
                    nick_name?: string | null
                    pokemon_player_id?: string | null
                    birth_year?: number | null
                }
                Update: {
                    id?: string
                    updated_at?: string | null
                    username?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                    role?: 'admin' | 'organizer' | 'judge' | 'user'
                    first_name?: string | null
                    last_name?: string | null
                    middle_name?: string | null
                    nick_name?: string | null
                    pokemon_player_id?: string | null
                    birth_year?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_id_fkey"
                        columns: ["id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            tournaments: {
                Row: {
                    id: string
                    created_at: string
                    name: string
                    date: string
                    location: string | null
                    prizes: Json | null
                    description: string | null
                    organizer_id: string
                    status: string
                    parsed_data: Json | null
                    tom_uid: string | null
                    city: string | null
                    country: string | null
                    organizer_popid: string | null
                    total_rounds: number | null
                    is_published: boolean | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    name: string
                    date: string
                    location?: string | null
                    prizes?: Json | null
                    description?: string | null
                    organizer_id?: string
                    status?: string
                    parsed_data?: Json | null
                    tom_uid?: string | null
                    city?: string | null
                    country?: string | null
                    organizer_popid?: string | null
                    total_rounds?: number | null
                    is_published?: boolean | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    name?: string
                    date?: string
                    location?: string | null
                    prizes?: Json | null
                    description?: string | null
                    organizer_id?: string
                    status?: string
                    parsed_data?: Json | null
                    tom_uid?: string | null
                    city?: string | null
                    country?: string | null
                    organizer_popid?: string | null
                    total_rounds?: number | null
                    is_published?: boolean | null
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            app_role: 'admin' | 'organizer' | 'judge' | 'user'
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
