"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface PaymentPanelProps {
    paymentRequired: boolean;
    setPaymentRequired: (v: boolean) => void;
    paymentProvider: "stripe" | "generic";
    setPaymentProvider: (v: "stripe" | "generic") => void;
    paymentUrlJuniors: string;
    setPaymentUrlJuniors: (v: string) => void;
    paymentUrlSeniors: string;
    setPaymentUrlSeniors: (v: string) => void;
    paymentUrlMasters: string;
    setPaymentUrlMasters: (v: string) => void;
    paymentWebhookSecret: string;
    setPaymentWebhookSecret: (v: string) => void;
}

export function PaymentPanel({
    paymentRequired, setPaymentRequired,
    paymentProvider, setPaymentProvider,
    paymentUrlJuniors, setPaymentUrlJuniors,
    paymentUrlSeniors, setPaymentUrlSeniors,
    paymentUrlMasters, setPaymentUrlMasters,
    paymentWebhookSecret, setPaymentWebhookSecret,
}: PaymentPanelProps) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-medium">💳 Payment Settings</h3>

            <div className="flex items-center space-x-2">
                <Checkbox
                    id="payment_required"
                    checked={paymentRequired}
                    onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        setPaymentRequired(isChecked);
                        if (isChecked && !paymentWebhookSecret) {
                            const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                                .map(b => b.toString(16).padStart(2, '0')).join('');
                            setPaymentWebhookSecret(secret);
                        }
                    }}
                />
                <Label htmlFor="payment_required">Require Payment for Registration</Label>
            </div>

            {paymentRequired && (
                <div className="space-y-4 pl-6">
                    <div className="space-y-2">
                        <Label htmlFor="payment_provider">Payment Provider</Label>
                        <Select value={paymentProvider} onValueChange={(v: 'stripe' | 'generic') => setPaymentProvider(v)}>
                            <SelectTrigger id="payment_provider">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="stripe">Stripe (Payment Links)</SelectItem>
                                <SelectItem value="generic">Generic / Custom</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {paymentProvider === 'stripe'
                                ? 'Uses Stripe Payment Links with automated webhook verification.'
                                : 'Use any payment system that can send HMAC-signed webhook callbacks.'}
                        </p>
                    </div>

                    {/* Division Payment URLs */}
                    <div className="space-y-4">
                        <Label>Division Payment URLs</Label>
                        <p className="text-xs text-muted-foreground">
                            Provide the exact Payment Link (or custom payment gateway URL) for each division. Leave blank if a division is free.
                        </p>

                        <div className="space-y-2">
                            <Label htmlFor="payment_url_masters" className="text-xs">Masters Payment URL</Label>
                            <Input
                                id="payment_url_masters"
                                type="url"
                                placeholder={paymentProvider === 'stripe' ? 'https://buy.stripe.com/your-masters-link' : 'https://your-payment-system.com/pay-masters'}
                                value={paymentUrlMasters}
                                onChange={(e) => setPaymentUrlMasters(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="payment_url_seniors" className="text-xs">Seniors Payment URL</Label>
                            <Input
                                id="payment_url_seniors"
                                type="url"
                                placeholder={paymentProvider === 'stripe' ? 'https://buy.stripe.com/your-seniors-link' : 'https://your-payment-system.com/pay-seniors'}
                                value={paymentUrlSeniors}
                                onChange={(e) => setPaymentUrlSeniors(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="payment_url_juniors" className="text-xs">Juniors Payment URL</Label>
                            <Input
                                id="payment_url_juniors"
                                type="url"
                                placeholder={paymentProvider === 'stripe' ? 'https://buy.stripe.com/your-juniors-link' : 'https://your-payment-system.com/pay-juniors'}
                                value={paymentUrlJuniors}
                                onChange={(e) => setPaymentUrlJuniors(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Players will be redirected to the URL corresponding to their division. We&apos;ll append player details as query parameters automatically.
                        </p>
                    </div>

                    {/* Webhook Secret */}
                    <div className="space-y-2">
                        <Label htmlFor="payment_webhook_secret">
                            {paymentProvider === 'stripe' ? 'Stripe Webhook Signing Secret' : 'Webhook Secret'}
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="payment_webhook_secret"
                                type="text"
                                value={paymentWebhookSecret}
                                onChange={(e) => setPaymentWebhookSecret(e.target.value)}
                                placeholder={paymentProvider === 'stripe' ? 'whsec_... (paste from Stripe Dashboard)' : 'Your HMAC secret'}
                                className="font-mono text-xs"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                title="Copy to clipboard"
                                onClick={() => {
                                    navigator.clipboard.writeText(paymentWebhookSecret);
                                    toast.success("Secret copied to clipboard");
                                }}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                            {paymentProvider === 'generic' && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    title="Generate secret"
                                    onClick={() => {
                                        const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                                            .map(b => b.toString(16).padStart(2, '0')).join('');
                                        setPaymentWebhookSecret(secret);
                                        toast.info("New secret generated. Remember to save and update your payment system.");
                                    }}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {paymentProvider === 'stripe'
                                ? 'Find this in Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret.'
                                : 'Use this secret in your payment system to sign webhook callbacks.'}
                        </p>
                    </div>

                    {/* Webhook Endpoint */}
                    <div className="space-y-2">
                        <Label>Webhook Endpoint</Label>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/${paymentProvider === 'stripe' ? 'stripe' : 'payment'}`}
                                readOnly
                                className="font-mono text-xs bg-muted"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                title="Copy endpoint"
                                onClick={() => {
                                    const endpoint = paymentProvider === 'stripe' ? 'stripe' : 'payment';
                                    navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/${endpoint}`);
                                    toast.success("Endpoint copied to clipboard");
                                }}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {paymentProvider === 'stripe'
                                ? 'Add this URL as your Stripe webhook endpoint in Dashboard → Developers → Webhooks.'
                                : 'Configure your payment system to POST results to this URL.'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
