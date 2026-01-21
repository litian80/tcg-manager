'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Pencil } from 'lucide-react'
import { updateTournamentStatus } from '@/app/actions/admin-tournaments'
import { Database } from '@/utils/supabase/database.types'

type Tournament = Database['public']['Tables']['tournaments']['Row']

interface EditTournamentDialogProps {
    tournament: Tournament
}

export function EditTournamentDialog({ tournament }: EditTournamentDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPublished, setIsPublished] = useState(tournament.is_published ?? true)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSave = async () => {
        setLoading(true)
        try {
            await updateTournamentStatus(tournament.id, isPublished)
            setOpen(false)
            router.refresh()
        } catch (error) {
            console.error('Failed to update tournament', error)
            // Ideally show a toast here
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Tournament</DialogTitle>
                    <DialogDescription>
                        Manage visibility settings for {tournament.name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex items-center space-x-4">
                        <Label htmlFor="published" className="flex flex-col space-y-1">
                            <span>Published</span>
                            <span className="font-normal text-xs text-muted-foreground">
                                Visible to public and all players.
                            </span>
                        </Label>
                        <Switch
                            id="published"
                            checked={isPublished}
                            onCheckedChange={setIsPublished}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving...' : 'Save changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
