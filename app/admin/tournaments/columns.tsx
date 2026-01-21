'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Info, Copy } from 'lucide-react'
import { Database } from '@/utils/supabase/database.types'
import { DataTableRowActions } from './row-actions'
import { EditTournamentDialog } from '@/components/admin/edit-tournament-dialog'
import { toast } from 'sonner'

export type Tournament = Database['public']['Tables']['tournaments']['Row']

export const columns: ColumnDef<Tournament>[] = [
    {
        accessorKey: 'tom_uid',
        header: 'Tournament ID',
        cell: ({ row }) => {
            const id = row.original.id
            const tomUid = row.original.tom_uid || id // Fallback if null, but should be tom_uid mainly
            const displayId = row.original.tom_uid || id.substring(0, 8)

            return (
                <div className="flex items-center space-x-2">
                    <a
                        href={`https://www.pokemon.com/us/pokemon-trainer-club/play-pokemon-tournaments/${tomUid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="max-w-[80px] truncate font-mono text-xs text-blue-600 hover:underline mr-1"
                        title={tomUid}
                    >
                        {displayId}
                    </a>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => {
                            navigator.clipboard.writeText(tomUid)
                            toast.success('Copied ID to clipboard')
                        }}
                    >
                        <Copy className="h-3 w-3" />
                    </Button>
                </div>
            )
        },
    },
    {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => {
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{row.getValue('name')}</span>
                </div>
            )
        },
    },
    {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => {
            const date = new Date(row.getValue('date'))
            return <div className="text-muted-foreground">{date.toLocaleDateString('en-US')}</div>
        },
    },
    {
        accessorKey: 'organizer_popid',
        header: 'Organizer',
        cell: ({ row }) => <div>{row.getValue('organizer_popid')}</div>,
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.getValue('status') as string
            return (
                <Badge variant={status === 'running' ? 'default' : 'secondary'}>
                    {status === 'running' ? 'Live' : 'Completed'}
                </Badge>
            )
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'is_published',
        header: 'Published',
        cell: ({ row }) => {
            const isPublished = row.getValue('is_published') as boolean
            return (
                <Badge variant={isPublished ? 'outline' : 'destructive'}>
                    {isPublished ? 'Published' : 'Hidden'}
                </Badge>
            )
        },
        filterFn: (row, id, value) => {
            // value is array of strings 'true'/'false'
            const rowVal = String(row.getValue(id))
            return value.includes(rowVal)
        },
    },
    {
        id: 'actions',
        cell: ({ row }) => <DataTableRowActions row={row} />,
    },
]
