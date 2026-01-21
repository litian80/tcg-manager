'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Row } from '@tanstack/react-table'
import { Trash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteTournament } from '@/app/actions/admin-tournaments'
import { toast } from 'sonner'
import { EditTournamentDialog } from '@/components/admin/edit-tournament-dialog'
import { Database } from '@/utils/supabase/database.types'

type Tournament = Database['public']['Tables']['tournaments']['Row']

interface DataTableRowActionsProps<TData> {
    row: Row<TData>
}

export function DataTableRowActions<TData>({
    row,
}: DataTableRowActionsProps<TData>) {
    const router = useRouter()
    const tournament = row.original as Tournament
    const [showDeleteAlert, setShowDeleteAlert] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            await deleteTournament(tournament.id)
            toast.success('Tournament deleted successfully')
            router.refresh()
            setShowDeleteAlert(false)
        } catch (error) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : 'Failed to delete tournament')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="flex items-center">
            <EditTournamentDialog tournament={tournament} />

            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteAlert(true)}
            >
                <Trash className="h-4 w-4" />
                <span className="sr-only">Delete</span>
            </Button>

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the tournament and all associated matches/records.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 focus:ring-red-600">
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
