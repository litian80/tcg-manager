"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Radio, FlagTriangleRight } from "lucide-react";
import { useCallback } from "react";

interface TournamentDashboardTabsProps {
    defaultTab: string;
    children: {
        pre: React.ReactNode;
        during: React.ReactNode;
        post: React.ReactNode;
    };
}

export function TournamentDashboardTabs({ defaultTab, children }: TournamentDashboardTabsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentTab = searchParams.get("tab") || defaultTab;

    const handleTabChange = useCallback((value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", value);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [router, pathname, searchParams]);

    return (
        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="w-full grid grid-cols-3 h-auto">
                <TabsTrigger value="pre" className="gap-1.5 py-2.5 data-[state=active]:shadow-md">
                    <ClipboardList className="w-4 h-4" />
                    <span className="hidden sm:inline">Pre-Tournament</span>
                    <span className="sm:hidden text-xs">Setup</span>
                </TabsTrigger>
                <TabsTrigger value="during" className="gap-1.5 py-2.5 data-[state=active]:shadow-md">
                    <Radio className="w-4 h-4" />
                    <span className="hidden sm:inline">During Event</span>
                    <span className="sm:hidden text-xs">Live</span>
                </TabsTrigger>
                <TabsTrigger value="post" className="gap-1.5 py-2.5 data-[state=active]:shadow-md">
                    <FlagTriangleRight className="w-4 h-4" />
                    <span className="hidden sm:inline">Post-Tournament</span>
                    <span className="sm:hidden text-xs">Wrap-up</span>
                </TabsTrigger>
            </TabsList>

            <TabsContent value="pre">
                {children.pre}
            </TabsContent>
            <TabsContent value="during">
                {children.during}
            </TabsContent>
            <TabsContent value="post">
                {children.post}
            </TabsContent>
        </Tabs>
    );
}
