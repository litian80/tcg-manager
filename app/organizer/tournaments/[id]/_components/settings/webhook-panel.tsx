"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, RefreshCw, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { testNotificationWebhook } from "@/actions/webhook-actions";

interface WebhookPanelProps {
    tournamentId: string;
    notificationWebhookUrl: string;
    setNotificationWebhookUrl: (v: string) => void;
    notificationWebhookSecret: string;
    setNotificationWebhookSecret: (v: string) => void;
    isTestingWebhook: boolean;
    setIsTestingWebhook: (v: boolean) => void;
}

export function WebhookPanel({
    tournamentId,
    notificationWebhookUrl, setNotificationWebhookUrl,
    notificationWebhookSecret, setNotificationWebhookSecret,
    isTestingWebhook, setIsTestingWebhook,
}: WebhookPanelProps) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium flex items-center gap-2">
                    Notification Webhooks
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Receive JSON events when players register, submit decks, or complete payment.
                    Connect to Mailchimp, Zapier, n8n, or any webhook-compatible tool.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="notification_webhook_url">Webhook URL</Label>
                <Input
                    id="notification_webhook_url"
                    type="url"
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    value={notificationWebhookUrl}
                    onChange={(e) => {
                        setNotificationWebhookUrl(e.target.value);
                        if (e.target.value && !notificationWebhookSecret) {
                            const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                                .map(b => b.toString(16).padStart(2, '0')).join('');
                            setNotificationWebhookSecret(secret);
                        }
                    }}
                />
                <p className="text-xs text-muted-foreground">
                    We&apos;ll POST signed JSON events to this HTTPS endpoint.
                </p>
            </div>

            {notificationWebhookUrl && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="notification_webhook_secret">Webhook Secret</Label>
                        <div className="flex gap-2">
                            <Input
                                id="notification_webhook_secret"
                                type="text"
                                value={notificationWebhookSecret}
                                readOnly
                                className="font-mono text-xs bg-muted"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                title="Copy to clipboard"
                                onClick={() => {
                                    navigator.clipboard.writeText(notificationWebhookSecret);
                                    toast.success("Secret copied to clipboard");
                                }}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                title="Regenerate secret"
                                onClick={() => {
                                    const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                                        .map(b => b.toString(16).padStart(2, '0')).join('');
                                    setNotificationWebhookSecret(secret);
                                    toast.info("New secret generated. Remember to save and update your endpoint.");
                                }}
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Use this secret to verify the X-Webhook-Signature header on incoming events.
                            Signature = HMAC-SHA256(timestamp + &quot;.&quot; + body).
                        </p>
                    </div>

                    <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                        <p className="font-medium mb-1">Events fired:</p>
                        <ul className="list-disc pl-5 space-y-0.5 text-xs font-mono">
                            <li>registration.confirmed / .waitlisted / .withdrawn</li>
                            <li>payment.pending / .confirmed</li>
                            <li>deck.submitted / .reminder</li>
                        </ul>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isTestingWebhook || !notificationWebhookSecret}
                        onClick={async () => {
                            setIsTestingWebhook(true);
                            const result = await testNotificationWebhook(tournamentId);
                            if (result.success) {
                                toast.success(`Ping sent! Endpoint returned HTTP ${result.status}.`);
                            } else {
                                toast.error(result.error || "Test failed");
                            }
                            setIsTestingWebhook(false);
                        }}
                    >
                        {isTestingWebhook ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="mr-2 h-4 w-4" />
                        )}
                        Test Webhook
                    </Button>
                    <p className="text-xs text-muted-foreground -mt-2">
                        Sends a <code className="bg-muted px-1 rounded">ping</code> event to verify your endpoint. Save settings first.
                    </p>
                </>
            )}
        </div>
    );
}
