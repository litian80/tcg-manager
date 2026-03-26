"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Radio, FlagTriangleRight } from "lucide-react";

interface TournamentDashboardTabsProps {
    defaultTab: string;
    children: {
        pre: React.ReactNode;
        during: React.ReactNode;
        post: React.ReactNode;
    };
}

export function TournamentDashboardTabs({ defaultTab, children }: TournamentDashboardTabsProps) {
    const [currentTab, setCurrentTab] = useState(defaultTab);

    return (
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
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
