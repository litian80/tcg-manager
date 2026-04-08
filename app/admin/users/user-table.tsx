'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { searchUsers, adminUpdateUser } from './actions'
import { deleteUser } from './delete-user'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Pencil, Trash2, Shield, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { RoleSelect } from './role-select'
import { useDebounce } from '@/hooks/use-debounce'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApplicationReviewDialog } from './application-review-dialog'
import {
    getOrganiserApplications,
    type OrganiserApplicationWithProfile
} from '@/actions/organiser-application'

// Inline debounce hook since I'm not sure if the project has one
function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}

export default function UserTable() {
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounceValue(search, 500)
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [editingUser, setEditingUser] = useState<any>(null)
    const [open, setOpen] = useState(false)
    const [deleteUserOpen, setDeleteUserOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<any>(null)

    // Sorting and Filtering
    const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'}>({ key: 'created_at', direction: 'desc' })
    const [filterRole, setFilterRole] = useState('all')

    // Organiser applications state
    const [applications, setApplications] = useState<OrganiserApplicationWithProfile[]>([])
    const [reviewingApp, setReviewingApp] = useState<OrganiserApplicationWithProfile | null>(null)
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false)

    // Form State
    const [pid, setPid] = useState('')
    const [byear, setByear] = useState('')

    const fetchUsers = useCallback(async (query: string, sortKey: string, sortDirection: 'asc' | 'desc', role: string) => {
        setLoading(true)
        try {
            const data = await searchUsers(query, sortKey, sortDirection, role)
            setUsers(data || [])
        } catch (error) {
            console.error(error)
            toast.error("Failed to fetch users")
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchApplications = useCallback(async () => {
        const result = await getOrganiserApplications()
        if (result.success) {
            setApplications(result.success)
        }
    }, [])

    useEffect(() => {
        fetchUsers(debouncedSearch, sortConfig.key, sortConfig.direction, filterRole)
    }, [debouncedSearch, sortConfig, filterRole, fetchUsers])

    useEffect(() => {
        fetchApplications()
    }, [fetchApplications])

    const handleEditClick = (user: any) => {
        setEditingUser(user)
        setPid(user.pokemon_player_id || '')
        setByear(user.birth_year ? String(user.birth_year) : '')
        setOpen(true)
    }

    const handleSave = async () => {
        if (!editingUser) return

        const result = await adminUpdateUser(editingUser.id, {
            pokemon_player_id: pid,
            birth_year: byear
        })
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("User updated successfully")
            setOpen(false)
            fetchUsers(debouncedSearch, sortConfig.key, sortConfig.direction, filterRole)
        }
    }

    const handleDeleteClick = (user: any) => {
        setUserToDelete(user)
        setDeleteUserOpen(true)
    }

    const confirmDelete = async () => {
        if (!userToDelete) return;

        try {
            await deleteUser(userToDelete.id)
            toast.success("User deleted successfully")
            setDeleteUserOpen(false)
            setUserToDelete(null)
            fetchUsers(debouncedSearch, sortConfig.key, sortConfig.direction, filterRole) // Refresh list
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Failed to delete user")
        }
    }

    // Helper: get pending application for a user
    const getPendingApp = (userId: string) =>
        applications.find(a => a.user_id === userId && a.status === 'pending')

    const getLatestApp = (userId: string) =>
        applications.find(a => a.user_id === userId)

    const pendingCount = applications.filter(a => a.status === 'pending').length

    // Sort users: pending applicants first, then preserve original order
    const sortedUsers = useMemo(() => {
        const pendingIds = new Set(
            applications.filter(a => a.status === 'pending').map(a => a.user_id)
        )
        if (pendingIds.size === 0) return users
        return [...users].sort((a, b) => {
            const aPending = pendingIds.has(a.id) ? 0 : 1
            const bPending = pendingIds.has(b.id) ? 0 : 1
            return aPending - bPending
        })
    }, [users, applications])

    const handleReviewClick = (app: OrganiserApplicationWithProfile) => {
        setReviewingApp(app)
        setReviewDialogOpen(true)
    }

    const handleReviewComplete = () => {
        fetchApplications()
        fetchUsers(debouncedSearch, sortConfig.key, sortConfig.direction, filterRole)
    }

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const getSortIcon = (columnName: string) => {
        if (sortConfig.key !== columnName) {
            return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
        }
        return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
    }

    return (
        <div className="space-y-4">
            {/* Pending Applications Banner */}
            {pendingCount > 0 && (
                <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 py-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">
                        {pendingCount} pending organiser {pendingCount === 1 ? 'application' : 'applications'}
                    </span>
                    <Badge variant="default" className="ml-1">{pendingCount}</Badge>
                </div>
            )}

            <div className="flex items-center gap-2">
                <Input
                    placeholder="Search by email, name, or Player ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
                <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="organizer">Organizer</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                </Select>
                {loading && <span className="text-sm text-muted-foreground animate-pulse">Searching...</span>}
            </div>

            <div className="rounded-md border bg-background">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSort('first_name')}>
                                <div className="flex items-center">Name {getSortIcon('first_name')}</div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSort('email')}>
                                <div className="flex items-center">Email {getSortIcon('email')}</div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSort('role')}>
                                <div className="flex items-center">Role {getSortIcon('role')}</div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSort('pokemon_player_id')}>
                                <div className="flex items-center">Player ID {getSortIcon('pokemon_player_id')}</div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSort('birth_year')}>
                                <div className="flex items-center">Birth Year {getSortIcon('birth_year')}</div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSort('created_at')}>
                                <div className="flex items-center">Registered {getSortIcon('created_at')}</div>
                            </TableHead>
                            <TableHead className="w-[80px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        )}
                        {sortedUsers.map((user) => {
                            const pendingApp = getPendingApp(user.id)
                            return (
                                <TableRow key={user.id} className={pendingApp ? 'bg-primary/[0.02]' : undefined}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {user.first_name} {user.last_name}
                                            {pendingApp && (
                                                <Badge
                                                    variant="default"
                                                    className="cursor-pointer text-xs"
                                                    onClick={() => handleReviewClick(pendingApp)}
                                                >
                                                    <Shield className="h-3 w-3 mr-1" />
                                                    Pending
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <RoleSelect userId={user.id} currentRole={user.role} />
                                    </TableCell>
                                    <TableCell>{user.pokemon_player_id || '-'}</TableCell>
                                    <TableCell>{user.birth_year || '-'}</TableCell>
                                    <TableCell suppressHydrationWarning>
                                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Edit user</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDeleteClick(user)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete user</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="pid" className="text-right">Player ID</Label>
                            <Input
                                id="pid"
                                value={pid}
                                onChange={(e) => setPid(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="byear" className="text-right">Birth Year</Label>
                            <Input
                                id="byear"
                                type="number"
                                value={byear}
                                onChange={(e) => setByear(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleSave}>Save Changes</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteUserOpen} onOpenChange={setDeleteUserOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user
                            <span className="font-semibold text-foreground"> {userToDelete?.first_name} {userToDelete?.last_name} </span>
                            and remove their data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            Delete Account
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <ApplicationReviewDialog
                application={reviewingApp}
                open={reviewDialogOpen}
                onOpenChange={setReviewDialogOpen}
                onReviewComplete={handleReviewComplete}
            />
        </div>
    )
}
