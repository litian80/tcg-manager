"use client";

import { useState, useEffect } from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Info, ChevronRight, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export interface Announcement {
    id: string;
    title: string;
    banner_text: string;
    details_text?: string | null;
    type: 'info' | 'warning' | 'urgent' | 'success';
    target_audience: string[];
}

interface AnnouncementBannerProps {
    announcement: Announcement | null;
    userRoleContext: {
        isParticipant: boolean;
        isStaff: boolean;
        isOrganizer: boolean;
        isSpectator: boolean;
    };
}

export function AnnouncementBanner({ announcement, userRoleContext }: AnnouncementBannerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        setIsDismissed(false);
    }, [announcement?.id]);

    if (!announcement || isDismissed) return null;

    // Audience matching is now handled primarily server-side for security,
    // but we can retain the client-side check as a secondary fallback.
    const audience = announcement.target_audience || [];
    let isTarget = false;
    
    if (audience.includes("all")) {
        isTarget = true;
    } else {
        if (userRoleContext.isParticipant && audience.includes("participants")) isTarget = true;
        if (userRoleContext.isStaff && audience.includes("staff")) isTarget = true;
        if (userRoleContext.isOrganizer && audience.includes("organizers")) isTarget = true;
        if (userRoleContext.isSpectator && audience.includes("spectators")) isTarget = true;
    }

    if (!isTarget) return null;

    const validTypes = ['info', 'warning', 'urgent', 'success'] as const;
    const type = validTypes.includes(announcement.type as any) 
        ? announcement.type 
        : 'info';

    const styles = {
        info: "bg-blue-500 text-white hover:bg-blue-600",
        warning: "bg-orange-500 text-white hover:bg-orange-600",
        urgent: "bg-red-600 text-white hover:bg-red-700 font-medium",
        success: "bg-green-600 text-white hover:bg-green-700",
    };
    
    const iconStyles = {
        info: "bg-blue-500",
        warning: "bg-orange-500",
        urgent: "bg-red-600",
        success: "bg-green-600",
    };

    const icons = {
        info: <Info className="w-5 h-5 flex-shrink-0" />,
        warning: <AlertTriangle className="w-5 h-5 flex-shrink-0" />,
        urgent: <AlertCircle className="w-5 h-5 flex-shrink-0" />,
        success: <CheckCircle className="w-5 h-5 flex-shrink-0" />,
    };

    const hasDetails = !!announcement.details_text?.trim();

    return (
        <>
            <div 
                role={hasDetails ? "button" : undefined}
                tabIndex={hasDetails ? 0 : undefined}
                className={`w-full px-4 py-3 flex items-center justify-between gap-3 shadow-md transition-colors ${styles[type]} ${hasDetails ? 'cursor-pointer' : ''}`}
                onClick={() => hasDetails && setIsOpen(true)}
                onKeyDown={(e) => {
                    if (hasDetails && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        setIsOpen(true);
                    }
                }}
            >
                <div className="flex items-center gap-3 min-w-0 max-w-[800px] mx-auto w-full">
                    {icons[type]}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <span className="font-bold text-sm tracking-wide uppercase opacity-90">{announcement.title}</span>
                        <p className="text-sm truncate">
                            {announcement.banner_text}
                        </p>
                    </div>
                    {hasDetails && (
                        <div className="flex items-center gap-1 flex-shrink-0 bg-white/20 px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                            Details <ChevronRight className="w-3 h-3" />
                        </div>
                    )}
                </div>
                <button 
                  onClick={(e) => {
                      e.stopPropagation();
                      setIsDismissed(true);
                  }}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
                  aria-label="Dismiss announcement"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {hasDetails && (
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto w-[95vw] rounded-xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <span className={`p-1.5 rounded-full text-white ${iconStyles[type]}`}>
                                    {icons[type]}
                                </span>
                                {announcement.title}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Detailed announcement for: {announcement.title}
                            </DialogDescription>
                            <div className="text-base text-foreground/80 mt-2 font-medium break-words">
                                {announcement.banner_text}
                            </div>
                        </DialogHeader>
                        
                        <div className="mt-4 prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>
                                {announcement.details_text!}
                            </ReactMarkdown>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
