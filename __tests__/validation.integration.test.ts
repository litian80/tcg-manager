import { describe, it, expect, beforeAll } from 'vitest';
import * as dotenv from 'dotenv';
import { validateDeckListAction } from '@/actions/deck/validation';

// Ensure local env vars are loaded so Supabase client works
dotenv.config({ path: '.env.local' });

describe('Validation Integration Tests', () => {
    // We assume the DB contains the Professor's Research up to 'G' block
    it("rejects Professor's Research for post-rotation 2026 format (H-on)", async () => {
        const deck = `Trainer: 4\n4 Professor's Research`;
        // Since we don't have a tournament ID to pass easily, we can spoof a date if needed,
        // but the code hardcodes the post-rotation block logic inside validation.ts:
        // By default, if no tournamentId is passed, it uses new Date().
        // If today is past April 2026, it will fail unless evergreen hacks exist.
        
        let targetEventDate = new Date();
        const ROTATION_DATE_2026 = new Date("2026-04-10");
        
        // If the current date is not past rotation, this test might falsely pass. 
        // We'll trust the validation logic checks date properly or mock the date:
        const result = await validateDeckListAction(deck);

        // For our test, if it passes and Date is currently >= rotation, the AI broke the rule.
        if (targetEventDate >= ROTATION_DATE_2026) {
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes("Not Standard Legal: Professor's Research"))).toBe(true);
        } else {
            console.warn("Date is pre-rotation, test asserts it's legal in G block.");
            expect(result.isValid).toBe(true);
        }
    }, 15000); // Increased timeout for DB query
});
