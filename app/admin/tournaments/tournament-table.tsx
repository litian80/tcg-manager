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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EditTournamentDialog } from "@/components/admin/edit-tournament-dialog"
import { formatDate, getTournamentStatusConfig } from "@/lib/utils"
import { Database } from "@/utils/supabase/database.types"

import { Tournament } from '@/types'

interface TournamentTableProps {
    tournaments: Tournament[]
}

export function TournamentTable({ tournaments }: TournamentTableProps) {
    return (
        <div className="space-y-4">
            {/* Desktop View */}
            <div className="hidden md:block rounded-md border">
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
                            <TableCell>{formatDate(tournament.date)}</TableCell>
                            <TableCell>{tournament.organizer_popid || 'N/A'}</TableCell>
                            <TableCell>
                                {(() => {
                                    const config = getTournamentStatusConfig(tournament.status)
                                    return (
                                        <Badge variant={config.variant} className={config.className}>
                                            {config.label}
                                        </Badge>
                                    )
                                })()}
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

            {/* Mobile View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {tournaments.map((tournament) => {
                    const config = getTournamentStatusConfig(tournament.status)
                    return (
                        <Card key={tournament.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start gap-4">
                                    <CardTitle className="text-base font-semibold">{tournament.name}</CardTitle>
                                    <Badge variant={config.variant} className={config.className}>
                                        {config.label}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pb-4 border-t pt-4 mt-2">
                                <div className="flex flex-col gap-1 text-sm">
                                    <span className="text-muted-foreground text-xs uppercase tracking-wider">Date</span>
                                    <span>{formatDate(tournament.date)}</span>
                                </div>
                                <div className="flex flex-col gap-1 text-sm">
                                    <span className="text-muted-foreground text-xs uppercase tracking-wider">Organizer PID</span>
                                    <span>{tournament.organizer_popid || 'N/A'}</span>
                                </div>
                                <div className="flex flex-col gap-1 text-sm">
                                    <span className="text-muted-foreground text-xs uppercase tracking-wider">Published</span>
                                    <div>
                                        <Badge variant={tournament.is_published ? 'outline' : 'destructive'}>
                                            {tournament.is_published ? 'Yes' : 'No'}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <EditTournamentDialog tournament={tournament} />
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
                {tournaments.length === 0 && (
                    <div className="text-center p-8 border rounded-md text-sm text-muted-foreground">
                        No tournaments found.
                    </div>
                )}
            </div>
        </div>
    )
}
