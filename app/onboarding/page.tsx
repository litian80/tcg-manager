"use client";

import { useActionState } from "react"; // Next 14+ hook (React 19 in Next 15+ is useActionState, previously useFormState)
// Wait, React 19 is in RC/Beta, Next 16 uses React 19. `useActionState` is correct.
import { completeProfile } from "@/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Assuming alert component exists
import { AlertCircle } from "lucide-react";

// Just in case `useActionState` isn't exported or named differently in current version, fallback/check:
// It should be 'react'.
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

// Helper to pre-fill
function useCurrentUser() {
    const [user, setUser] = useState<any>(null);
    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
        });
    }, []);
    return user;
}

export default function OnboardingPage() {
    const [state, formAction, isPending] = useActionState(completeProfile, null);
    const user = useCurrentUser();

    // Auto-split name for pre-fill
    // Note: This is client-side pre-fill. 
    // Ideally we pass defaultValues to form.
    // If we use defaultValue prop, it only works on initial render.
    // Since `user` is fetched async, we might need controlled inputs or just a key to reset form?
    // Or just simple state.

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");

    useEffect(() => {
        if (user?.user_metadata?.full_name && !firstName && !lastName) {
            const parts = user.user_metadata.full_name.split(" ");
            if (parts.length > 0) setFirstName(parts[0]);
            if (parts.length > 1) setLastName(parts.slice(1).join(" "));
        }
        if (user?.email) {
            setEmail(user.email);
        }
    }, [user, firstName, lastName]);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - 3 - i);

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Card className="max-w-md w-full shadow-lg border-2 border-primary/20">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-2xl font-bold">Trainer Registration</CardTitle>
                    <CardDescription>
                        Welcome! Please complete your profile to participate in official tournaments.
                    </CardDescription>
                </CardHeader>
                <form action={formAction}>
                    <CardContent className="space-y-4">
                        {/* Global Error */}
                        {state?.errors?.server && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>
                                    {state.errors.server[0]}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input
                                    id="first_name"
                                    name="first_name"
                                    placeholder="Ash"
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    required
                                />
                                {state?.errors?.first_name && <p className="text-xs text-red-500">{state.errors.first_name[0]}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input
                                    id="last_name"
                                    name="last_name"
                                    placeholder="Ketchum"
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    required
                                />
                                {state?.errors?.last_name && <p className="text-xs text-red-500">{state.errors.last_name[0]}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pokemon_player_id">Pokemon Player ID (POP ID)</Label>
                            <Input
                                id="pokemon_player_id"
                                name="pokemon_player_id"
                                placeholder="1234567"
                                required
                            />
                            {state?.errors?.pokemon_player_id && <p className="text-xs text-red-500">{state.errors.pokemon_player_id[0]}</p>}
                            <p className="text-[10px] text-muted-foreground">This is your official Play! Pokemon ID.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="birth_year">Birth Year</Label>
                            <select
                                id="birth_year"
                                name="birth_year"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                required
                                defaultValue={2000}
                            >
                                <option value="" disabled>Select Year</option>
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            {state?.errors?.birth_year && <p className="text-xs text-red-500">{state.errors.birth_year[0]}</p>}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? "Saving Profile..." : "Complete Registration"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
