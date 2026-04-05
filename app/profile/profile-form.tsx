'use client'

import { useEffect, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateProfile, UpdateProfileState } from './actions'
import { Profile } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner' // Assuming Sonner is used, or use-toast if not. Checking dir showed sonner.tsx
import { AlertCircle, Lock } from 'lucide-react'

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

const ADMIN_EMAIL = 'admin@tcgmanager.co.nz'

function RequestChangeLink({ field, currentValue, userName }: { field: string; currentValue: string; userName: string }) {
    const subject = encodeURIComponent(`Request to change ${field}`)
    const body = encodeURIComponent(
        `Hi,\n\nI would like to request a change to my ${field}.\n\nName: ${userName}\nCurrent ${field}: ${currentValue}\nNew ${field}: [please fill in]\n\nThank you.`
    )
    return (
        <a
            href={`mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`}
            className="text-primary hover:underline font-medium"
        >
            Request Change →
        </a>
    )
}

export function ProfileForm({ profile }: ProfileFormProps) {
    const [state, formAction] = useActionState(updateProfile, initialState)
    const isAdmin = profile.role === 'admin'
    const isIdSet = !!profile.pokemon_player_id
    const isIdLocked = isIdSet && !isAdmin
    const isYearSet = !!profile.birth_year
    const isYearLocked = isYearSet && !isAdmin
    const userName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown'

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
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            defaultValue={profile.email || ''}
                            placeholder="jane.doe@example.com"
                        />
                        <p className="text-xs text-muted-foreground">Used for tournament notifications. Required for some events.</p>
                        {state.errors?.email && <p className="text-sm text-red-500">{state.errors.email}</p>}
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
                        {isIdLocked && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                This field is locked.
                                <RequestChangeLink field="Player ID" currentValue={profile.pokemon_player_id || ''} userName={userName} />
                            </p>
                        )}
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
                        {isYearLocked && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                This field is locked.
                                <RequestChangeLink field="Birth Year" currentValue={String(profile.birth_year || '')} userName={userName} />
                            </p>
                        )}
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
