'use client'

import * as React from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { DataTableToolbar } from './data-table-toolbar'

// Columns whose filter value is an array of strings (faceted/multi-select)
const FACETED_COLUMNS = new Set(['status', 'is_published'])

// Default filters applied when the page is loaded with no query params
const DEFAULT_FILTERS: ColumnFiltersState = [
    { id: 'status', value: ['running'] },
]

/** Parse URL search params into ColumnFiltersState */
function parseSearchParams(params: URLSearchParams): ColumnFiltersState | null {
    // If there are absolutely no recognised filter keys, return null to signal
    // "use defaults". An explicit empty param (e.g. ?status=) is treated as
    // "no filter for that column" rather than "use defaults".
    const filterKeys = ['status', 'published', 'q']
    const hasAny = filterKeys.some((k) => params.has(k))
    if (!hasAny) return null

    const filters: ColumnFiltersState = []

    // Status — multi-value, comma-separated
    const status = params.get('status')
    if (status) {
        filters.push({ id: 'status', value: status.split(',') })
    }

    // Published — maps to column "is_published", multi-value
    const published = params.get('published')
    if (published) {
        filters.push({ id: 'is_published', value: published.split(',') })
    }

    // Free-text search — maps to column "name"
    const q = params.get('q')
    if (q) {
        filters.push({ id: 'name', value: q })
    }

    return filters
}

/** Serialise ColumnFiltersState back to URLSearchParams string */
function filtersToSearchParams(filters: ColumnFiltersState): string {
    const params = new URLSearchParams()

    for (const filter of filters) {
        if (filter.id === 'status' && Array.isArray(filter.value) && filter.value.length > 0) {
            params.set('status', (filter.value as string[]).join(','))
        } else if (filter.id === 'is_published' && Array.isArray(filter.value) && filter.value.length > 0) {
            params.set('published', (filter.value as string[]).join(','))
        } else if (filter.id === 'name' && filter.value) {
            params.set('q', filter.value as string)
        }
    }

    return params.toString()
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
}

export function DataTable<TData, TValue>({
    columns,
    data,
}: DataTableProps<TData, TValue>) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    // Determine initial filters: from URL if present, otherwise defaults
    const initialFilters = React.useMemo(() => {
        const fromUrl = parseSearchParams(searchParams)
        return fromUrl ?? DEFAULT_FILTERS
    }, []) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally run once on mount

    const [rowSelection, setRowSelection] = React.useState({})
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(initialFilters)
    const [sorting, setSorting] = React.useState<SortingState>([
        { id: 'date', desc: true },
    ])

    // Sync filter state → URL (skip the initial render to avoid a redundant replace)
    const isFirstRender = React.useRef(true)
    React.useEffect(() => {
        if (isFirstRender.current) {
            // On first render, set the URL to match the resolved initial filters
            // so the address bar always reflects the active view
            const qs = filtersToSearchParams(columnFilters)
            const url = qs ? `${pathname}?${qs}` : pathname
            router.replace(url, { scroll: false })
            isFirstRender.current = false
            return
        }

        const qs = filtersToSearchParams(columnFilters)
        const url = qs ? `${pathname}?${qs}` : pathname
        router.replace(url, { scroll: false })
    }, [columnFilters, pathname, router])

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            columnFilters,
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
    })

    return (
        <div className="space-y-4">
            <DataTableToolbar table={table} />
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} colSpan={header.colSpan}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}
