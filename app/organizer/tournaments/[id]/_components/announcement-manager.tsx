"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Megaphone, CheckCircle2, Trash2, PowerOff } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import { createAnnouncement, setAnnouncementActive, deleteAnnouncement } from "@/actions/announcements";
import { format } from "date-fns";
import { Database } from "@/utils/supabase/database.types";

type Announcement = Database['public']['Tables']['tournament_announcements']['Row'];

const formSchema = z.object({
    title: z.string().min(2, "Title is too short").max(100),
    banner_text: z.string().min(5, "Banner text must be at least 5 characters").max(150),
    details_text: z.string().max(2000).optional(),
    type: z.enum(['info', 'warning', 'urgent', 'success']),
    target_audience: z.array(z.string()).min(1, "Select at least one audience type"),
});

const AUDIENCES = [
    { id: "all", label: "All Users" },
    { id: "participants", label: "Participants" },
    { id: "spectators", label: "Spectators" },
    { id: "organizers", label: "Organizers" },
    { id: "staff", label: "Staff" }
];

export function AnnouncementManager({
    tournamentId,
    activeAnnouncementId,
    preloadedAnnouncements
}: {
    tournamentId: string;
    activeAnnouncementId: string | null;
    preloadedAnnouncements: Announcement[];
}) {
    const [isPending, startTransition] = useTransition();
    const [showForm, setShowForm] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            banner_text: "",
            details_text: "",
            type: "info",
            target_audience: ["all"],
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        startTransition(async () => {
            const result = await createAnnouncement(tournamentId, values);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Announcement created successfully.");
                form.reset();
                setShowForm(false);
            }
        });
    };

    const handleToggleActive = (announcementId: string, currentlyActive: boolean) => {
        startTransition(async () => {
            const targetId = currentlyActive ? null : announcementId;
            const result = await setAnnouncementActive(tournamentId, targetId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(currentlyActive ? "Announcement deactivated" : "Announcement activated");
            }
        });
    };

    const handleDelete = (announcementId: string) => {
        if (!confirm("Are you sure you want to delete this announcement?")) return;
        startTransition(async () => {
            const result = await deleteAnnouncement(tournamentId, announcementId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Announcement deleted.");
            }
        });
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="md:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <Megaphone className="w-5 h-5 text-primary" />
                            Announcements History
                        </CardTitle>
                        <CardDescription>
                            Past updates for this tournament
                        </CardDescription>
                    </div>
                    <Button onClick={() => setShowForm(!showForm)} disabled={isPending} variant="outline" size="sm">
                        {showForm ? "Cancel" : <><Plus className="w-4 h-4 mr-1" /> New</>}
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {preloadedAnnouncements.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">
                                No announcements have been created yet.
                            </p>
                        ) : (
                            preloadedAnnouncements.map((ann) => {
                                const isActive = ann.id === activeAnnouncementId;
                                return (
                                    <div 
                                        key={ann.id} 
                                        className={`border rounded-lg p-4 space-y-3 transition-colors ${
                                            isActive ? 'border-primary/50 bg-primary/5 shadow-sm' : 'hover:bg-muted/50'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-sm leading-none">{ann.title}</h3>
                                                    {isActive && <Badge variant="default" className="text-[10px] h-4 px-1.5 py-0">Active</Badge>}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(ann.created_at), 'MMM d, yyyy h:mm a')}
                                                </p>
                                            </div>
                                            <Badge variant={
                                                ann.type === 'info' ? 'secondary' :
                                                ann.type === 'warning' ? 'destructive' : // actually orange/yellow standard? Wait, destructive is red. Custom coloring better.
                                                ann.type === 'urgent' ? 'destructive' :
                                                'default'
                                            } className="capitalize text-[10px]">
                                                {ann.type}
                                            </Badge>
                                        </div>
                                        
                                        <div className="text-sm border-l-2 pl-3 py-1">
                                            <p className="font-medium text-foreground">{ann.banner_text}</p>
                                        </div>

                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {(ann.target_audience || []).map((ta: string) => (
                                                <Badge key={ta} variant="outline" className="text-[10px] text-muted-foreground">
                                                    {ta}
                                                </Badge>
                                            ))}
                                        </div>

                                        <div className="flex gap-2 pt-2 justify-end">
                                            <Button
                                                size="sm"
                                                variant={isActive ? "secondary" : "default"}
                                                onClick={() => handleToggleActive(ann.id, isActive)}
                                                disabled={isPending}
                                                className="h-8 gap-1.5"
                                            >
                                                {isActive ? <PowerOff className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                {isActive ? "Deactivate" : "Make Active"}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(ann.id)}
                                                disabled={isPending || isActive}
                                                title={isActive ? "Cannot delete active announcement" : `Delete ${ann.title}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </CardContent>
            </Card>

            {showForm && (
                <Card className="md:col-span-1 shadow-md border-primary/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary/80"></div>
                    <CardHeader>
                        <CardTitle>Create Announcement</CardTitle>
                        <CardDescription>
                            Broadcast a new message to participants. This will deactivate the current active announcement.
                        </CardDescription>
                    </CardHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Lunch Break" {...field} disabled={isPending} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="info">Info (Blue)</SelectItem>
                                                    <SelectItem value="success">Success (Green)</SelectItem>
                                                    <SelectItem value="warning">Warning (Yellow/Orange)</SelectItem>
                                                    <SelectItem value="urgent">Urgent (Red)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="banner_text"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Banner Text (Short)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Lunch starts at 1:00 PM." {...field} disabled={isPending} />
                                            </FormControl>
                                            <FormDescription>
                                                Displayed at the top of the interface. Max 150 chars.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="details_text"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Detailed Description (Markdown)</FormLabel>
                                            <FormControl>
                                                <Textarea 
                                                    placeholder="More detailed text shown when the user expands the banner..." 
                                                    className="resize-none min-h-[120px]" 
                                                    {...field} 
                                                    disabled={isPending} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div>
                                    <FormLabel className="mb-2 block">Target Audience</FormLabel>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {AUDIENCES.map((item) => (
                                            <FormField
                                                key={item.id}
                                                control={form.control}
                                                name="target_audience"
                                                render={({ field }) => {
                                                    return (
                                                        <FormItem
                                                            key={item.id}
                                                            className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-background"
                                                        >
                                                            <FormControl>
                                                                <Checkbox
                                                                    disabled={isPending}
                                                                    checked={field.value?.includes(item.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        const isAll = item.id === "all";
                                                                        let newValue = [...(field.value || [])];
                                                                        
                                                                        if (checked) {
                                                                            if (isAll) {
                                                                                newValue = ["all"]; // If 'all' is checked, clear others and set 'all'
                                                                            } else {
                                                                                newValue = newValue.filter(v => v !== "all"); // Uncheck 'all'
                                                                                newValue.push(item.id);
                                                                            }
                                                                        } else {
                                                                            newValue = newValue.filter((value) => value !== item.id);
                                                                        }
                                                                        
                                                                        field.onChange(newValue);
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <div className="space-y-1 leading-none">
                                                                <FormLabel className="font-normal cursor-pointer">
                                                                    {item.label}
                                                                </FormLabel>
                                                            </div>
                                                        </FormItem>
                                                    )
                                                }}
                                            />
                                        ))}
                                    </div>
                                    {form.formState.errors.target_audience && (
                                        <p className="text-[0.8rem] font-medium text-destructive mt-2">
                                            {form.formState.errors.target_audience.message}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2 bg-muted/20 border-t py-4">
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={isPending}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                    Create Announcement
                                </Button>
                            </CardFooter>
                        </form>
                    </Form>
                </Card>
            )}
        </div>
    );
}
