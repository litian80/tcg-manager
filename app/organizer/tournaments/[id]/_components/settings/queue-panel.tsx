"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface QueuePanelProps {
    enableQueue: boolean;
    setEnableQueue: (v: boolean) => void;
    queueBatchSize: string;
    setQueueBatchSize: (v: string) => void;
    queuePromotionWindow: string;
    setQueuePromotionWindow: (v: string) => void;
    queuePaused: boolean;
    setQueuePaused: (v: boolean) => void;
}

export function QueuePanel({
    enableQueue, setEnableQueue,
    queueBatchSize, setQueueBatchSize,
    queuePromotionWindow, setQueuePromotionWindow,
    queuePaused, setQueuePaused,
}: QueuePanelProps) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-medium">Registration Queue Settings</h3>

            <div className="flex items-center space-x-2">
                <Checkbox
                    id="enable_queue"
                    checked={enableQueue}
                    onCheckedChange={(checked) => setEnableQueue(checked === true)}
                />
                <Label htmlFor="enable_queue">Enable Registration Queue (Recommended for high-demand events)</Label>
            </div>

            {enableQueue && (
                <div className="space-y-4 pl-6 border-l-2 ml-2 border-primary/20">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="queue_batch_size">Queue Batch Size</Label>
                            <Input
                                id="queue_batch_size"
                                type="number"
                                min="1"
                                max="100"
                                value={queueBatchSize}
                                onChange={(e) => setQueueBatchSize(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                How many players to promote to pending payment per minute. Try 10-20.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="queue_promotion_window">Checkout Window (Minutes)</Label>
                            <Input
                                id="queue_promotion_window"
                                type="number"
                                min="1"
                                max="60"
                                value={queuePromotionWindow}
                                onChange={(e) => setQueuePromotionWindow(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                How long a promoted player has to pay before they lose their spot.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 bg-destructive/10 p-3 rounded-md border border-destructive/20">
                        <Checkbox
                            id="queue_paused"
                            checked={queuePaused}
                            onCheckedChange={(checked) => setQueuePaused(checked === true)}
                        />
                        <Label htmlFor="queue_paused" className="text-destructive font-semibold">Pause Queue Promotion (Emergency Stop)</Label>
                    </div>
                </div>
            )}
        </div>
    );
}
