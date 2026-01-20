'use client'

import { useState, useEffect, useCallback } from 'react'
import { searchUsers, adminUpdateUser } from './actions'
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
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce' // We might need to implement this hook if not exists, but I'll write inline debounce for now to be safe.

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
                                    <span className="capitalize">{user.role}</span>
                                </TableCell>
                                <TableCell>{user.pokemon_player_id || '-'}</TableCell>
                                <TableCell>{user.birth_year || '-'}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                                        <Pencil className="h-4 w-4" />
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
        </div>
    )
}
