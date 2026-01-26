"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function OnboardingGuard({ needsOnboarding }: { needsOnboarding: boolean }) {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (needsOnboarding) {
            // If missing profile, force to /onboarding
            if (pathname !== "/onboarding" && pathname !== "/auth/signout") { // Allow signout
                router.replace("/onboarding");
            }
        } else {
            // If profile complete, prevent access to /onboarding (optional, better UX)
            if (pathname === "/onboarding") {
                router.replace("/");
            }
        }
    }, [pathname, needsOnboarding, router]);

    return null;
}
