"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Bell, CreditCard, ListOrdered } from "lucide-react";

export interface StepAdvancedData {
    // Queue
    enableQueue: boolean;
    queueBatchSize: string;
    queuePromotionWindow: string;
    // Payment
    paymentRequired: boolean;
    paymentProvider: "stripe" | "generic";
    paymentUrlJuniors: string;
    paymentUrlSeniors: string;
    paymentUrlMasters: string;
    // Notification webhooks
    notificationWebhookUrl: string;
}

interface StepAdvancedProps {
    data: StepAdvancedData;
    onChange: (data: StepAdvancedData) => void;
    onNext: () => void;
    onBack: () => void;
}

export function StepAdvanced({ data, onChange, onNext, onBack }: StepAdvancedProps) {
    const update = <K extends keyof StepAdvancedData>(field: K, value: StepAdvancedData[K]) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>
                    Queue, payment, and notification configuration. These can also be changed later in tournament settings.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Registration Queue */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <ListOrdered className="h-4 w-4" />
                        Registration Queue
                    </h3>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="adv_queue"
                            checked={data.enableQueue}
                            onCheckedChange={(v) => update("enableQueue", v)}
                        />
                        <Label htmlFor="adv_queue">Enable Registration Queue</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Recommended for high-demand events. Players join a queue and are promoted in batches.
                    </p>

                    {data.enableQueue && (
                        <div className="space-y-4 pl-6 border-l-2 ml-2 border-primary/20">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="adv_batch">Queue Batch Size</Label>
                                    <Input
                                        id="adv_batch"
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={data.queueBatchSize}
                                        onChange={(e) => update("queueBatchSize", e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Players promoted per minute. Try 10–20.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adv_window">Checkout Window (Minutes)</Label>
                                    <Input
                                        id="adv_window"
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={data.queuePromotionWindow}
                                        onChange={(e) => update("queuePromotionWindow", e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Time to pay before losing their spot.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Payment Settings */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Payment
                    </h3>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="adv_payment"
                            checked={data.paymentRequired}
                            onCheckedChange={(v) => update("paymentRequired", v)}
                        />
                        <Label htmlFor="adv_payment">Require Payment for Registration</Label>
                    </div>

                    {data.paymentRequired && (
                        <div className="space-y-4 pl-6 border-l-2 ml-2 border-primary/20">
                            <div className="space-y-2">
                                <Label htmlFor="adv_provider">Payment Provider</Label>
                                <Select
                                    value={data.paymentProvider}
                                    onValueChange={(v: "stripe" | "generic") => update("paymentProvider", v)}
                                >
                                    <SelectTrigger id="adv_provider">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="stripe">Stripe (Payment Links)</SelectItem>
                                        <SelectItem value="generic">Generic / Custom</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label>Division Payment URLs</Label>
                                <p className="text-xs text-muted-foreground">
                                    Provide the Payment Link for each division. Leave blank if a division is free.
                                </p>
                                <div className="space-y-2">
                                    <Label htmlFor="adv_pay_ma" className="text-xs">Masters</Label>
                                    <Input
                                        id="adv_pay_ma"
                                        type="url"
                                        placeholder="https://buy.stripe.com/..."
                                        value={data.paymentUrlMasters}
                                        onChange={(e) => update("paymentUrlMasters", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adv_pay_sr" className="text-xs">Seniors</Label>
                                    <Input
                                        id="adv_pay_sr"
                                        type="url"
                                        placeholder="https://buy.stripe.com/..."
                                        value={data.paymentUrlSeniors}
                                        onChange={(e) => update("paymentUrlSeniors", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adv_pay_jr" className="text-xs">Juniors</Label>
                                    <Input
                                        id="adv_pay_jr"
                                        type="url"
                                        placeholder="https://buy.stripe.com/..."
                                        value={data.paymentUrlJuniors}
                                        onChange={(e) => update("paymentUrlJuniors", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Notification Webhooks */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notification Webhooks
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        Receive JSON events when players register, submit decks, or complete payment.
                        Connect to Zapier, n8n, or any webhook-compatible tool.
                    </p>

                    <div className="space-y-2">
                        <Label htmlFor="adv_webhook_url">Webhook URL</Label>
                        <Input
                            id="adv_webhook_url"
                            type="url"
                            placeholder="https://hooks.zapier.com/hooks/catch/..."
                            value={data.notificationWebhookUrl}
                            onChange={(e) => update("notificationWebhookUrl", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            We&apos;ll POST signed JSON events to this HTTPS endpoint. Secret will be generated after creation.
                        </p>
                    </div>
                </div>

                {/* Navigation */}
                <div className="pt-4 border-t flex justify-between">
                    <Button type="button" variant="outline" onClick={onBack} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <Button type="button" onClick={onNext} className="gap-2">
                        Next: Review
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
