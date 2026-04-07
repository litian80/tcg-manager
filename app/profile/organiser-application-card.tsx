'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { toast } from 'sonner'
import { Shield, Clock, CheckCircle2, XCircle, Undo2, Send, ExternalLink, Loader2 } from 'lucide-react'
import { submitOrganiserApplication, withdrawOrganiserApplication } from '@/actions/organiser-application'
import { formatDate } from '@/lib/utils'

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn'

interface OrganiserApplication {
    id: string
    status: string
    league_url: string
    association: string
    admin_notes: string | null
    created_at: string
    updated_at: string
}

interface OrganiserApplicationCardProps {
    application: OrganiserApplication | null
    userRole: string
}

const STATUS_CONFIG: Record<ApplicationStatus, {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    icon: React.ElementType
    description: string
}> = {
    pending: {
        label: 'Pending Review',
        variant: 'default',
        icon: Clock,
        description: 'Your application is being reviewed by an administrator.',
    },
    approved: {
        label: 'Approved',
        variant: 'default',
        icon: CheckCircle2,
        description: 'Your application has been approved! You now have organiser privileges.',
    },
    rejected: {
        label: 'Rejected',
        variant: 'destructive',
        icon: XCircle,
        description: 'Your application was not approved. You may submit a new application.',
    },
    withdrawn: {
        label: 'Withdrawn',
        variant: 'secondary',
        icon: Undo2,
        description: 'You withdrew your application. You may submit a new one at any time.',
    },
}

export function OrganiserApplicationCard({ application, userRole }: OrganiserApplicationCardProps) {
    const [isPending, startTransition] = useTransition()
    const [confirmWithdrawOpen, setConfirmWithdrawOpen] = useState(false)

    // Don't show for users who already have organiser/admin privileges and no application
    if ((userRole === 'organizer' || userRole === 'admin') && !application) {
        return null
    }

    const status = application?.status as ApplicationStatus | undefined
    const statusConfig = status ? STATUS_CONFIG[status] : null
    const canApply = !application || status === 'rejected' || status === 'withdrawn'
    const canWithdraw = status === 'pending'

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            const result = await submitOrganiserApplication(formData)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Application submitted successfully!')
            }
        })
    }

    const handleWithdraw = () => {
        if (!application) return
        startTransition(async () => {
            const result = await withdrawOrganiserApplication(application.id)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Application withdrawn')
            }
            setConfirmWithdrawOpen(false)
        })
    }

    return (
        <>
            <Card className="max-w-xl mx-auto mt-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Organiser Application</CardTitle>
                        </div>
                        {statusConfig && (
                            <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                                <statusConfig.icon className="h-3 w-3" />
                                {statusConfig.label}
                            </Badge>
                        )}
                    </div>
                    <CardDescription>
                        {statusConfig
                            ? statusConfig.description
                            : 'Apply for organiser privileges to create and manage Pokémon TCG tournaments.'
                        }
                    </CardDescription>
                </CardHeader>

                {/* Show existing application details */}
                {application && status === 'pending' && (
                    <CardContent className="space-y-3">
                        <div className="text-sm space-y-2 rounded-md border p-3 bg-muted/50">
                            <div>
                                <span className="font-medium text-muted-foreground">League URL: </span>
                                <a
                                    href={application.league_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                    View League <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                            <div>
                                <span className="font-medium text-muted-foreground">Association: </span>
                                <span>{application.association}</span>
                            </div>
                            <div>
                                <span className="font-medium text-muted-foreground">Submitted: </span>
                                <span>{formatDate(application.created_at)}</span>
                            </div>
                        </div>
                    </CardContent>
                )}

                {/* Show rejection notes if any */}
                {application && status === 'rejected' && application.admin_notes && (
                    <CardContent>
                        <div className="text-sm rounded-md border border-destructive/20 bg-destructive/5 p-3">
                            <span className="font-medium">Admin Notes: </span>
                            <span>{application.admin_notes}</span>
                        </div>
                    </CardContent>
                )}

                {/* Application Form — show if user can apply */}
                {canApply && (
                    <form action={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="league_url">Pokémon League URL</Label>
                                <Input
                                    id="league_url"
                                    name="league_url"
                                    type="url"
                                    placeholder="https://www.pokemon.com/us/play-pokemon/pokemon-events/leagues/123456"
                                    required
                                    disabled={isPending}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Enter the URL of the Pokémon League you are associated with.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="association">Your Association with this League</Label>
                                <Textarea
                                    id="association"
                                    name="association"
                                    placeholder="Describe your role and relationship with this league (e.g. League Leader, regular organiser, etc.)"
                                    required
                                    minLength={10}
                                    maxLength={2000}
                                    rows={3}
                                    disabled={isPending}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end">
                            <Button type="submit" disabled={isPending}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Submit Application
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                )}

                {/* Withdraw button for pending apps */}
                {canWithdraw && (
                    <CardFooter className="flex justify-end">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmWithdrawOpen(true)}
                            disabled={isPending}
                        >
                            <Undo2 className="h-4 w-4 mr-2" />
                            Withdraw Application
                        </Button>
                    </CardFooter>
                )}
            </Card>

            <AlertDialog open={confirmWithdrawOpen} onOpenChange={setConfirmWithdrawOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to withdraw your organiser application?
                            You can submit a new application at any time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleWithdraw} disabled={isPending}>
                            {isPending ? 'Withdrawing...' : 'Withdraw'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
