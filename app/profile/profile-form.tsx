'use client'

import { useEffect, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateProfile, UpdateProfileState } from './actions'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner' // Assuming Sonner is used, or use-toast if not. Checking dir showed sonner.tsx
import { AlertCircle } from 'lucide-react'

const initialState: UpdateProfileState = {
    message: '',
    errors: {}
}

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Saving...' : 'Save Changes'}
        </Button>
    )
}

interface ProfileFormProps {
    profile: Profile
}

export function ProfileForm({ profile }: ProfileFormProps) {
    const [state, formAction] = useActionState(updateProfile, initialState)
    const isAdmin = profile.role === 'admin'
    const isIdSet = !!profile.pokemon_player_id
    const isIdLocked = isIdSet && !isAdmin
    const isYearSet = !!profile.birth_year
    const isYearLocked = isYearSet && !isAdmin

    useEffect(() => {
        if (state.message) {
            if (state.success) {
                toast.success(state.message)
            } else {
                toast.error(state.message)
            }
        }
    }, [state])


    return (
        <Card className="max-w-xl mx-auto mt-10">
            <CardHeader>
                <CardTitle>User Profile</CardTitle>
                <CardDescription>
                    Manage your personal information and TCG settings.
                </CardDescription>
            </CardHeader>
            <form action={formAction}>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="first_name">First Name</Label>
                            <Input
                                id="first_name"
                                name="first_name"
                                defaultValue={profile.first_name || ''}
                                placeholder="Jane"
                                required
                            />
                            {state.errors?.first_name && <p className="text-sm text-red-500">{state.errors.first_name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last_name">Last Name</Label>
                            <Input
                                id="last_name"
                                name="last_name"
                                defaultValue={profile.last_name || ''}
                                placeholder="Doe"
                                required
                            />
                            {state.errors?.last_name && <p className="text-sm text-red-500">{state.errors.last_name}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="nick_name">Nickname (Optional)</Label>
                        <Input
                            id="nick_name"
                            name="nick_name"
                            defaultValue={profile.nick_name || ''}
                            placeholder="JD"
                        />
                        {state.errors?.nick_name && <p className="text-sm text-red-500">{state.errors.nick_name}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pokemon_player_id">Pokemon Player ID</Label>
                        <Input
                            id="pokemon_player_id"
                            name="pokemon_player_id"
                            defaultValue={profile.pokemon_player_id || ''}
                            placeholder="123456"
                            readOnly={isIdLocked}
                            className={isIdLocked ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
                        />
                        {isIdLocked && <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Locked. Contact an organizer to change.</p>}
                        {isIdSet && isAdmin && <p className="text-xs text-green-600 flex items-center gap-1">(Admin Override Active)</p>}
                        {state.errors?.pokemon_player_id && <p className="text-sm text-red-500">{state.errors.pokemon_player_id}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="birth_year">Birth Year</Label>
                        <Input
                            id="birth_year"
                            name="birth_year"
                            type="number"
                            defaultValue={profile.birth_year || ''}
                            placeholder="2000"
                            readOnly={isYearLocked}
                            className={isYearLocked ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
                        />
                        {isYearLocked && <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Locked. Contact an organizer to change.</p>}
                        {isYearSet && isAdmin && <p className="text-xs text-green-600 flex items-center gap-1">(Admin Override Active)</p>}
                        {state.errors?.birth_year && <p className="text-sm text-red-500">{state.errors.birth_year}</p>}
                    </div>

                </CardContent>
                <CardFooter className="flex justify-between">
                    <p className="text-xs text-muted-foreground">Sensitive fields are write-once.</p>
                    <SubmitButton />
                </CardFooter>
            </form>
        </Card>
    )
}
