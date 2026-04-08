'use client'

import { useState, useTransition } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, ExternalLink, Clock, Undo2, Loader2 } from 'lucide-react'
import {
    reviewOrganiserApplication,
    type OrganiserApplicationWithProfile
} from '@/actions/organiser-application'
import { ClientTime } from '@/components/client-time'

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn'

const STATUS_BADGE: Record<ApplicationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Pending', variant: 'default' },
    approved: { label: 'Approved', variant: 'secondary' },
    rejected: { label: 'Rejected', variant: 'destructive' },
    withdrawn: { label: 'Withdrawn', variant: 'outline' },
}

interface ApplicationReviewDialogProps {
    application: OrganiserApplicationWithProfile | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onReviewComplete: () => void
}

export function ApplicationReviewDialog({
    application,
    open,
    onOpenChange,
    onReviewComplete,
}: ApplicationReviewDialogProps) {
    const [adminNotes, setAdminNotes] = useState('')
    const [isPending, startTransition] = useTransition()

    if (!application) return null

    const status = application.status as ApplicationStatus
    const badge = STATUS_BADGE[status]
    const isPendingApp = status === 'pending'
    const profile = application.profiles

    const handleDecision = (decision: 'approved' | 'rejected') => {
        startTransition(async () => {
            const result = await reviewOrganiserApplication(
                application.id,
                decision,
                adminNotes || undefined
            )

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(
                    decision === 'approved'
                        ? `Application approved — ${profile.first_name} is now an organiser`
                        : 'Application rejected'
                )
                setAdminNotes('')
                onOpenChange(false)
                onReviewComplete()
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Review Application
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                    </DialogTitle>
                    <DialogDescription>
                        {profile.first_name} {profile.last_name} ({profile.email})
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Application Details */}
                    <div className="rounded-md border p-3 space-y-2 text-sm">
                        <div>
                            <span className="font-medium text-muted-foreground">League: </span>
                            <a
                                href={application.league_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                                View League Page <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                        <div>
                            <span className="font-medium text-muted-foreground">Association: </span>
                            <span>{application.association}</span>
                        </div>
                        <div>
                            <span className="font-medium text-muted-foreground">Current Role: </span>
                            <Badge variant="outline" className="ml-1">{profile.role}</Badge>
                        </div>
                        <div>
                            <span className="font-medium text-muted-foreground">Submitted: </span>
                            <span><ClientTime date={application.created_at} formatType="datetime" /></span>
                        </div>
                    </div>

                    {/* Admin notes for past decisions */}
                    {!isPendingApp && application.admin_notes && (
                        <div className="rounded-md border p-3 text-sm bg-muted/50">
                            <span className="font-medium text-muted-foreground">Admin Notes: </span>
                            <span>{application.admin_notes}</span>
                        </div>
                    )}

                    {/* Admin notes input — only for pending applications */}
                    {isPendingApp && (
                        <div className="space-y-2">
                            <Label htmlFor="admin_notes">Admin Notes (optional)</Label>
                            <Textarea
                                id="admin_notes"
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Optional notes (visible to the applicant if rejected)"
                                rows={2}
                                disabled={isPending}
                            />
                        </div>
                    )}
                </div>

                {/* Action buttons — only for pending applications */}
                {isPendingApp && (
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="destructive"
                            onClick={() => handleDecision('rejected')}
                            disabled={isPending}
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                            )}
                            Reject
                        </Button>
                        <Button
                            onClick={() => handleDecision('approved')}
                            disabled={isPending}
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            Approve
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
