'use client'

import { Table } from '@tanstack/react-table'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface DataTableToolbarProps<TData> {
    table: Table<TData>
}

export function DataTableToolbar<TData>({
    table,
}: DataTableToolbarProps<TData>) {
    const isFiltered = table.getState().columnFilters.length > 0

    // Derive the current single-select value from the array-based column filter
    const statusFilter = table.getColumn('status')?.getFilterValue() as string[] | undefined
    const statusValue = statusFilter?.length === 1 ? statusFilter[0] : (statusFilter?.length ? 'custom' : 'all')

    const publishedFilter = table.getColumn('is_published')?.getFilterValue() as string[] | undefined
    const publishedValue = publishedFilter?.length === 1 ? publishedFilter[0] : (publishedFilter?.length ? 'custom' : 'all')

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
                <Input
                    placeholder="Search tournaments..."
                    value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
                    onChange={(event) =>
                        table.getColumn('name')?.setFilterValue(event.target.value)
                    }
                    className="h-8 w-[180px] lg:w-[250px]"
                />

                {table.getColumn('status') && (
                    <Select
                        value={statusValue}
                        onValueChange={(value) => {
                            if (value === 'all') {
                                table.getColumn('status')?.setFilterValue(undefined)
                            } else {
                                table.getColumn('status')?.setFilterValue([value])
                            }
                        }}
                    >
                        <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="running">🟢 Live</SelectItem>
                            <SelectItem value="completed">✅ Completed</SelectItem>
                            <SelectItem value="not_started">⏳ Not Started</SelectItem>
                        </SelectContent>
                    </Select>
                )}

                {table.getColumn('is_published') && (
                    <Select
                        value={publishedValue}
                        onValueChange={(value) => {
                            if (value === 'all') {
                                table.getColumn('is_published')?.setFilterValue(undefined)
                            } else {
                                table.getColumn('is_published')?.setFilterValue([value])
                            }
                        }}
                    >
                        <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue placeholder="Visibility" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Visibility</SelectItem>
                            <SelectItem value="true">📢 Published</SelectItem>
                            <SelectItem value="false">🔒 Hidden</SelectItem>
                        </SelectContent>
                    </Select>
                )}

                {isFiltered && (
                    <Button
                        variant="ghost"
                        onClick={() => table.resetColumnFilters()}
                        className="h-8 px-2 lg:px-3"
                    >
                        Reset
                        <X className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="text-sm text-muted-foreground whitespace-nowrap">
                {table.getFilteredRowModel().rows.length} of{' '}
                {table.getCoreRowModel().rows.length} tournament(s)
            </div>
        </div>
    )
}
