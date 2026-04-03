"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { registerPlayer, withdrawPlayer } from "@/actions/registration";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import { Loader2, ExternalLink } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RegisterButtonProps {
    tournamentId: string;
    status?: string | null;
    waitlistPosition?: number | null;
    registrationOpen: boolean;
    opensAt?: string | null;
    closesAt?: string | null;
    lockedDown?: boolean;
    paymentUrl?: string | null;
    paymentPendingSince?: string | null;
}

export function RegisterButton({ 
    tournamentId, 
    status, 
    waitlistPosition,
    registrationOpen, 
    opensAt, 
    closesAt,
    lockedDown,
    paymentUrl,
    paymentPendingSince,
}: RegisterButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
    const [currentPaymentUrl, setCurrentPaymentUrl] = useState<string | null>(paymentUrl || null);

    const isRegistrationUpcoming = opensAt && new Date(opensAt) > new Date();
    const isRegistrationClosed = closesAt && new Date(closesAt) < new Date();
    const isRegistrationAvailable = registrationOpen && !isRegistrationUpcoming && !isRegistrationClosed;

    const handleRegister = async () => {
        setIsLoading(true);
        try {
            const result = await registerPlayer(tournamentId);
            if (result.error) {
                toast.error(result.error);
            } else {
                if (result.status === 'pending_payment' && result.paymentUrl) {
                    toast.success("Registration started — complete payment to confirm your spot.");
                    setCurrentPaymentUrl(result.paymentUrl);
                    window.open(result.paymentUrl, '_blank');
                } else if (result.status === 'waitlisted') {
                    toast.success("Added to waitlist!");
                } else {
                    toast.success("Successfully registered!");
                }
            }
        } catch (error) {
            toast.error("Failed to register. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleWithdraw = async () => {
        setIsLoading(true);
        setIsWithdrawDialogOpen(false);
        try {
            const result = await withdrawPlayer(tournamentId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Successfully withdrawn from the tournament.");
            }
        } catch (error) {
            toast.error("Failed to withdraw. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Pending Payment state
    if (status === 'pending_payment') {
        return (
            <div className="flex flex-col gap-2 w-full">
                <Button disabled className="w-full bg-amber-600 text-white opacity-100 font-semibold border-amber-700">
                    ⏳ Payment Pending
                </Button>
                {currentPaymentUrl && (
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(currentPaymentUrl, '_blank')}
                    >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Complete Payment
                    </Button>
                )}
                <AlertDialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10">
                            Cancel Registration
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Registration?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will cancel your pending registration. You will need to re-register and complete payment again if you change your mind.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Keep Registration</AlertDialogCancel>
                            <AlertDialogAction onClick={handleWithdraw} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Cancel Registration
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                {paymentPendingSince && (
                    <p className="text-xs text-center text-muted-foreground">
                        Payment expires 24 hours after registration.
                    </p>
                )}
            </div>
        );
    }

    // Registered / Checked In state
    if (status === 'registered' || status === 'checked_in') {
        return (
            <div className="flex flex-col gap-2 w-full">
                <Button disabled className="w-full bg-green-600 text-white opacity-100 font-semibold border-green-700">
                     {status === 'checked_in' ? 'Checked In' : 'Registered'}
                </Button>
                {lockedDown ? (
                    <p className="text-xs text-center text-muted-foreground">
                        Registration has closed. To withdraw, please contact the Event Organizer directly.
                    </p>
                ) : (
                    <AlertDialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10">
                                Withdraw
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will remove you from the tournament. If there is a waitlist, your spot will be given to the next person. If you wish to rejoin later, you may be placed on the waitlist.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleWithdraw} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Withdraw
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        );
    }

    if (status === 'waitlisted') {
        return (
            <div className="flex flex-col gap-2 w-full">
                <Button disabled variant="secondary" className="w-full opacity-100 font-semibold border-secondary flex flex-col items-center h-auto py-2">
                    <span>On Waitlist</span>
                    {waitlistPosition !== undefined && waitlistPosition !== null && (
                        <span className="text-xs font-normal opacity-80">Position: #{waitlistPosition}</span>
                    )}
                </Button>
                {lockedDown ? (
                    <p className="text-xs text-center text-muted-foreground">
                        Registration has closed. To leave the waitlist, please contact the Event Organizer.
                    </p>
                ) : (
                    <AlertDialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10">
                                Leave Waitlist
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Leave Waitlist?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will remove you from the waitlist. You will lose your spot in line.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleWithdraw} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Leave Waitlist
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        );
    }

    if (status === 'cancelled') {
         return (
             <Button disabled variant="destructive" className="w-full font-semibold opacity-100 border-destructive">
                 Registration Cancelled
             </Button>
         );
    }

    // Default states (Not registered, withdrawn, etc)
    if (!registrationOpen) {
        return (
            <Button disabled variant="outline" className="w-full">
                Registration Not Open
            </Button>
        );
    }

    if (isRegistrationUpcoming) {
        return (
            <Button disabled variant="outline" className="w-full">
                Opens {formatDateTime(opensAt!)}
            </Button>
        );
    }

    if (isRegistrationClosed) {
        return (
            <Button disabled variant="outline" className="w-full">
                Registration Closed
            </Button>
        );
    }

    return (
        <Button 
            onClick={handleRegister} 
            disabled={isLoading}
            className="w-full"
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {status === 'withdrawn' ? 'Re-Register' : 'Register'}
        </Button>
    );
}
