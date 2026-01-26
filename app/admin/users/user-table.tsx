'use client'

import { useState, useEffect, useCallback } from 'react'
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
    DialogTrigger,
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
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { RoleSelect } from './role-select'
import { useDebounce } from '@/hooks/use-debounce'

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

    // Form State
    const [pid, setPid] = useState('')
    const [byear, setByear] = useState('')

    const fetchUsers = useCallback(async (query: string) => {
        setLoading(true)
        try {
            const data = await searchUsers(query)
            setUsers(data || [])
        } catch (error) {
            console.error(error)
            toast.error("Failed to fetch users")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchUsers(debouncedSearch)
    }, [debouncedSearch, fetchUsers])

    const handleEditClick = (user: any) => {
        setEditingUser(user)
        setPid(user.pokemon_player_id || '')
        setByear(user.birth_year ? String(user.birth_year) : '')
        setOpen(true)
    }

    const handleSave = async () => {
        if (!editingUser) return

        try {
            await adminUpdateUser(editingUser.id, {
                pokemon_player_id: pid,
                birth_year: byear
            })
            toast.success("User updated successfully")
            setOpen(false)
            fetchUsers(debouncedSearch) // Refresh list
        } catch (err: any) {
            toast.error(err.message || "Failed to update user")
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
            fetchUsers(debouncedSearch) // Refresh list
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Failed to delete user")
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Input
                    placeholder="Search by email, name, or Player ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
                {loading && <span className="text-sm text-muted-foreground animate-pulse">Searching...</span>}
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Player ID</TableHead>
                            <TableHead>Birth Year</TableHead>
                            <TableHead className="w-[80px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        )}
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">
                                    {user.first_name} {user.last_name}
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <RoleSelect userId={user.id} currentRole={user.role} />
                                </TableCell>
                                <TableCell>{user.pokemon_player_id || '-'}</TableCell>
                                <TableCell>{user.birth_year || '-'}</TableCell>
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
                        ))}
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
        </div>
    )
}
