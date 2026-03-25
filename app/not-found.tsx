"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function NotFound() {
    const router = useRouter();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (countdown <= 0) {
            router.replace("/");
            return;
        }

        const timer = setTimeout(() => {
            setCountdown((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdown, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-4">
            <div className="text-center space-y-5 max-w-md">
                <div className="relative w-72 h-48 mx-auto rounded-xl overflow-hidden shadow-lg border border-border">
                    <Image
                        src="/stay-in-your-lane.jpg"
                        alt="Judge pointing you away"
                        fill
                        className="object-cover object-top"
                        priority
                    />
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight">
                    Stay In Your Lane!
                </h1>

                <p className="text-muted-foreground text-base leading-relaxed">
                    You&apos;re in the <span className="font-semibold text-foreground">wrong page</span>.
                    There&apos;s nothing to see here — move along.
                </p>

                <p className="text-sm text-muted-foreground">
                    Sending you back in{" "}
                    <span className="font-bold text-foreground tabular-nums">{countdown}</span>
                    {countdown !== 1 ? "s" : ""}…
                </p>

                <button
                    onClick={() => router.replace("/")}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4 transition-colors"
                >
                    ← Get me out of here
                </button>
            </div>
        </div>
    );
}
