import { describe, it, expect } from 'vitest';
import * as dotenv from 'dotenv';
import { validateDeckListAction } from '@/actions/deck/validation';

// Ensure local env vars are loaded so Supabase client works
dotenv.config({ path: '.env.local' });

// Mock Next.js cookies so createClient() doesn't throw in Vitest
import { vi } from 'vitest';
vi.mock('next/headers', () => ({
    cookies: () => ({
        get: () => null,
        set: () => null,
        getAll: () => [],
    }),
}));

// Skip integration tests in CI where no real Supabase credentials are available
const hasRealDb = process.env.NEXT_PUBLIC_SUPABASE_URL
    && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

const itDb = hasRealDb ? it : it.skip;

describe('Validation Integration Tests', () => {
    itDb("rejects Professor's Research for post-rotation 2026 format (H-on)", async () => {
        const deck = `Trainer: 4\n4 Professor's Research`;

        const ROTATION_DATE_2026 = new Date("2026-04-10");
        const targetEventDate = new Date();
        
        const result = await validateDeckListAction(deck);

        // Post-rotation: Professor's Research (reg mark G) should be flagged as illegal
        if (targetEventDate >= ROTATION_DATE_2026) {
            expect(result.errors.some(e => e.includes("Not Standard Legal: Professor's Research"))).toBe(true);
        } else {
            console.warn("Date is pre-rotation, test asserts it's legal in G block.");
            expect(result.errors.some(e => e.includes("Not Standard Legal: Professor's Research"))).toBe(false);
        }
    }, 15000);
});
