'use client'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { updateUserRole, AppRole } from "./actions"
import { useState } from "react"
import { Loader2 } from "lucide-react"

interface RoleSelectProps {
    userId: string
    currentRole: AppRole
    disabled?: boolean
}

export function RoleSelect({ userId, currentRole, disabled }: RoleSelectProps) {
    const [role, setRole] = useState<AppRole>(currentRole)
    const [isUpdating, setIsUpdating] = useState(false)

    const handleValueChange = async (newRole: AppRole) => {
        const previousRole = role
        setRole(newRole)
        setIsUpdating(true)

        const result = await updateUserRole(userId, newRole)
        if (result.error) {
            setRole(previousRole)
            toast.error(result.error)
        } else {
            toast.success(`Role updated to ${newRole}`)
        }
        setIsUpdating(false)
    }

    return (
        <div className="flex items-center gap-2">
            <Select
                value={role}
                onValueChange={handleValueChange}
                disabled={disabled || isUpdating}
            >
                <SelectTrigger className="w-[110px] h-8">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="organizer">Organizer</SelectItem>
                    <SelectItem value="judge">Judge</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                </SelectContent>
            </Select>
            {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
    )
}
