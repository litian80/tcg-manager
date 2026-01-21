'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EditTournamentDialog } from "@/components/admin/edit-tournament-dialog"
import { Database } from "@/utils/supabase/database.types"

type Tournament = Database['public']['Tables']['tournaments']['Row']

interface TournamentTableProps {
    tournaments: Tournament[]
}

export function TournamentTable({ tournaments }: TournamentTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Organizer PID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Published</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tournaments.map((tournament) => (
                        <TableRow key={tournament.id}>
                            <TableCell className="font-medium">{tournament.name}</TableCell>
                            <TableCell>{new Date(tournament.date).toLocaleDateString()}</TableCell>
                            <TableCell>{tournament.organizer_popid || 'N/A'}</TableCell>
                            <TableCell>
                                <Badge variant={tournament.status === 'running' ? 'default' : 'secondary'}>
                                    {tournament.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={tournament.is_published ? 'outline' : 'destructive'}>
                                    {tournament.is_published ? 'Yes' : 'No'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <EditTournamentDialog tournament={tournament} />
                            </TableCell>
                        </TableRow>
                    ))}
                    {tournaments.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No tournaments found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
