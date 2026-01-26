'use client';

import { completeOnboarding } from '@/actions/onboarding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';

// Define the initial state structure matching the server action return type
const initialState = {
    message: '',
    errors: undefined,
};

export default function OnboardingPage() {
    const [state, formAction, isPending] = useActionState(completeOnboarding, initialState);

    useEffect(() => {
        if (state?.message) {
            if (state.message.includes('Success')) {
                toast.success(state.message);
            } else {
                toast.error(state.message);
            }
        }
    }, [state]);

    const years = Array.from({ length: 2020 - 1950 + 1 }, (_, i) => 2020 - i);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Welcome to TCG Manager</CardTitle>
                    <CardDescription>
                        Please complete your profile to continue. We need your Player ID and Birth Year for tournament reporting.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input
                                    id="first_name"
                                    name="first_name"
                                    required
                                />
                                {state?.errors?.first_name && <p className="text-sm text-red-500">{state.errors.first_name[0]}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input
                                    id="last_name"
                                    name="last_name"
                                    required
                                />
                                {state?.errors?.last_name && <p className="text-sm text-red-500">{state.errors.last_name[0]}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pokemon_player_id">Pokemon Player ID</Label>
                            <Input
                                id="pokemon_player_id"
                                name="pokemon_player_id"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="1234567"
                                required
                            />
                            <p className="text-xs text-muted-foreground">Used for official TDF exports.</p>
                            {state?.errors?.pokemon_player_id && <p className="text-sm text-red-500">{state.errors.pokemon_player_id[0]}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="birth_year">Birth Year</Label>
                            <Select name="birth_year">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((year) => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {state?.errors?.birth_year && <p className="text-sm text-red-500">{state.errors.birth_year[0]}</p>}
                        </div>

                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? 'Completing Profile...' : 'Complete Profile'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
