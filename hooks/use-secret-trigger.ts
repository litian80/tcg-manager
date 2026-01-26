import { useState, useEffect, useCallback } from "react";

export function useSecretTrigger(action: () => void, timeout = 1000, requiredClicks = 4) {
    const [clicks, setClicks] = useState(0);

    useEffect(() => {
        if (clicks === 0) return;

        const timer = setTimeout(() => {
            setClicks(0);
        }, timeout);

        if (clicks >= requiredClicks) {
            action();
            setClicks(0); // Reset after trigger
            clearTimeout(timer); // Clear timer to prevent double reset
        }

        return () => clearTimeout(timer);
    }, [clicks, action, timeout, requiredClicks]);

    const trigger = useCallback(() => {
        setClicks((prev) => prev + 1);
    }, []);

    const reset = useCallback(() => {
        setClicks(0);
    }, []);

    return { trigger, reset, clicks };
}
